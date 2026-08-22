# @devslab/locale-match-vue

[![npm](https://img.shields.io/npm/v/%40devslab%2Flocale-match-vue)](https://www.npmjs.com/package/@devslab/locale-match-vue)

**[Docs & playground](https://devslab-kr.github.io/locale-match/)** · [한국어](README.ko.md)

Vue 3 binding for [`@devslab/locale-match`](https://www.npmjs.com/package/@devslab/locale-match) — locale negotiation that will not hand a Simplified Chinese reader your Traditional text.

```bash
npm i @devslab/locale-match @devslab/locale-match-vue
```

## Usage

```ts
// main.ts
import { createLocalePlugin } from '@devslab/locale-match-vue';

const locales = createLocalePlugin({
  supported: ['ko', 'en', 'ja', 'zh-HK', 'zh-TW'],
  fallback: 'ko',
  // initial: serverResolvedLocale,   // set this when you render on a server
});
app.use(locales);
```

```vue
<script setup lang="ts">
import { useLocale } from '@devslab/locale-match-vue';
const { locale, setLocale, supported, isFallback } = useLocale();
</script>
```

`locale` and `source` are refs; `isFallback` is a computed. `setLocale` ignores
unsupported values, including a tag your script guard refuses.

The locale is resolved **once**, by whoever knows best: on a server that is the
request, in a SPA it is the browser. Pass `initial` when you have a
server-resolved answer and the plugin will not detect at all — which is what
lets a server-rendered app hydrate without the language changing mid-paint.

Using Nuxt? [`@devslab/locale-match-nuxt`](https://www.npmjs.com/package/@devslab/locale-match-nuxt)
wires the SSR half for you.

## License

Apache-2.0 © devslab
