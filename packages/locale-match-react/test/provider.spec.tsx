import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider, useLocale } from '../src/index.js';

// Testing Library only registers its own cleanup when vitest runs with
// `globals: true`. This suite does not, so renders would otherwise pile
// up in the document and every getBy* would find several matches.
afterEach(cleanup);

const TRAD = ['ko', 'en', 'ja', 'zh-HK', 'zh-TW'] as const;

function Probe() {
  const { locale, source, isFallback, setLocale } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="source">{source}</span>
      <span data-testid="fallback">{String(isFallback)}</span>
      <button onClick={() => setLocale('ja')}>ja</button>
      <button onClick={() => setLocale('zh-CN')}>zh-CN</button>
    </div>
  );
}

describe('<LocaleProvider>', () => {
  it('trusts an initial locale from the server and never re-detects', () => {
    render(
      <LocaleProvider supported={TRAD} fallback="ko" initial="ja">
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('ja');
    expect(screen.getByTestId('fallback').textContent).toBe('false');
  });

  it('detects after mount when no initial is given', () => {
    render(
      <LocaleProvider
        supported={TRAD}
        fallback="ko"
        input={{ acceptLanguage: 'en-GB,en;q=0.9' }}
      >
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('source').textContent).toBe('browser');
  });

  it('carries the script guard through the adapter', () => {
    render(
      <LocaleProvider
        supported={TRAD}
        fallback="ko"
        input={{ acceptLanguage: 'zh-CN,zh;q=0.9,ja;q=0.8' }}
      >
        <Probe />
      </LocaleProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('ja');
  });

  it('setLocale accepts a supported tag and ignores anything else', () => {
    render(
      <LocaleProvider supported={TRAD} fallback="ko" initial="ko">
        <Probe />
      </LocaleProvider>,
    );
    act(() => screen.getByText('ja').click());
    expect(screen.getByTestId('locale').textContent).toBe('ja');
    act(() => screen.getByText('zh-CN').click());
    expect(screen.getByTestId('locale').textContent).toBe('ja');
  });

  it('throws a useful error outside the provider', () => {
    // React also logs the boundary-less error; silence it so a passing
    // run stays readable.
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/outside <LocaleProvider>/);
    logged.mockRestore();
  });
});
