# @devslab/locale-match-nuxt

[![npm](https://img.shields.io/npm/v/%40devslab%2Flocale-match-nuxt)](https://www.npmjs.com/package/@devslab/locale-match-nuxt)

**[Docs](https://github.com/devslab-kr/locale-match)** · [한국어](README.ko.md)

Nuxt module for [`@devslab/locale-match`](https://www.npmjs.com/package/@devslab/locale-match) — locale negotiation that will not hand a Simplified Chinese reader your Traditional text.

Requires **Nuxt 3.8 or newer**.

```bash
npm i @devslab/locale-match @devslab/locale-match-vue @devslab/locale-match-nuxt
```

## Usage

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@devslab/locale-match-nuxt'],
  localeMatch: {
    supported: ['ko', 'en', 'ja', 'zh-HK', 'zh-TW'],
    fallback: 'ko',
    // cookieName: 'locale', storageKey: 'locale', queryParam: 'lang'
  },
});
```

```vue
<script setup lang="ts">
const { locale, setLocale, supported } = useLocale();   // auto-imported
</script>
```

## Why a module and not just the composable

On a server-rendered app the locale has to be decided **before the first byte**,
from the request's own `Accept-Language` and cookie. Decide it on the client
instead and the reader watches the page change language after it paints.

This module resolves during SSR, serializes the answer into the payload, and the
client simply agrees rather than re-detecting — so there is no flash and no
hydration mismatch.

## License

Apache-2.0 © devslab
