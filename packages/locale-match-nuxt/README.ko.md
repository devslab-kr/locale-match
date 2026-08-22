# @devslab/locale-match-nuxt

[![npm](https://img.shields.io/npm/v/%40devslab%2Flocale-match-nuxt)](https://www.npmjs.com/package/@devslab/locale-match-nuxt)

**[문서 & 플레이그라운드](https://devslab-kr.github.io/locale-match/)** · [English](README.md)

[`@devslab/locale-match`](https://www.npmjs.com/package/@devslab/locale-match)의
Nuxt 모듈 — 간체 중국어 독자에게 번체 텍스트를 건네지 않는 로케일 협상.

**Nuxt 3.8 이상**이 필요합니다.

```bash
npm i @devslab/locale-match @devslab/locale-match-vue @devslab/locale-match-nuxt
```

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
const { locale, setLocale, supported } = useLocale();   // 자동 임포트
</script>
```

## 왜 컴포저블만으로는 안 되는가

서버 렌더링 앱에서 로케일은 **첫 바이트가 나가기 전에**, 요청 자체의
`Accept-Language`와 쿠키로 결정돼야 합니다. 클라이언트에서 결정하면 독자는
페이지가 그려진 뒤 언어가 바뀌는 것을 보게 됩니다.

이 모듈은 SSR 시점에 확정하고 그 답을 페이로드에 실어 보내며, 클라이언트는 다시
감지하지 않고 그대로 따릅니다 — 그래서 깜빡임도, 하이드레이션 불일치도 없습니다.

## 라이선스

Apache-2.0 © devslab
