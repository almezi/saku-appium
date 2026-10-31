/**
 * Android page for the Ubah transaksi (edit) screen; iOS twin:
 * ubah.ios.page.ts. Locators are TESTABILITY.md tags (src/config/tags.ts).
 * The edit screen reuses the Tambah form component, so its
 * amount/category/note fields answer to tags.tambah; this page owns only the
 * screen, header, save and delete surfaces.
 */
import { byTag } from "../helpers/locators";
import { tags } from "../config/tags";
import { BasePage } from "./base.page";
import type { ChainablePromiseElement } from "../types";
import { SCREEN_READY } from "../config/timeouts";

/**
 * Ubah transaksi (edit). Shares its form fields with Tambah — the form
 * component is one and the same, so amount/category/note use tags.tambah.
 */
export class UbahPage extends BasePage {
  constructor() {
    super(tags.ubah.screen);
  }

  get saveButton(): ChainablePromiseElement {
    return byTag(tags.ubah.buttonSave);
  }

  get deleteButton(): ChainablePromiseElement {
    return byTag(tags.ubah.buttonDelete);
  }

  /** Header title via its child TextView (the tag node's own text is empty). */
  async headerLabel(): Promise<string> {
    const own = ((await byTag(tags.ubah.header).getText()) || "").trim();
    if (own) return own;
    const children = await byTag(tags.ubah.header).$$(
      'android=new UiSelector().className("android.widget.TextView")',
    );
    for (const child of children) {
      const text = ((await child.getText()) || "").trim();
      if (text) return text;
    }
    return "";
  }

  async isSaveEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled();
  }

  /** Saving returns to the Transaksi list. */
  async save(): Promise<void> {
    await this.saveButton.click();
    await byTag(tags.daftar.screen).waitForDisplayed({ timeout: SCREEN_READY });
  }

  async tapDelete(): Promise<void> {
    await this.deleteButton.click();
  }
}
