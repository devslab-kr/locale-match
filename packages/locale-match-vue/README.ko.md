# @devslab/locale-match-vue

[![npm](https://img.shields.io/npm/v/%40devslab%2Flocale-match-vue)](https://www.npmjs.com/package/@devslab/locale-match-vue)

**[문서](https://github.com/devslab-kr/locale-match/blob/main/README.ko.md)** · [English](README.md)

[`@devslab/locale-match`](https://www.npmjs.com/package/@devslab/locale-match)의
Vue 3 바인딩 — 간체 중국어 독자에게 번체 텍스트를 건네지 않는 로케일 협상.

```bash
npm i @devslab/locale-match @devslab/locale-match-vue
```

```ts
// main.ts
import { createLocalePlugin } from '@devslab/locale-match-vue';

const locales = createLocalePlugin({
  supported: ['ko', 'en', 'ja', 'zh-HK', 'zh-TW'],
  fallback: 'ko',
  // initial: serverResolvedLocale,   // 서버 렌더링을 한다면 여기에
});
app.use(locales);
```

```vue
<script setup lang="ts">
import { useLocale } from '@devslab/locale-match-vue';
const { locale, setLocale, supported, isFallback } = useLocale();
</script>
```

`locale`·`source`는 ref, `isFallback`은 computed입니다. `setLocale`은 지원하지
않는 값을 무시합니다 — 스크립트 가드가 거부하는 태그도 포함입니다.

로케일은 **가장 잘 아는 쪽이 한 번만** 확정합니다. 서버에서는 요청이, SPA에서는
브라우저가 그 주체입니다. 서버에서 확정한 값이 있으면 `initial`로 넘기세요 —
플러그인이 아예 감지를 하지 않으므로, 서버 렌더링 앱이 **그리는 도중 언어가
바뀌는 일 없이** 하이드레이션됩니다.

Nuxt를 쓰신다면 [`@devslab/locale-match-nuxt`](https://www.npmjs.com/package/@devslab/locale-match-nuxt)가
SSR 쪽 배관을 대신 해 줍니다.

## 라이선스

Apache-2.0 © devslab
