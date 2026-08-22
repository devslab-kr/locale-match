import { guardsFor, type ScriptGuard } from './guards.js';
import { matchAcceptLanguage, matchLocale, matchRankedTags } from './match.js';

/**
 * The precedence chain, and why it is in this order.
 *
 * A link's `?lang=` is the PUBLISHER's declaration — whoever sent the
 * link decided what it should open in. A stored preference is the
 * READER's own past choice. The browser's language list is the reader's
 * standing declaration about the device in their hand. All three are
 * declarations, so all three are applied, in that order of specificity.
 *
 * What is NOT in this chain: anything inferred. IP geolocation says
 * where the packet came from, not what the person reads. Suggest on it
 * if you like — but that is a banner, not a switch, and it does not
 * belong in a resolver.
 */
export type LocaleSource = 'query' | 'stored' | 'browser' | 'fallback';

export interface LocaleResolution<L extends string> {
  locale: L;
  source: LocaleSource;
  /** True when the reader has not chosen — safe to persist the result. */
  shouldPersist: boolean;
}

export interface ResolverConfig<L extends string> {
  /** Locales you publish. Order matters: first wins a sideways match. */
  supported: readonly L[];
  /** Used when nothing matches. */
  fallback: L;
  /**
   * Script guards. `'auto'` (the default) derives them from `supported`
   * — see `guardsFor`. Pass `[]` to turn guarding off entirely.
   */
  guards?: readonly ScriptGuard[] | 'auto';
  /** Cookie name read on the server and written by `persistCookie`. */
  cookieName?: string;
  /** `localStorage` key read and written in the browser. */
  storageKey?: string;
}

export interface ResolveInput {
  /** Value of `?lang=` (or your equivalent), already extracted. */
  query?: string | null;
  /** A raw `Cookie:` header — parsed for `cookieName`. */
  cookieHeader?: string | null;
  /** A raw `Accept-Language:` header. */
  acceptLanguage?: string | null;
  /** Preference list, best first — e.g. `navigator.languages`. */
  browserLanguages?: readonly string[] | null;
  /** A stored value you read yourself (localStorage, DB, session). */
  stored?: string | null;
}

export interface LocaleResolver<L extends string> {
  readonly supported: readonly L[];
  readonly fallback: L;
  readonly guards: readonly ScriptGuard[];
  /** Match one declared tag — a query param, a setting, a stored value. */
  fromTag(tag: string | null | undefined): L | null;
  /** Match a raw `Accept-Language` header. */
  fromAcceptLanguage(header: string | null | undefined): L | null;
  /** Match a preference list such as `navigator.languages`. */
  fromLanguages(tags: readonly string[] | null | undefined): L | null;
  /** Run the whole chain. Never throws; always returns a locale. */
  resolve(input?: ResolveInput): LocaleResolution<L>;
  /**
   * Resolve in a browser: `?lang=` → `localStorage[storageKey]` →
   * `navigator.languages`. Safe to call where `window` does not exist
   * (returns the fallback), so SSR paths can share one code path.
   */
  resolveInBrowser(): LocaleResolution<L>;
  /** Write the choice to `localStorage`. No-op outside a browser. */
  persist(locale: L): void;
  /** A `Set-Cookie` value that remembers the choice for a year. */
  persistCookie(locale: L, maxAgeSeconds?: number): string;
}

function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export function createLocaleResolver<L extends string>(
  config: ResolverConfig<L>,
): LocaleResolver<L> {
  const { supported, fallback } = config;
  const cookieName = config.cookieName ?? 'locale';
  const storageKey = config.storageKey ?? 'locale';
  const guards =
    config.guards === undefined || config.guards === 'auto'
      ? guardsFor(supported)
      : config.guards;

  const fromTag = (tag: string | null | undefined): L | null =>
    matchLocale(tag, supported, { guards, source: 'declared' });

  const fromAcceptLanguage = (header: string | null | undefined): L | null =>
    matchAcceptLanguage(header, supported, { guards });

  const fromLanguages = (tags: readonly string[] | null | undefined): L | null =>
    tags && tags.length ? matchRankedTags(tags, supported, { guards }) : null;

  const resolve = (input: ResolveInput = {}): LocaleResolution<L> => {
    const fromQuery = fromTag(input.query);
    if (fromQuery) return { locale: fromQuery, source: 'query', shouldPersist: true };

    const storedTag = input.stored ?? readCookie(input.cookieHeader, cookieName);
    const stored = fromTag(storedTag);
    if (stored) return { locale: stored, source: 'stored', shouldPersist: false };

    const browser =
      fromAcceptLanguage(input.acceptLanguage) ?? fromLanguages(input.browserLanguages);
    if (browser) return { locale: browser, source: 'browser', shouldPersist: false };

    return { locale: fallback, source: 'fallback', shouldPersist: false };
  };

  return {
    supported,
    fallback,
    guards,
    fromTag,
    fromAcceptLanguage,
    fromLanguages,
    resolve,
    resolveInBrowser() {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return { locale: fallback, source: 'fallback', shouldPersist: false };
      }
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(storageKey);
      } catch {
        // Private mode and blocked storage both throw. A reader who
        // cannot be remembered still gets a correct first answer.
      }
      const query = new URLSearchParams(window.location.search).get('lang');
      const languages = navigator.languages?.length
        ? navigator.languages
        : navigator.language
          ? [navigator.language]
          : [];
      return resolve({ query, stored, browserLanguages: languages });
    },
    persist(locale: L) {
      if (typeof window === 'undefined') return;
      try {
        window.localStorage.setItem(storageKey, locale);
      } catch {
        // Same as above: persistence is a convenience, never a
        // precondition for rendering the right language.
      }
    },
    persistCookie(locale: L, maxAgeSeconds = 31_536_000) {
      return `${cookieName}=${locale}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
    },
  };
}
