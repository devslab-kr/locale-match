import {
  createLocaleResolver,
  type LocaleResolution,
  type LocaleResolver,
  type ResolveInput,
  type ResolverConfig,
} from '@devslab/locale-match';
import {
  computed,
  inject,
  ref,
  type App,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from 'vue';

/**
 * Vue 3 binding for @devslab/locale-match.
 *
 * The design point: the locale is resolved ONCE, by whoever knows best,
 * and handed in. On the server that is the request (`Accept-Language`,
 * cookie); in a SPA it is the browser. The plugin does not guess — it
 * takes `initial` when you have it and only falls back to reading the
 * browser when you do not. That is what lets a server-rendered app
 * hydrate without the locale changing under the reader mid-paint.
 */

export interface LocaleState<L extends string> {
  /** Current locale. Reactive — bind it to your message lookup. */
  locale: Ref<L>;
  /** How the current locale was arrived at. */
  source: Ref<LocaleResolution<L>['source']>;
  supported: readonly L[];
  /** Set and persist an explicit choice. Ignores unsupported values. */
  setLocale: (next: string) => void;
  /** True while the locale is only a fallback — nobody has chosen. */
  isFallback: ComputedRef<boolean>;
  resolver: LocaleResolver<L>;
}

const LOCALE_KEY = Symbol('devslab-locale-match') as InjectionKey<LocaleState<never>>;

export interface LocalePluginOptions<L extends string> extends ResolverConfig<L> {
  /**
   * Locale already resolved elsewhere — a server render, a Nuxt payload,
   * a route param. Skips browser detection entirely when set, which is
   * how you avoid a hydration mismatch.
   */
  initial?: L | null;
  /** Extra inputs for the first resolve, when `initial` is not given. */
  input?: ResolveInput;
}

export function createLocalePlugin<L extends string>(options: LocalePluginOptions<L>) {
  const resolver = createLocaleResolver(options);

  const first: LocaleResolution<L> = options.initial
    ? { locale: options.initial, source: 'stored', shouldPersist: false }
    : options.input
      ? resolver.resolve(options.input)
      : resolver.resolveInBrowser();

  const locale = ref(first.locale) as Ref<L>;
  const source = ref(first.source) as Ref<LocaleResolution<L>['source']>;

  const state: LocaleState<L> = {
    locale,
    source,
    supported: options.supported,
    isFallback: computed(() => source.value === 'fallback'),
    resolver,
    setLocale(next: string) {
      const matched = resolver.fromTag(next);
      if (!matched) return;
      locale.value = matched;
      source.value = 'stored';
      resolver.persist(matched);
    },
  };

  return {
    state,
    install(app: App) {
      app.provide(LOCALE_KEY as InjectionKey<LocaleState<L>>, state);
    },
  };
}

export function useLocale<L extends string = string>(): LocaleState<L> {
  const state = inject(LOCALE_KEY as InjectionKey<LocaleState<L>>);
  if (!state) {
    throw new Error(
      '[locale-match] useLocale() called before app.use(createLocalePlugin(...))',
    );
  }
  return state;
}

export { LOCALE_KEY };
export type { LocaleResolution, LocaleResolver, ResolverConfig } from '@devslab/locale-match';
