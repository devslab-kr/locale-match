import { describe, expect, it } from 'vitest';
import { createLocalePlugin } from '../src/index.js';

const TRAD = ['ko', 'en', 'ja', 'zh-HK', 'zh-TW'] as const;

describe('createLocalePlugin', () => {
  it('trusts an initial locale handed in by the server', () => {
    const { state } = createLocalePlugin({ supported: TRAD, fallback: 'ko', initial: 'ja' });
    expect(state.locale.value).toBe('ja');
    expect(state.isFallback.value).toBe(false);
  });

  it('resolves from explicit input when no initial is given', () => {
    const { state } = createLocalePlugin({
      supported: TRAD,
      fallback: 'ko',
      input: { acceptLanguage: 'en-GB,en;q=0.9' },
    });
    expect(state.locale.value).toBe('en');
    expect(state.source.value).toBe('browser');
  });

  it('carries the script guard through the adapter', () => {
    const { state } = createLocalePlugin({
      supported: TRAD,
      fallback: 'ko',
      input: { acceptLanguage: 'zh-CN,zh;q=0.9,ja;q=0.8' },
    });
    expect(state.locale.value).toBe('ja');
  });

  it('setLocale accepts a supported tag and ignores anything else', () => {
    const { state } = createLocalePlugin({ supported: TRAD, fallback: 'ko', initial: 'ko' });
    state.setLocale('ja');
    expect(state.locale.value).toBe('ja');
    state.setLocale('xx-YY');
    expect(state.locale.value).toBe('ja');
    state.setLocale('zh-CN');
    expect(state.locale.value).toBe('ja');
  });

  it('reports the fallback honestly when nothing matches', () => {
    const { state } = createLocalePlugin({
      supported: TRAD,
      fallback: 'ko',
      input: { acceptLanguage: 'is-IS' },
    });
    expect(state.isFallback.value).toBe(true);
  });
});
