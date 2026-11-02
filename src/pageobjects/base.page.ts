/**
 * Base class every Android page object extends: the subclass passes its
 * screen's test tag and inherits the shared screen contract — byTag lookups
 * against the TESTABILITY.md tag contract (mirrored in src/config/tags.ts),
 * a SCREEN_READY wait budget from src/config/timeouts.ts, and back
 * navigation. iOS counterpart: base.ios.page.ts.
 */
import { byTag } from "../helpers/locators";
import { tags } from "../config/tags";
import type { ChainablePromiseElement } from "../types";
import { SCREEN_READY } from "../config/timeouts";

export class BasePage {
  constructor(protected readonly screenTag: string) {}

  get screen(): ChainablePromiseElement {
    return byTag(this.screenTag);
  }

  async waitForScreen(timeout = SCREEN_READY): Promise<void> {
    await this.screen.waitForDisplayed({ timeout });
  }

  async isDisplayed(): Promise<boolean> {
    return this.screen.isDisplayed();
  }

  /** Toolbar back button (screens without the bottom bar). */
  async tapBack(): Promise<void> {
    await byTag(tags.component.buttonBack).click();
  }

  /** Hardware/system back. */
  async systemBack(): Promise<void> {
    await driver.back();
  }
}
