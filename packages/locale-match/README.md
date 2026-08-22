# @devslab/locale-match

[![npm](https://img.shields.io/npm/v/%40devslab%2Flocale-match)](https://www.npmjs.com/package/@devslab/locale-match)

**[Docs & playground](https://devslab-kr.github.io/locale-match/)** · [Changelog](https://github.com/devslab-kr/locale-match/blob/main/CHANGELOG.md) · [한국어](README.ko.md)

**Locale negotiation that will not hand a Simplified Chinese reader your Traditional text.**
Zero dependencies. Runs in Node, Bun, Deno, Cloudflare Workers, and the browser.

```bash
npm i @devslab/locale-match
```

Framework bindings: [React](https://www.npmjs.com/package/@devslab/locale-match-react) · [Vue](https://www.npmjs.com/package/@devslab/locale-match-vue) · [Nuxt](https://www.npmjs.com/package/@devslab/locale-match-nuxt).

## The problem

Most languages are decided by their tag alone. `ko` means Korean, `de` means
German — there is nothing else to know.

Chinese is the exception, and it is a large one. A bare `zh` is silent about the
only thing that matters — **Simplified or Traditional** — and both scripts have
hundreds of millions of readers. If you publish Traditional for Taiwan and Hong
Kong, a mainland reader arriving with `zh-CN` should *not* get your Traditional
text. They should get their next language, usually English.

Naive detection gets this wrong in a specific way:

```js
// The bug almost everyone writes
const base = tag.split('-')[0];       // 'zh-CN' becomes 'zh'
if (base === 'zh') return 'zh-TW';    // ...and Simplified readers get Traditional
```

And there is a second trap behind it. Suppose you fix that by refusing `zh-CN`.
A mainland browser does not send `zh-CN` alone — it sends:

```
Accept-Language: zh-CN,zh;q=0.9
```

The bare `zh` sitting right behind the tag you just refused **rescues it**, and
the page comes back Traditional anyway. We measured exactly this in production.

So the rule has two tiers, and this library implements both:

| where the tag came from | a bare `zh` means |
|---|---|
| **one declared value** — `?lang=`, a cookie, a saved setting | *accept* — they asked for Chinese and you have Chinese |
| **an entry in a ranked list** — `Accept-Language`, `navigator.languages` | *refuse* — in a ranked list a vague entry rescues a precise one |

## Quick start

```ts
import { createLocaleResolver } from '@devslab/locale-match';

const locales = createLocaleResolver({
  supported: ['ko', 'en', 'ja', 'zh-HK', 'zh-TW', 'fr'],
  fallback: 'ko',
});

// Server (Workers, Node, anywhere with a Request)
const { locale } = locales.resolve({
  query: url.searchParams.get('lang'),
  cookieHeader: request.headers.get('cookie'),
  acceptLanguage: request.headers.get('accept-language'),
});

// Browser: ?lang= then localStorage then navigator.languages
const { locale } = locales.resolveInBrowser();
```

Real behaviour, with the config above:

| input | result |
|---|---|
| `zh-CN,zh;q=0.9,en;q=0.8` | `en` — the mainland reader gets their next language |
| `zh-HK,zh;q=0.9` | `zh-HK` |
| `zh-TW` | `zh-TW` |
| `pt-PT` | `pt-BR` if you publish it — see *Matching* below |
| `?lang=zh` (declared) | `zh-HK` — a declared bare `zh` is accepted |
| `?lang=zh-CN` (declared) | `null` — you have nothing for this reader |

The Chinese guard is **on by default**, derived from the list you just wrote.
Traditional-only `supported` installs a Traditional guard; Simplified-only
installs a Simplified one; publish both scripts (or no Chinese) and no guard is
installed, because there is nothing to protect. This is not a guess about your
visitors — it reads a list *you* declared.

```ts
createLocaleResolver({ supported, fallback: 'ko', guards: [] });   // opt out

import { chineseGuard } from '@devslab/locale-match';
createLocaleResolver({ supported, fallback: 'ko', guards: [chineseGuard('simplified')] });
```

## Adding a guard for another language

Chinese ships built in because it is the case that bites almost everyone. The
mechanism is not Chinese-specific — **any language whose readers are split by
script can use it**.

A guard answers one question, in three values, for one base language:
`supported` (the tag names the script you publish), `unsupported` (it names the
other one), `unspecified` (this language, silent about script).

```ts
import { defineScriptGuard } from '@devslab/locale-match';

const serbianLatin = defineScriptGuard({
  language: 'sr',                        // base subtag, lowercase
  supported: /^sr-(latn|latin)\b/,       // both tested against the LOWERCASED tag
  unsupported: /^sr-(cyrl|cyrillic)\b/,
});
```

Three things to get right: cover the **regions**, not only the script codes
(people write `sr-RS`, not `sr-Cyrl`); leave the bare tag **`unspecified`** so
the two-tier rule can do its job; and anchor your patterns. The full guide, with
the reasoning behind each, is in the
[repo README](https://github.com/devslab-kr/locale-match#adding-a-guard-for-another-language).
**Pull requests adding well-researched guards are welcome.**

## Matching

Strict RFC 4647 "lookup" only ever truncates: `pt-PT` becomes `pt`, and if you
publish `pt-BR` but not `pt`, your Portuguese reader falls all the way to
English. Correct by the letter, wrong in practice. So this matcher takes the
sideways step — same base language, any region.

That step is what makes the library useful, and it is exactly the step that is
wrong for Chinese. The two features are halves of one design: **jump sideways by
default, and refuse to for the languages where script — not region — separates
the readers.**

Order of attempts: exact match, then progressive truncation (`zh-Hant-TW` to
`zh-Hant` to `zh`), then sideways to any locale sharing the base language, in
*your* `supported` order.

## Precedence

`resolve()` runs one chain: **query** (`?lang=` — the publisher's declaration),
then **stored** (your cookie or `localStorage` — the reader's own past choice),
then **browser** (`Accept-Language` / `navigator.languages`), then **fallback**.

Deliberately *not* in the chain: anything inferred. IP geolocation says where
the packet came from, not what the person reads. Suggest on it if you like — but
that is a banner, not a switch.

It returns `{ locale, source, shouldPersist }`, so you can tell a real match
from a fallback and decide whether to write a cookie.

## No build step

An IIFE bundle ships too, so a plain HTML page can use it from a CDN:

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

## API

| export | what |
|---|---|
| `createLocaleResolver(config)` | the precedence chain, plus `fromTag` / `fromAcceptLanguage` / `fromLanguages` / `resolveInBrowser` / `persist` / `persistCookie` |
| `matchLocale(tag, supported, opts?)` | one tag |
| `matchRankedTags(tags, supported, opts?)` | a preference list |
| `matchAcceptLanguage(header, supported, opts?)` | parse + match a header |
| `parseAcceptLanguage(header)` | q-sorted tags |
| `chineseGuard(script)` | the built-in guard |
| `defineScriptGuard(spec)` | build your own |
| `guardsFor(supported)` | what the automatic mode derives |
| `tagAllowed(guards, tag, source)` | the two-tier rule on its own |

## Why not an existing library?

You may not need this one. `@formatjs/intl-localematcher` implements the spec's
algorithms properly — its `lookup` mode avoids the Chinese bug and also sends
`pt-PT` to English instead of `pt-BR`; its `best fit` mode can match across
scripts. `i18next-browser-languagedetector` gives you the detection order, and
its `load: 'languageOnly'` option reintroduces the exact bug this exists to
prevent. Full-stack i18n frameworks solve a different, larger problem.

What this adds is the part none of them decide: **which script you publish, and
what to do with a reader who asked for the other one.**

## License

Apache-2.0 © devslab
