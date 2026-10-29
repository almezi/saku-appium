/**
 * Locator helpers built on the test-tag contract (TESTABILITY.md).
 *
 * On Android the app maps Compose testTags to bare resource-ids
 * (`testTagsAsResourceId = true` in MainActivity), so tags are resolved with
 * UiAutomator2 resourceId selectors — never by visible text.
 *
 * On iOS (Compose Multiplatform) the same testTags map to native
 * `accessibilityIdentifier`s (TESTABILITY.md "iOS Stage 0 result"), so the
 * ios* helpers resolve tags with the accessibility-id strategy instead. Two
 * iOS-specific quirks these helpers rely on callers to accommodate:
 *  - the accessibility tree is populated lazily, so the first lookup after
 *    launch can miss until the app settles (use generous waitFor timeouts);
 *  - tree depth is not fixed (CMP inserts wrapper levels), so never chain
 *    positional child selectors off a tag.
 */
import { $, $$ } from "@wdio/globals";
import type { ChainablePromiseElement, ChainablePromiseArray } from "../types";

/**
 * Exact tag match, e.g. byTag(tags.tambah.buttonSave). Chain the result
 * directly (`.click()`, `.getText()`) or pass it straight to a helper that
 * accepts a ChainablePromiseElement — await only when a statement needs the
 * resolved value.
 */
export const byTag = (tag: string): ChainablePromiseElement =>
  $(`android=new UiSelector().resourceId("${tag}")`);

/** All elements whose tag matches an exact string. */
export const allByTag = (tag: string): ChainablePromiseArray =>
  $$(`android=new UiSelector().resourceId("${tag}")`);

/**
 * Exact tag match on iOS — the accessibility-id twin of byTag. Re-resolves
 * on every command, which is what makes tab switches safe: Compose
 * recomposes the bottom bar on each screen change, and stale iOS element
 * handles die with it (verified live: "No matches found for Identity
 * Binding" when reusing a handle across a screen switch).
 */
export const iosByTag = (tag: string): ChainablePromiseElement => $(`~${tag}`);

/** All elements whose tag matches an exact string on iOS. */
export const iosAllByTag = (tag: string): ChainablePromiseArray => $$(`~${tag}`);

/** All elements whose tag matches a Java regex. */
export const allByTagMatches = (pattern: string): ChainablePromiseArray =>
  $$(`android=new UiSelector().resourceIdMatches("${pattern}")`);

/**
 * All iOS elements whose accessibility identifier matches a regex — the
 * `allByTagMatches` twin. NSPredicate `MATCHES` is ICU regex, so anchor the
 * pattern (`[0-9]+$`) when a suffix-bearing node like `daftar_item_1_delete_…`
 * must not match alongside the card root.
 */
export const iosAllByTagMatches = (pattern: string): ChainablePromiseArray =>
  $$(`-ios predicate string: name MATCHES "${pattern}"`);

/**
 * Scroll the first scrollable container until an element with the given tag
 * regex is visible, and return that element. Returns the plain element when
 * it is already present (UiScrollable handles both internally by scrolling
 * as needed). Use for LazyColumn content below the fold.
 */
export const scrollToTagMatches = (pattern: string): ChainablePromiseElement =>
  $(
    `android=new UiScrollable(new UiSelector().scrollable(true))` +
      `.scrollIntoView(new UiSelector().resourceIdMatches("${pattern}"))`,
  );

/** Same as scrollToTagMatches but for an exact tag. */
export const scrollToTag = (tag: string): ChainablePromiseElement =>
  $(
    `android=new UiScrollable(new UiSelector().scrollable(true))` +
      `.scrollIntoView(new UiSelector().resourceId("${tag}"))`,
  );
