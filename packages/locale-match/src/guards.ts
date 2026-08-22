/**
 * Script guards — the part no locale matcher can decide for you.
 *
 * Most languages are decided by their tag alone: `ko` means Korean, `de`
 * means German. Chinese is the large exception. A bare `zh` is silent
 * about the only thing that matters — Simplified or Traditional — and
 * both scripts have hundreds of millions of readers. Serving the wrong
 * one is not a small miss; it is text your reader did not ask for.
 *
 * A guard answers, for one base language, "does this tag ask for the
 * script I actually publish?" — and it answers in THREE values, because
 * two is not enough (see `ScriptVerdict`).
 */

/**
 * `supported`   — the tag names the script we publish (`zh-TW`, `zh-Hant`).
 * `unsupported` — the tag names the other script (`zh-CN`, `zh-Hans`).
 * `unspecified` — the tag is this language but silent about script (`zh`).
 *
 * The third value carries the whole design. A bare `zh` is not wrong, it
 * is *undeclared*, and undeclared has to be treated differently
 * depending on where the tag came from — see `tagAllowed`.
 */
export type ScriptVerdict = 'supported' | 'unsupported' | 'unspecified';

export interface ScriptGuard {
  /** Base subtag this guard governs, lowercase — e.g. `'zh'`. */
  readonly language: string;
  classify(tag: string): ScriptVerdict;
}

/**
 * Where a tag came from. The distinction is not cosmetic — it changes
 * what an `unspecified` tag is allowed to do.
 *
 * `declared` — ONE value someone chose: `?lang=`, a cookie, a stored
 *   preference, a tenant setting. There is no ranked list to be gamed,
 *   so an undeclared script is accepted: the person asked for Chinese
 *   and we have Chinese.
 *
 * `ranked` — one entry inside a PREFERENCE LIST (`Accept-Language`,
 *   `navigator.languages`). Here an undeclared script must be refused.
 *   Measured in production 2026-08-21: a mainland browser sends
 *   `zh-CN,zh;q=0.9`, so refusing `zh-CN` alone simply handed the match
 *   to the bare `zh` sitting right behind it, and the page came back
 *   Traditional anyway. In a ranked list a vague entry RESCUES the
 *   precise one you just refused. Hong Kong and Taiwan browsers name
 *   their script (`zh-HK` / `zh-TW`), so requiring it costs them nothing.
 */
export type TagSource = 'declared' | 'ranked';

/**
 * Is this tag allowed through, given the guards in force?
 * Tags in languages no guard governs always pass.
 */
export function tagAllowed(
  guards: readonly ScriptGuard[],
  tag: string,
  source: TagSource,
): boolean {
  const t = tag.trim().toLowerCase();
  if (!t) return false;
  const base = t.split('-')[0] ?? '';
  for (const guard of guards) {
    if (guard.language !== base) continue;
    const verdict = guard.classify(t);
    return source === 'ranked' ? verdict === 'supported' : verdict !== 'unsupported';
  }
  return true;
}

/**
 * Build a guard for any language whose script must be named.
 *
 * Both patterns are tested against the LOWERCASED tag. A tag in this
 * language matching neither is `unspecified`.
 *
 * @example Serbian, publishing Latin only
 * ```ts
 * const serbianLatin = defineScriptGuard({
 *   language: 'sr',
 *   supported: /^sr-(latn|latin)\b/,
 *   unsupported: /^sr-(cyrl|cyrillic)\b/,
 * });
 * ```
 */
export function defineScriptGuard(spec: {
  language: string;
  supported: RegExp;
  unsupported: RegExp;
}): ScriptGuard {
  const language = spec.language.trim().toLowerCase();
  return {
    language,
    classify(tag: string): ScriptVerdict {
      const t = tag.trim().toLowerCase();
      if (spec.supported.test(t)) return 'supported';
      if (spec.unsupported.test(t)) return 'unsupported';
      return 'unspecified';
    },
  };
}

/**
 * Region subtags that imply a script, for the cases where the writer
 * did not spell out `Hant` / `Hans`. Macau and Hong Kong are Traditional;
 * Singapore and Malaysia are Simplified.
 */
const TRADITIONAL = /^zh-(hant|tw|hk|mo)\b/;
const SIMPLIFIED = /^zh-(hans|cn|sg|my)\b/;

/**
 * The built-in Chinese guard. Pass the script YOU publish.
 *
 * @example a site that ships Traditional only (Taiwan / Hong Kong)
 * ```ts
 * chineseGuard('traditional')
 * ```
 */
export function chineseGuard(script: 'traditional' | 'simplified'): ScriptGuard {
  return defineScriptGuard({
    language: 'zh',
    supported: script === 'traditional' ? TRADITIONAL : SIMPLIFIED,
    unsupported: script === 'traditional' ? SIMPLIFIED : TRADITIONAL,
  });
}

/**
 * Read the guard off the locales you actually declared, so the common
 * case needs no configuration.
 *
 * This is deliberately not a guess: it reads a list you WROTE. If your
 * supported locales are Traditional-only, a Simplified reader is
 * someone you have nothing for, and that is a fact about your own
 * declaration — not an inference about the visitor. When you publish
 * both scripts, or no Chinese at all, there is nothing to protect and
 * no guard is installed.
 */
export function guardsFor(supported: readonly string[]): ScriptGuard[] {
  let traditional = false;
  let simplified = false;
  for (const locale of supported) {
    const t = locale.trim().toLowerCase();
    if (TRADITIONAL.test(t)) traditional = true;
    else if (SIMPLIFIED.test(t)) simplified = true;
  }
  if (traditional === simplified) return []; // both, or neither
  return [chineseGuard(traditional ? 'traditional' : 'simplified')];
}
