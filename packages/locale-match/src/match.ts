import { tagAllowed, type ScriptGuard, type TagSource } from './guards.js';

/**
 * Tag matching.
 *
 * Strict RFC 4647 "lookup" only ever truncates: `pt-PT` becomes `pt`,
 * and if you publish `pt-BR` but not `pt`, the Portuguese reader falls
 * all the way to your default. That is correct by the letter and wrong
 * in practice — a Portuguese reader wants Brazilian Portuguese far more
 * than they want English.
 *
 * So this matcher DOES take the sideways step: same base language, any
 * region. That step is what makes the library useful — and it is also
 * exactly the step that is wrong for Chinese. Which is why guards exist.
 * The two features are halves of one design: jump sideways by default,
 * and refuse to for the languages where script, not region, is what
 * separates the readers.
 */

export interface MatchOptions {
  guards?: readonly ScriptGuard[];
  /** Where the tag came from — decides how an undeclared script is read. */
  source?: TagSource;
}

/** `['zh-HK','en']` → `{ 'zh-hk' => 'zh-HK', en => 'en' }` */
function canonical(supported: readonly string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const locale of supported) {
    const key = locale.trim().toLowerCase();
    if (key && !map.has(key)) map.set(key, locale);
  }
  return map;
}

/**
 * Best supported locale for ONE tag, or null.
 *
 * Order: exact match, then progressive truncation (`zh-Hant-TW` →
 * `zh-Hant` → `zh`), then the sideways step to any locale sharing the
 * base language — first in YOUR list order, so you control the
 * tie-break by how you write `supported`.
 */
export function matchLocale<L extends string>(
  tag: string | null | undefined,
  supported: readonly L[],
  options: MatchOptions = {},
): L | null {
  if (!tag) return null;
  const t = tag.trim().toLowerCase();
  if (!t) return null;

  const guards = options.guards ?? [];
  if (guards.length && !tagAllowed(guards, t, options.source ?? 'declared')) return null;

  const map = canonical(supported) as Map<string, L>;

  const exact = map.get(t);
  if (exact) return exact;

  const parts = t.split('-');
  for (let i = parts.length - 1; i > 0; i--) {
    const truncated = parts.slice(0, i).join('-');
    const hit = map.get(truncated);
    if (hit) return hit;
  }

  const base = parts[0] ?? '';
  if (!base) return null;
  for (const locale of supported) {
    if ((locale.toLowerCase().split('-')[0] ?? '') === base) return locale;
  }
  return null;
}

export interface RankedTag {
  tag: string;
  q: number;
}

/**
 * BCP 47 shape, loosely: a 2-8 letter primary subtag, then alphanumeric
 * subtags. Loose enough to pass anything real, strict enough that a
 * malformed header like `en,;q=0.5,q=0.3` cannot smuggle `q=0.3` in as
 * if it were a language.
 */
const WELL_FORMED_TAG = /^[a-z]{2,8}(-[a-z0-9]{1,8})*$/i;

/**
 * Parse an `Accept-Language` header into tags, best first.
 *
 * q-values are read "properly enough": sorted by q descending, ties keep
 * header order (which is what browsers mean by it), `*` and `q=0`
 * dropped.
 */
export function parseAcceptLanguage(header: string | null | undefined): RankedTag[] {
  if (!header) return [];
  const entries: { tag: string; q: number; order: number }[] = [];
  header.split(',').forEach((raw, order) => {
    const [tagPart, ...params] = raw.trim().split(';');
    const tag = (tagPart ?? '').trim();
    if (!tag || tag === '*' || !WELL_FORMED_TAG.test(tag)) return;
    let q = 1;
    for (const param of params) {
      const m = /^\s*q\s*=\s*(\d(?:\.\d{0,3})?)\s*$/i.exec(param);
      if (m) q = Number(m[1]);
    }
    if (!(q > 0)) return;
    entries.push({ tag, q, order });
  });
  entries.sort((a, b) => b.q - a.q || a.order - b.order);
  return entries.map(({ tag, q }) => ({ tag, q }));
}

/**
 * Best supported locale from a PREFERENCE LIST — `Accept-Language`
 * entries or `navigator.languages`. Every tag is read as `ranked`, so
 * an undeclared script cannot rescue a refused one.
 */
export function matchRankedTags<L extends string>(
  tags: readonly string[],
  supported: readonly L[],
  options: Omit<MatchOptions, 'source'> = {},
): L | null {
  for (const tag of tags) {
    const hit = matchLocale(tag, supported, { ...options, source: 'ranked' });
    if (hit) return hit;
  }
  return null;
}

/** Convenience: parse the header, then match it. */
export function matchAcceptLanguage<L extends string>(
  header: string | null | undefined,
  supported: readonly L[],
  options: Omit<MatchOptions, 'source'> = {},
): L | null {
  return matchRankedTags(
    parseAcceptLanguage(header).map((e) => e.tag),
    supported,
    options,
  );
}
