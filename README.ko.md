# locale-match

**간체 중국어 독자에게 번체 텍스트를 건네지 않는 로케일 협상 라이브러리.**

[![npm](https://img.shields.io/npm/v/%40devslab%2Flocale-match)](https://www.npmjs.com/package/@devslab/locale-match)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](./LICENSE)

의존성 0. Node · Bun · Deno · Cloudflare Workers · 브라우저 어디서나 동작합니다.
Vue · Nuxt 바인딩 포함. [English README](./README.md)

```bash
npm i @devslab/locale-match
```

## 무엇이 문제인가

대부분의 언어는 태그만으로 결정됩니다. `ko`는 한국어, `de`는 독일어 — 더 알아야
할 것이 없습니다.

중국어는 예외이고, 그것도 아주 큰 예외입니다. 맨 `zh`는 정작 가장 중요한 것 —
**간체인가 번체인가** — 에 대해 아무 말도 하지 않는데, 양쪽 다 수억 명의 독자가
있습니다. 대만·홍콩을 위해 번체를 서비스한다면, `zh-CN`으로 들어온 본토 독자는
번체를 받아선 **안 됩니다.** 그 사람의 다음 언어(대개 영어)로 가야 합니다.

순진한 감지는 정확히 이렇게 틀립니다:

```js
// 거의 모두가 쓰는 버그
const base = tag.split('-')[0];       // 'zh-CN' → 'zh'
if (base === 'zh') return 'zh-TW';    // ...그리고 간체 독자가 번체를 받는다
```

그리고 그 뒤에 두 번째 함정이 있습니다. 위를 `zh-CN` 거부로 고쳤다고 해봅시다.
본토 브라우저는 `zh-CN`만 보내지 않습니다. 이렇게 보냅니다:

```
Accept-Language: zh-CN,zh;q=0.9
```

방금 거부한 태그 **바로 뒤에 있는 맨 `zh`가 그것을 구제**해서, 페이지는 여전히
번체로 돌아옵니다. 2026-08-21 프로덕션에서 실제로 측정한 현상입니다.

그래서 규칙은 두 층이고, 이 라이브러리는 둘 다 구현합니다:

| 태그가 어디서 왔는가 | 맨 `zh`의 의미 |
|---|---|
| **선언된 단일 값** — `?lang=`, 쿠키, 저장된 설정 | *수용* — 중국어를 달라고 했고 우리에겐 중국어가 있다 |
| **순위 목록의 한 항목** — `Accept-Language`, `navigator.languages` | *거부* — 순위 목록에서는 모호한 항목이 정확한 항목을 구제한다 |

## 빠른 시작

```ts
import { createLocaleResolver } from '@devslab/locale-match';

const locales = createLocaleResolver({
  supported: ['ko', 'en', 'ja', 'zh-HK', 'zh-TW', 'fr'],
  fallback: 'ko',
});

// 서버 (Workers, Node, Request가 있는 어디든)
const { locale } = locales.resolve({
  query: url.searchParams.get('lang'),
  cookieHeader: request.headers.get('cookie'),
  acceptLanguage: request.headers.get('accept-language'),
});

// 브라우저: ?lang= → localStorage → navigator.languages
const { locale } = locales.resolveInBrowser();
```

중국어 가드는 **기본으로 켜집니다.** 방금 작성한 `supported` 목록에서
유도되기 때문입니다. 번체만 있으면 번체 가드가, 간체만 있으면 간체 가드가
설치되고, 양쪽 다 서비스하거나 중국어가 아예 없으면 보호할 대상이 없으므로
가드도 설치되지 않습니다.

이건 방문자에 대한 추측이 아니라, **당신이 직접 쓴 목록을 읽는 것**입니다.

```ts
// 완전히 끄기
createLocaleResolver({ supported, fallback: 'ko', guards: [] });

// 또는 명시적으로
import { chineseGuard } from '@devslab/locale-match';
createLocaleResolver({ supported, fallback: 'ko', guards: [chineseGuard('simplified')] });
```

## 다른 언어 가드 추가하기

중국어는 거의 모두가 겪는 케이스라 내장했습니다. 하지만 **메커니즘은 중국어
전용이 아닙니다** — 문자로 독자가 갈리는 언어라면 무엇이든 쓸 수 있고, 추가는
몇 줄이면 됩니다.

가드는 하나의 기본 언어에 대해, 하나의 질문에, 세 가지 값으로 답합니다:

| 판정 | 의미 | 라틴 세르비아어를 서비스할 때 |
|---|---|---|
| `supported` | 우리가 서비스하는 문자를 명시한 태그 | `sr-Latn` |
| `unsupported` | 반대쪽 문자를 명시한 태그 | `sr-Cyrl` |
| `unspecified` | 이 언어이지만 문자에 대해 침묵 | `sr` |

```ts
import { defineScriptGuard, createLocaleResolver } from '@devslab/locale-match';

const serbianLatin = defineScriptGuard({
  language: 'sr',                        // 기본 서브태그, 소문자
  supported: /^sr-(latn|latin)\b/,       // 둘 다 소문자화된 태그에 대해 테스트됨
  unsupported: /^sr-(cyrl|cyrillic)\b/,
});

const locales = createLocaleResolver({
  supported: ['en', 'sr-Latn'],
  fallback: 'en',
  // guards를 직접 나열하면 자동 중국어 가드를 대체합니다 —
  // 중국어도 서비스한다면 다시 넣어 주세요.
  guards: [serbianLatin],
});
```

직접 쓸 때 반드시 맞춰야 할 세 가지:

1. **문자 코드뿐 아니라 지역까지 덮으세요.** 사람들은 `sr-Cyrl`이 아니라
   `sr-RS`라고 씁니다. 내장 중국어 가드가 `zh-TW`·`zh-HK`·`zh-MO`를 번체로,
   `zh-CN`·`zh-SG`·`zh-MY`를 간체로 다루는 이유가 정확히 이것입니다. 출시 전에
   어느 지역이 어느 문자를 쓰는지 반드시 확인하세요.
2. **맨 태그는 `unspecified`로 두세요.** `sr`을 어느 쪽으로도 분류하지 마세요.
   두 층 규칙이 알아서 처리합니다 — 선언된 값일 땐 수용, 순위 목록 안에선 거부.
3. **패턴을 고정하세요.** `^`로 시작하고 단어 경계로 끝내서, `sr-Latn`은
   매칭되고 더 긴 무관한 태그는 걸리지 않게.

해당된다면 가드를 만들 만한 언어들: 세르비아어(Cyrl/Latn), 몽골어(Mong/Cyrl),
펀자브어(Guru/Arab), 쿠르드어(Latn/Arab), 우즈베크어(Latn/Cyrl).
**충분히 조사된 가드를 추가하는 PR을 환영합니다** — 지역 매핑과 실제 브라우저
헤더를 쓴 테스트를 함께 넣어 주세요.

## 매칭 동작

엄격한 RFC 4647 "lookup"은 잘라내기만 합니다: `pt-PT` → `pt`. 그런데 `pt-BR`은
있고 `pt`는 없으면 포르투갈어 독자는 영어까지 떨어집니다. 문자 그대로는 맞지만
실제로는 틀린 결과입니다.

그래서 이 매처는 옆걸음을 합니다 — 같은 기본 언어, 지역은 무관:

```ts
matchLocale('pt-PT', ['pt-BR', 'en']);   // 'pt-BR'
matchLocale('en-GB', ['en', 'ko']);      // 'en'
```

그 옆걸음이 이 라이브러리를 쓸모 있게 만들고, **동시에 중국어에서는 정확히
그 옆걸음이 틀립니다.** 두 기능은 한 설계의 양면입니다: **기본적으로는 옆으로
가되, 지역이 아니라 문자가 독자를 가르는 언어에서는 가지 않는다.**

시도 순서: 정확히 일치 → 점진적 잘라내기(`zh-Hant-TW` → `zh-Hant` → `zh`) →
기본 언어가 같은 로케일로 옆걸음. 옆걸음은 **당신의 `supported` 순서**를
따르므로, 동점 처리는 당신이 정합니다.

## 우선순위

`resolve()`는 하나의 사슬을 탑니다:

1. **query** — `?lang=`. **발행자**의 선언입니다. 링크를 보낸 사람이 무엇으로
   열릴지 정했습니다.
2. **stored** — 쿠키 또는 `localStorage` 값. 독자 본인의 과거 선택입니다.
3. **browser** — `Accept-Language` 또는 `navigator.languages`. 지금 손에 든
   기기에 대한 독자의 상시 선언입니다.
4. **fallback**.

이 사슬에 **일부러 넣지 않은 것**: 추론된 모든 것. IP 지역은 패킷이 어디서
왔는지를 말할 뿐 그 사람이 무엇을 읽는지는 말하지 않습니다. 그걸로 권유하는 건
좋지만, 그건 배너지 스위치가 아닙니다.

`resolve()`는 `{ locale, source, shouldPersist }`를 돌려주므로 실제 매칭과
폴백을 구분하고 쿠키를 쓸지 결정할 수 있습니다.

## Vue

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

<template>
  <select :value="locale" @change="setLocale($event.target.value)">
    <option v-for="l in supported" :key="l" :value="l">{{ l }}</option>
  </select>
</template>
```

## Nuxt

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
  },
});
```

`useLocale()`은 자동 임포트됩니다. 모듈이 **SSR 시점에** 요청 자체의
`Accept-Language`와 쿠키로 로케일을 확정하고 그 답을 페이로드에 실어 보내면,
클라이언트는 다시 감지하지 않고 그대로 따릅니다 — 그래서 **페이지가 그려진 뒤
언어가 바뀌는 깜빡임이 없고**, 하이드레이션 불일치도 생길 수 없습니다.

Nuxt 3.8 이상이 필요합니다.

## 빌드 스텝 없이

코어는 IIFE 번들도 함께 배포하므로, 순수 HTML 페이지가 CDN에서 바로 쓸 수 있습니다:

```html
<script src="https://unpkg.com/@devslab/locale-match/dist/index.global.js"></script>
<script>
  const locales = LocaleMatch.createLocaleResolver({
    supported: ['ko', 'en', 'zh-HK', 'zh-TW'],
    fallback: 'ko',
  });
  document.documentElement.lang = locales.resolveInBrowser().locale;
</script>
```

## 기존 라이브러리를 쓰면 안 되나요?

써도 됩니다. 이게 필요 없을 수도 있습니다.

- **[`@formatjs/intl-localematcher`](https://www.npmjs.com/package/@formatjs/intl-localematcher)**
  는 표준 매칭 알고리즘을 제대로 구현합니다. `lookup` 모드는 옆걸음을 하지
  않으므로 중국어 버그를 피하지만, 동시에 `pt-PT`가 `pt-BR` 대신 영어를 받게
  됩니다. `best fit` 모드는 문자를 가로질러 매칭할 수 있습니다. 어느 모드도
  **당신의 문자 정책을 대신 정해주지 않습니다.**
- **`i18next-browser-languagedetector`** 는 감지 *순서*(querystring, cookie,
  localStorage, navigator)를 제공합니다. 다만 `load: 'languageOnly'` 옵션은
  지역을 잘라내므로, 이 라이브러리가 막으려는 바로 그 버그를 다시 만듭니다.
- **`next-intl`**, **`vue-i18n`** 등은 완전한 i18n 프레임워크입니다. 이미 쓰고
  있다면 그대로 두고, 협상 단계에만 이걸 쓰세요.

이 라이브러리가 더하는 것은 어느 쪽도 결정해 주지 않는 부분입니다:
**당신이 어떤 문자를 서비스하는가, 그리고 반대쪽을 요청한 독자를 어떻게 할 것인가.**

## 라이선스

Apache-2.0 © devslab
