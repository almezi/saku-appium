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
