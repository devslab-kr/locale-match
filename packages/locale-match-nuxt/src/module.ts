import { addImports, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit';
import type { NuxtModule } from '@nuxt/schema';
import type { ResolverConfig } from '@devslab/locale-match';

/**
 * Nuxt module for @devslab/locale-match.
 *
 * Why a module and not "just call the composable": on a server-rendered
 * app the locale has to be decided BEFORE the first byte, from the
 * request's own `Accept-Language` and cookie. Decide it on the client
 * instead and the reader watches the page change language after it
 * paints. This module resolves during SSR, serializes the answer into
 * the payload, and the client simply agrees — so there is no flash and
 * no hydration mismatch.
 */
export interface ModuleOptions extends ResolverConfig<string> {
  /** Query parameter carrying an explicit choice. Default `'lang'`. */
  queryParam?: string;
}

// Annotated explicitly: in a pnpm workspace the inferred type cannot be
// named without pointing at a hoisted path (TS2742).
const localeMatchModule: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@devslab/locale-match-nuxt',
    configKey: 'localeMatch',
    compatibility: { nuxt: '>=3.8.0' }, // import.meta.server landed in 3.8
  },
  defaults: {
    supported: ['en'],
    fallback: 'en',
    cookieName: 'locale',
    storageKey: 'locale',
    queryParam: 'lang',
  },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url);

    // Guards are derived at runtime from `supported`, so only plain
    // data crosses into runtime config — functions would not survive
    // serialization into the payload.
    nuxt.options.runtimeConfig.public.localeMatch = {
      supported: options.supported,
      fallback: options.fallback,
      cookieName: options.cookieName,
      storageKey: options.storageKey,
      queryParam: options.queryParam,
    };

    addPlugin(resolve('./runtime/plugin'));
    addImports([
      { name: 'useLocale', from: resolve('./runtime/composables') },
    ]);
  },
});

export default localeMatchModule;
