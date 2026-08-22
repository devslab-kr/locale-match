import {
  createLocaleResolver,
  type LocaleResolution,
  type LocaleResolver,
  type ResolveInput,
  type ResolverConfig,
} from '@devslab/locale-match';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * React binding for @devslab/locale-match.
 *
 * The one thing this file exists to get right is WHEN detection runs.
 *
 * Server-rendered HTML — including a Next.js static export — is written
 * before any browser is involved, so it carries whatever locale the
 * server knew. If the client then picked a different locale during its
 * first render, React would find markup that does not match what it was
 * about to draw: a hydration mismatch, which React resolves by throwing
 * the server's HTML away.
 *
 * So the first client render deliberately AGREES with the server, and
 * detection happens in an effect straight after mount. On a static
 * export that costs one frame of the fallback language before the swap.
 * The way to avoid that frame is not a cleverer hook — it is resolving
 * on the server and passing the answer in as `initial`.
 */

export interface LocaleState<L extends string> {
  locale: L;
  source: LocaleResolution<L>['source'];
  supported: readonly L[];
  /** Set and persist an explicit choice. Ignores unsupported values. */
  setLocale: (next: string) => void;
  /** True while the locale is only a fallback — nobody has chosen. */
  isFallback: boolean;
  resolver: LocaleResolver<L>;
}

const LocaleContext = createContext<LocaleState<string> | null>(null);

export interface LocaleProviderProps<L extends string> extends ResolverConfig<L> {
  children?: ReactNode;
  /**
   * Locale already resolved on the server. When set, the client trusts
   * it and skips browser detection entirely — which is what removes the
   * one-frame flash on a server-rendered page.
   */
  initial?: L | null;
  /** Extra inputs for detection, when `initial` is not given. */
  input?: ResolveInput;
}

export function LocaleProvider<L extends string>({
  children,
  initial,
  input,
  ...config
}: LocaleProviderProps<L>) {
  const { supported, fallback } = config;
  const guards = config.guards;
  const cookieName = config.cookieName;
  const storageKey = config.storageKey;

  const resolver = useMemo(
    () => createLocaleResolver<L>({ supported, fallback, guards, cookieName, storageKey }),
    [supported, fallback, guards, cookieName, storageKey],
  );

  // First render agrees with the server. See the note at the top.
  const [resolution, setResolution] = useState<
    Pick<LocaleResolution<L>, 'locale' | 'source'>
  >(() =>
    initial
      ? { locale: initial, source: 'stored' }
      : { locale: fallback, source: 'fallback' },
  );

  useEffect(() => {
    if (initial) return;
    const next = input ? resolver.resolve(input) : resolver.resolveInBrowser();
    setResolution({ locale: next.locale, source: next.source });
    // `input` is intentionally not a dependency: detection is a
    // once-per-mount decision, and re-running it would fight a reader
    // who has since chosen a language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolver, initial]);

  const setLocale = useCallback(
    (next: string) => {
      const matched = resolver.fromTag(next);
      if (!matched) return;
      setResolution({ locale: matched, source: 'stored' });
      resolver.persist(matched);
    },
    [resolver],
  );

  const value = useMemo<LocaleState<L>>(
    () => ({
      locale: resolution.locale,
      source: resolution.source,
      supported,
      setLocale,
      isFallback: resolution.source === 'fallback',
      resolver,
    }),
    [resolution, supported, setLocale, resolver],
  );

  return createElement(
    LocaleContext.Provider,
    { value: value as LocaleState<string> },
    children,
  );
}

export function useLocale<L extends string = string>(): LocaleState<L> {
  const state = useContext(LocaleContext);
  if (!state) {
    throw new Error('[locale-match] useLocale() called outside <LocaleProvider>');
  }
  return state as LocaleState<L>;
}

export type { LocaleResolution, LocaleResolver, ResolverConfig } from '@devslab/locale-match';
