/**
 * iOS twin of base.page.ts — the base class every iOS page object extends.
 * Locators resolve accessibility ids through the TESTABILITY.md tag contract
 * (src/config/tags.ts); the class block below records why the screen-wait
 * budget runs wider than the Android one (lazily populated accessibility tree).
 */
import { iosByTag } from "../helpers/locators";
import { tags } from "../config/tags";
import type { ChainablePromiseElement } from "../types";
import { SCREEN_READY_IOS } from "../config/timeouts";

/**
 * iOS twin of BasePage: same screen-wait contract, resolved with iosByTag
 * (accessibility id) instead of the Android UiSelector. The Android suite
 * never imports this file.
 *
 * The wait timeout defaults wider than the Android 15 s because the iOS
 * accessibility tree is populated lazily (TESTABILITY.md) — on cold app
 * starts the first lookups can miss for several seconds.
 */
export class BaseIosPage {
  constructor(protected readonly screenTag: string) {}

  get screen(): ChainablePromiseElement {
    return iosByTag(this.screenTag);
  }

  async waitForScreen(timeout = SCREEN_READY_IOS): Promise<void> {
    await this.screen.waitForDisplayed({ timeout });
  }

  async isDisplayed(): Promise<boolean> {
    return this.screen.isDisplayed();
  }

  /** Toolbar back button (screens without the bottom bar, e.g. Ubah). */
  async tapBack(): Promise<void> {
    await iosByTag(tags.component.buttonBack).click();
  }
}
