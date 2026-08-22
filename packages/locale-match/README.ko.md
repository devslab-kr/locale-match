# @devslab/locale-match

[![npm](https://img.shields.io/npm/v/%40devslab%2Flocale-match)](https://www.npmjs.com/package/@devslab/locale-match)

**[문서 & 플레이그라운드](https://devslab-kr.github.io/locale-match/)** · [English](README.md)

**간체 중국어 독자에게 번체 텍스트를 건네지 않는 로케일 협상 라이브러리.**
의존성 0. Node · Bun · Deno · Cloudflare Workers · 브라우저 어디서나 동작합니다.

```bash
npm i @devslab/locale-match
```

프레임워크 바인딩: [React](https://www.npmjs.com/package/@devslab/locale-match-react) · [Vue](https://www.npmjs.com/package/@devslab/locale-match-vue) · [Nuxt](https://www.npmjs.com/package/@devslab/locale-match-nuxt).

## 무엇이 문제인가

맨 `zh`는 정작 가장 중요한 것 — **간체인가 번체인가** — 에 침묵하는데, 양쪽 다
수억 명의 독자가 있습니다. 번체만 서비스하는 사이트가 `zh-CN` 독자에게 번체를
주면 안 됩니다. 그 사람의 다음 언어(대개 영어)로 가야 합니다.

그리고 함정이 하나 더 있습니다. `zh-CN`을 거부해도 본토 브라우저는
`zh-CN,zh;q=0.9`를 보내기 때문에, **바로 뒤의 맨 `zh`가 그 매칭을 구제**합니다.

그래서 규칙은 두 층입니다:

| 태그의 출처 | 맨 `zh`의 의미 |
|---|---|
| **선언된 단일 값** (`?lang=`, 쿠키, 설정) | *수용* |
| **순위 목록의 항목** (`Accept-Language`, `navigator.languages`) | *거부* |

## 빠른 시작

```ts
import { createLocaleResolver } from '@devslab/locale-match';

const locales = createLocaleResolver({
  supported: ['ko', 'en', 'ja', 'zh-HK', 'zh-TW', 'fr'],
  fallback: 'ko',
});

// 서버
const { locale } = locales.resolve({
  query: url.searchParams.get('lang'),
  cookieHeader: request.headers.get('cookie'),
  acceptLanguage: request.headers.get('accept-language'),
});

// 브라우저: ?lang= → localStorage → navigator.languages
const { locale } = locales.resolveInBrowser();
```

위 설정에서의 실제 동작:

| 입력 | 결과 |
|---|---|
| `zh-CN,zh;q=0.9,en;q=0.8` | `en` — 본토 독자는 다음 언어로 |
| `zh-HK,zh;q=0.9` | `zh-HK` |
| `pt-PT` | `pt-BR` (옆걸음) |
| `?lang=zh` (선언) | `zh-HK` |
| `?lang=zh-CN` (선언) | `null` |

중국어 가드는 **`supported` 목록에서 유도되어 기본으로 켜집니다.** 방문자에 대한
추측이 아니라 **당신이 직접 쓴 목록**을 읽는 것입니다. `guards: []`로 끌 수 있습니다.

다른 문자 분리 언어(세르비아어·몽골어 등)를 위한 `defineScriptGuard` 사용법,
매칭·우선순위 규칙, CDN 사용법, 전체 API는
[한국어 문서](https://github.com/devslab-kr/locale-match/blob/main/README.ko.md)에
있습니다.

## 라이선스

Apache-2.0 © devslab
