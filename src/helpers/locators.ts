/**
 * Locator helpers built on the test-tag contract (TESTABILITY.md).
 *
 * On Android the app maps Compose testTags to bare resource-ids
 * (`testTagsAsResourceId = true` in MainActivity), so tags are resolved with
 * UiAutomator2 resourceId selectors — never by visible text.
 */
import { $, $$ } from '@wdio/globals'
import type { ChainablePromiseElement, ChainablePromiseArray } from '../types'

/**
 * Exact tag match, e.g. byTag(tags.tambah.buttonSave). Chain the result
 * directly (`.click()`, `.getText()`) or pass it straight to a helper that
 * accepts a ChainablePromiseElement — await only when a statement needs the
 * resolved value.
 */
export const byTag = (tag: string): ChainablePromiseElement =>
  $(`android=new UiSelector().resourceId("${tag}")`)

/** All elements whose tag matches an exact string. */
export const allByTag = (tag: string): ChainablePromiseArray =>
  $$(`android=new UiSelector().resourceId("${tag}")`)

/** All elements whose tag matches a Java regex. */
export const allByTagMatches = (pattern: string): ChainablePromiseArray =>
  $$(`android=new UiSelector().resourceIdMatches("${pattern}")`)

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
  )

/** Same as scrollToTagMatches but for an exact tag. */
export const scrollToTag = (tag: string): ChainablePromiseElement =>
  $(
    `android=new UiScrollable(new UiSelector().scrollable(true))` +
      `.scrollIntoView(new UiSelector().resourceId("${tag}"))`,
  )
