/**
 * The test-type taxonomy — which kind of test a case is, so a run can be
 * scoped to it.
 *
 * Every test case's `it()` title ends with exactly one type tag. The tags
 * are what mocha's `grep` matches, because mocha greps the test's FULL
 * title: the type scripts in package.json set `TEST_GREP` (e.g.
 * `TEST_GREP=@sanity npm test`) and both runner configs pass it through to
 * mocha (`mochaOpts.grep` in wdio.conf.ts and wdio.ios.conf.ts).
 *
 * The tags stay LITERALS in the case titles rather than imports, so the
 * assignment is readable in the spec file itself and `grep '@regression'
 * src/tests` shows the whole map. The vocabulary below is the single source
 * of truth for which tags exist and what they mean; the guardrail test in
 * src/config/__tests__/test-types.test.ts fails the build when a spec
 * drifts from it.
 *
 * Why a guardrail: a case that forgets its tag is not a loud failure, it is
 * SILENTLY EXCLUDED from every filtered run — the case simply never runs.
 */
export const TEST_TYPES = {
  /**
   * The fast, always-on set: the app launches and the core path is intact.
   * Runs on every change, so it must stay short and free of setup.
   */
  sanity: "@sanity",
  /**
   * The functional suite: every feature behaves as specified. This is the
   * bulk of the suite and what a release candidate must pass.
   */
  regression: "@regression",
  /**
   * Cases that span several screens or flows at once — a delete that must
   * move the list, the summary AND the breakdown, an undo that has to
   * restore all three. They are slower and depend on the state the
   * single-screen specs leave behind, so they run as their own group.
   */
  integration: "@integration",
} as const;

export type TestType = keyof typeof TEST_TYPES;

/** Every recognized type name, in the order the docs list them. */
export const TEST_TYPE_NAMES = Object.keys(TEST_TYPES) as TestType[];

/** The recognized type tags a title carries. */
export function testTypesOf(title: string): TestType[] {
  return TEST_TYPE_NAMES.filter((name) => title.includes(TEST_TYPES[name]));
}
