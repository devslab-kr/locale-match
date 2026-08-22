import { describe, expect, it } from 'vitest';
import {
  chineseGuard,
  createLocaleResolver,
  defineScriptGuard,
  guardsFor,
  matchAcceptLanguage,
  matchLocale,
  parseAcceptLanguage,
} from '../src/index.js';

/** A Traditional-only publisher — the shape that motivated this library. */
const TRAD = ['ko', 'en', 'ja', 'zh-HK', 'zh-TW', 'pt-BR', 'fr'] as const;

describe('the Chinese trap', () => {
  it('refuses Simplified when only Traditional is published', () => {
    expect(matchAcceptLanguage('zh-CN', TRAD, { guards: guardsFor(TRAD) })).toBeNull();
  });

  it('a bare zh behind a refused zh-CN must not rescue it', () => {
    // The production bug, 2026-08-21: mainland browsers send exactly
    // this, and refusing only the precise tag handed the match to the
    // vague one behind it.
    expect(
      matchAcceptLanguage('zh-CN,zh;q=0.9', TRAD, { guards: guardsFor(TRAD) }),
    ).toBeNull();
  });

  it('still serves Hong Kong and Taiwan, who name their script', () => {
    const guards = guardsFor(TRAD);
    expect(matchAcceptLanguage('zh-HK,zh;q=0.9', TRAD, { guards })).toBe('zh-HK');
    expect(matchAcceptLanguage('zh-TW', TRAD, { guards })).toBe('zh-TW');
    expect(matchAcceptLanguage('zh-Hant', TRAD, { guards })).toBe('zh-HK');
  });

  it('a mainland reader falls through to their next language, not to Chinese', () => {
    expect(
      matchAcceptLanguage('zh-CN,zh;q=0.9,en;q=0.8', TRAD, { guards: guardsFor(TRAD) }),
    ).toBe('en');
  });

  it('accepts a bare zh when it is a single declared value', () => {
    // No ranked list to be gamed here: the reader asked for Chinese and
    // Chinese is what we have.
    const r = createLocaleResolver({ supported: TRAD, fallback: 'ko' });
    expect(r.fromTag('zh')).toBe('zh-HK');
    expect(r.fromTag('zh-CN')).toBeNull();
  });

  it('mirrors for a Simplified-only publisher', () => {
    const simplified = ['en', 'zh-CN'] as const;
    const guards = guardsFor(simplified);
    expect(guards[0]?.classify('zh-cn')).toBe('supported');
    expect(matchAcceptLanguage('zh-TW,zh;q=0.9', simplified, { guards })).toBeNull();
    expect(matchAcceptLanguage('zh-CN', simplified, { guards })).toBe('zh-CN');
  });

  it('installs no guard when both scripts, or neither, are published', () => {
    expect(guardsFor(['zh-CN', 'zh-TW', 'en'])).toEqual([]);
    expect(guardsFor(['ko', 'en'])).toEqual([]);
  });
});

describe('matching', () => {
  it('takes the sideways step that strict RFC 4647 lookup refuses', () => {
    // A Portuguese reader wants Brazilian Portuguese far more than English.
    expect(matchLocale('pt-PT', TRAD)).toBe('pt-BR');
    expect(matchLocale('en-GB', TRAD)).toBe('en');
  });

  it('prefers exact, then truncation, then the sideways step', () => {
    const supported = ['zh-Hant', 'zh-TW', 'en'] as const;
    expect(matchLocale('zh-Hant-TW', supported, { guards: [] })).toBe('zh-Hant');
    expect(matchLocale('zh-MO', supported, { guards: [] })).toBe('zh-Hant');
  });

  it('returns null rather than guessing when nothing shares a base', () => {
    expect(matchLocale('is-IS', TRAD)).toBeNull();
  });
});

describe('parseAcceptLanguage', () => {
  it('sorts by q, keeps header order on ties, drops * and q=0', () => {
    expect(parseAcceptLanguage('de;q=0.7,en,*;q=0.1,fr;q=0,ja').map((e) => e.tag)).toEqual([
      'en',
      'ja',
      'de',
    ]);
  });

  it('survives junk without throwing', () => {
    expect(parseAcceptLanguage('')).toEqual([]);
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage(';;;,q=,')).toEqual([]);
  });
});

describe('custom guards', () => {
  it('governs any script-split language the same way', () => {
    const serbianLatin = defineScriptGuard({
      language: 'sr',
      supported: /^sr-(latn|latin)\b/,
      unsupported: /^sr-(cyrl|cyrillic)\b/,
    });
    const supported = ['en', 'sr-Latn'] as const;
    expect(matchAcceptLanguage('sr-Cyrl,sr;q=0.9', supported, { guards: [serbianLatin] })).toBeNull();
    expect(matchAcceptLanguage('sr-Latn', supported, { guards: [serbianLatin] })).toBe('sr-Latn');
  });

  it('leaves languages no guard governs alone', () => {
    expect(matchAcceptLanguage('ja', TRAD, { guards: [chineseGuard('traditional')] })).toBe('ja');
  });
});

describe('the precedence chain', () => {
  const resolver = createLocaleResolver({ supported: TRAD, fallback: 'ko' });

  it('query beats stored beats browser beats fallback', () => {
    expect(
      resolver.resolve({ query: 'ja', stored: 'fr', acceptLanguage: 'en' }),
    ).toEqual({ locale: 'ja', source: 'query', shouldPersist: true });

    expect(resolver.resolve({ stored: 'fr', acceptLanguage: 'en' }).locale).toBe('fr');
    expect(resolver.resolve({ acceptLanguage: 'en' }).locale).toBe('en');
    expect(resolver.resolve({}).locale).toBe('ko');
    expect(resolver.resolve().source).toBe('fallback');
  });

  it("a reader's own past choice outranks the browser they happen to be on", () => {
    // A Korean-browser reader who picked English keeps English.
    expect(resolver.resolve({ stored: 'en', acceptLanguage: 'ko' }).locale).toBe('en');
  });

  it('reads the stored value out of a Cookie header', () => {
    expect(
      resolver.resolve({ cookieHeader: 'theme=dark; locale=ja; other=1' }).locale,
    ).toBe('ja');
  });

  it('ignores a stored value that is no longer supported', () => {
    expect(resolver.resolve({ stored: 'xx-YY', acceptLanguage: 'fr' }).locale).toBe('fr');
  });

  it('writes a year-long cookie', () => {
    expect(resolver.persistCookie('ja')).toBe(
      'locale=ja; Path=/; Max-Age=31536000; SameSite=Lax',
    );
  });
});
