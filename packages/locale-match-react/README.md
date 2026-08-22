# @devslab/locale-match-react

[![npm](https://img.shields.io/npm/v/%40devslab%2Flocale-match-react)](https://www.npmjs.com/package/@devslab/locale-match-react)

**[Docs & playground](https://devslab-kr.github.io/locale-match/)** · [한국어](README.ko.md)

React binding for [`@devslab/locale-match`](https://www.npmjs.com/package/@devslab/locale-match) — locale negotiation that will not hand a Simplified Chinese reader your Traditional text.

```bash
npm i @devslab/locale-match @devslab/locale-match-react
```

## Usage

```tsx
import { LocaleProvider, useLocale } from '@devslab/locale-match-react';

export function App({ serverLocale }) {
  return (
    <LocaleProvider
      supported={['ko', 'en', 'ja', 'zh-HK', 'zh-TW']}
      fallback="ko"
      initial={serverLocale}   // omit in a pure SPA
    >
      <Page />
    </LocaleProvider>
  );
}

function Page() {
  const { locale, setLocale, supported, isFallback } = useLocale();
  return (
    <select value={locale} onChange={(e) => setLocale(e.target.value)}>
      {supported.map((l) => <option key={l}>{l}</option>)}
    </select>
  );
}
```

## Hydration

Detection runs in an effect **after mount**, never during render.

Server-rendered HTML — including a Next.js static export — carries whatever
locale the server knew. If the client picked a different one during its first
render, React would find markup that does not match what it was about to draw:
a hydration mismatch, which React resolves by throwing the server's HTML away.

The cost of doing it correctly is one frame of the fallback language before the
swap. The way to avoid that frame is not a cleverer hook — it is resolving on
the server and passing the answer in as `initial`.

## API

| export | what |
|---|---|
| `<LocaleProvider {...config} initial? input?>` | takes everything `createLocaleResolver` takes, plus `initial` (a locale already resolved on the server) and `input` (explicit resolve inputs) |
| `useLocale()` | `{ locale, source, supported, setLocale, isFallback, resolver }` |

`setLocale` ignores unsupported values, including a tag your script guard
refuses — so a `zh-CN` passed by mistake cannot flip a Traditional-only site.

## Next.js

Next needs no adapter beyond this one: resolve on the server with the core
package and pass the result to `<LocaleProvider initial={...}>`. The middleware
and server-component recipes — and the `Vary: Accept-Language` warning that goes
with them — are in the
[repo README](https://github.com/devslab-kr/locale-match#nextjs).

Full documentation:
[github.com/devslab-kr/locale-match](https://github.com/devslab-kr/locale-match)
· [한국어](https://github.com/devslab-kr/locale-match/blob/main/README.ko.md)

## License

Apache-2.0 © devslab
