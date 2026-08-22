import { createLocaleResolver } from '@devslab/locale-match';
import { createLocalePlugin } from '@devslab/locale-match-vue';
// #imports is Nuxt's auto-import barrel — resolved inside a Nuxt app.
import {
  defineNuxtPlugin,
  useRequestHeaders,
  useRequestURL,
  useRuntimeConfig,
  useState,
} from '#imports';

/** Only the part of the Nuxt app instance this plugin touches. */
interface NuxtAppLike {
  vueApp: { use(plugin: { install(app: unknown): void }): unknown };
}

interface PublicConfig {
  supported: string[];
  fallback: string;
  cookieName: string;
  storageKey: string;
  queryParam: string;
}

export default defineNuxtPlugin((nuxtApp: NuxtAppLike) => {
  const config = useRuntimeConfig().public.localeMatch as PublicConfig;

  // useState survives the server→client boundary: the server writes the
  // resolved locale into the payload and the client reads it back rather
  // than re-detecting. That single hand-off is the whole no-flash story.
  const state = useState<string | null>('devslab-locale', () => null);

  if (import.meta.server && !state.value) {
    const headers = useRequestHeaders(['accept-language', 'cookie']);
    const url = useRequestURL();
    const resolver = createLocaleResolver({
      supported: config.supported,
      fallback: config.fallback,
      cookieName: config.cookieName,
      storageKey: config.storageKey,
    });
    state.value = resolver.resolve({
      query: url.searchParams.get(config.queryParam),
      cookieHeader: headers.cookie ?? null,
      acceptLanguage: headers['accept-language'] ?? null,
    }).locale;
  }

  const plugin = createLocalePlugin({
    supported: config.supported,
    fallback: config.fallback,
    cookieName: config.cookieName,
    storageKey: config.storageKey,
    initial: state.value,
  });

  nuxtApp.vueApp.use(plugin);
  return { provide: { locale: plugin.state } };
});
