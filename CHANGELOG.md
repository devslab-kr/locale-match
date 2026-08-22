# Changelog

All notable changes to this project are documented here. The packages share one
version number, so an entry covers every package unless it says otherwise.

## 0.1.1

### Fixed

- Every package now ships its own `README.md`, so the npm page shows the
  documentation instead of "This package does not have a README". npm reads the
  README from the package directory, not the repository root.

### Changed

- READMEs follow the devslab OSS convention: the four-badge block (npm, CI,
  TypeScript, License) on the repository README, a single npm badge on each
  package, a nav line with the `한국어` / `English` pair, and a `## Packages`
  table. Bilingual pairs for every package.

## 0.1.0

First release.

### Added

- `@devslab/locale-match` — the core matcher. Zero dependencies; ships ESM, CJS
  and an IIFE bundle (`LocaleMatch` global) so a page with no build step can use
  it from a CDN.
  - `createLocaleResolver()` — the precedence chain: `?lang=` (the publisher's
    declaration), then a stored cookie or `localStorage` value (the reader's own
    past choice), then `Accept-Language` / `navigator.languages`, then a
    fallback. Nothing inferred, such as IP geolocation, is in the chain.
  - `matchLocale()` / `matchRankedTags()` / `matchAcceptLanguage()` /
    `parseAcceptLanguage()` — matching with q-value parsing.
  - **Script guards** — `chineseGuard()`, `defineScriptGuard()`, `guardsFor()`.
    A guard classifies a tag as `supported`, `unsupported` or `unspecified` for
    one base language, applied under a two-tier rule: a single declared value
    may leave the script unstated, an entry inside a ranked list may not.
  - The Chinese guard is installed automatically, derived from the caller's own
    `supported` list. Pass `guards: []` to opt out.
- `@devslab/locale-match-react` — `<LocaleProvider>` and `useLocale()`.
  Detection runs after mount so the first client render agrees with
  server-rendered HTML; pass `initial` to skip it entirely.
- `@devslab/locale-match-vue` — `createLocalePlugin()` and `useLocale()`.
- `@devslab/locale-match-nuxt` — a Nuxt module that resolves during SSR from the
  request's own headers and hands the answer to the client through the payload,
  so the page never changes language after it paints. Requires Nuxt 3.8+.

### Why this exists

Two production incidents on getasklinq.app, where a Traditional-Chinese-only
site served Traditional text to mainland Simplified readers:

1. folding `zh-CN` to its base `zh` and mapping that to `zh-TW`;
2. after refusing `zh-CN`, the bare `zh` behind it in
   `Accept-Language: zh-CN,zh;q=0.9` rescued the match anyway.

Both are pinned by tests.
