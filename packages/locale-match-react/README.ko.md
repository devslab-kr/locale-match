# @devslab/locale-match-react

[![npm](https://img.shields.io/npm/v/%40devslab%2Flocale-match-react)](https://www.npmjs.com/package/@devslab/locale-match-react)

**[문서](https://github.com/devslab-kr/locale-match/blob/main/README.ko.md)** · [English](README.md)

[`@devslab/locale-match`](https://www.npmjs.com/package/@devslab/locale-match)의
React 바인딩 — 간체 중국어 독자에게 번체 텍스트를 건네지 않는 로케일 협상.

```bash
npm i @devslab/locale-match @devslab/locale-match-react
```

```tsx
import { LocaleProvider, useLocale } from '@devslab/locale-match-react';

<LocaleProvider
  supported={['ko', 'en', 'ja', 'zh-HK', 'zh-TW']}
  fallback="ko"
  initial={serverLocale}
>
  <Page />
</LocaleProvider>

// 아무 컴포넌트에서나
const { locale, setLocale, supported, isFallback } = useLocale();
```

## 하이드레이션

감지는 렌더 중이 아니라 **마운트 직후 이펙트에서** 실행됩니다.

서버가 그린 HTML(Next.js 정적 내보내기 포함)은 서버가 알던 로케일을 담고
있습니다. 클라이언트가 첫 렌더에서 다른 판단을 하면 하이드레이션 불일치가 되고,
React는 서버 마크업을 버립니다.

올바르게 하는 대가는 전환 전 **폴백 언어 한 프레임**입니다. 그 한 프레임을 없애는
방법은 더 영리한 훅이 아니라, **서버에서 확정해 `initial`로 넘기는 것**입니다.

`setLocale`은 지원하지 않는 값을 무시합니다 — 스크립트 가드가 거부하는 태그도
포함이라, 실수로 넘긴 `zh-CN`이 번체 전용 사이트를 뒤집을 수 없습니다.

## 라이선스

Apache-2.0 © devslab
