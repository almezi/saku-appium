/**
 * TC-AMT — amount input behavior (Phase 3.B) on iOS. The Android spec
 * (src/tests/tambah/amount-input.spec.ts) is the source of truth for the
 * cases; only the driver layer changes.
 *
 * Platform adaptations, all measured live via Appium MCP (iPhone 18 Pro /
 * iOS 27, 2026-10-27):
 *  - the amount field live-formats typed digits as currency ("250000"
 *    renders "Rp 250.000"), exactly like Android;
 *  - the field drops every non-digit ("abc" renders an empty field) — the
 *    same outcome Android reaches through its numeric keyboard;
 *  - the numeric keypad opens on focus (the iOS twin of Android's
 *    `appium_mobile_keyboard` is_shown check) and renders digits plus one
 *    "Delete" key — no letter keys;
 *  - the iOS backspace: the on-screen keypad carries a "Delete" key, but the
 *    app dismisses the software keyboard when the category sheet closes, so
 *    that key ends up off-screen (the Keyboard node stays in the tree with
 *    visible="false") and tapping it does nothing — the case therefore uses
 *    the hardware BACKSPACE (U+E003), the direct twin of Android's native
 *    DEL keycode 67;
 *  - the value clamps at 12 digits, exactly like Android (19 typed digits
 *    render "Rp 100.000.000.000").
 */
import { $$ } from "@wdio/globals";
import { categories } from "../../config/categories";
import { iosClearField, iosFieldEditor, iosKeyboardShown } from "../../helpers/input";
import { TambahIosPage } from "../../pageobjects/tambah.ios.page";
import type { ChainablePromiseElement } from "../../types";
import { FIELD_WRITE, KEY_SETTLE } from "../../config/settles";
import { ELEMENT_PRESENT } from "../../config/timeouts";

const BUNDLE_ID = "id.almezi.saku";

const tambah = new TambahIosPage();

/** Editor node of the amount field (where the text actually lands). */
async function amountEditor(): Promise<ChainablePromiseElement> {
  const editor = await iosFieldEditor(tambah.amountInput);
  if (!editor) throw new Error("The amount field has no editor node");
  return editor;
}

/** Types digits into the amount field and returns the rendered text. */
async function typeAmount(digits: string): Promise<string> {
  const editor = await amountEditor();
  await editor.click();
  await editor.addValue(digits);
  await driver.pause(FIELD_WRITE);
  return tambah.getAmountText();
}

/**
 * Sends the hardware BACKSPACE (U+E003) to the focused amount field — the
 * twin of Android's native DEL keycode 67 that the Android spec uses for the
 * same case.
 *
 * The on-screen keypad's "Delete" key is deliberately NOT used: the app
 * dismisses the software keyboard when the category sheet closes, and the
 * dismissed keyboard stays in the tree with visible="false" (measured live
 * 2026-10-27: the Keyboard node sits at y=891, below the 874-pt screen, and
 * its keys at y=898..1114), so a tap on its Delete key lands on an
 * off-screen element and changes nothing. The hardware backspace reaches the
 * focused field whether or not the software keyboard is up.
 *
 * The tap is verified: the field must actually lose a character, otherwise
 * the backspace is sent again (max 3 attempts).
 */
async function pressBackspace(): Promise<void> {
  const before = await tambah.getAmountText();
  for (let attempt = 0; attempt < 3; attempt++) {
    const editor = await amountEditor();
    await editor.addValue("\uE003");
    await driver.pause(KEY_SETTLE);
    if ((await tambah.getAmountText()) !== before) return;
  }
  throw new Error(`The backspace did not change the amount ("${before}")`);
}

/** Empties the amount field. */
async function clearAmount(): Promise<void> {
  await iosClearField(tambah.amountInput);
}

/** Restarts the app onto a fresh Tambah form (empty amount, no category). */
async function freshForm(): Promise<void> {
  await driver.terminateApp(BUNDLE_ID);
  await driver.activateApp(BUNDLE_ID);
  await tambah.open();
}

describe("TC-AMT — amount input behavior (Phase 3.B) on iOS @regression", () => {
  before(async () => {
    await freshForm();
  });

  beforeEach(async () => {
    await clearAmount();
  });

  it("TC-AMT-01 tapping the amount field opens the numeric keypad @regression", async () => {
    const editor = await amountEditor();
    await editor.click();
    await expect(editor).toBeDisplayed({ wait: ELEMENT_PRESENT });
    expect(await iosKeyboardShown()).toBe(true);
    // The numeric keypad renders digits only — an alphabetic key would mean
    // the full keyboard is up instead. The word "Delete" is not a letter key,
    // so only single-letter names count.
    const digitKeys = await $$(
      '-ios predicate string: type == "XCUIElementTypeKey" AND name == "5"',
    );
    expect(await digitKeys.length).toBe(1);
    const letterKeys = await $$(
      '-ios predicate string: type == "XCUIElementTypeKey" AND name MATCHES "^[A-Za-z]$"',
    );
    expect(await letterKeys.length).toBe(0);
  });

  it('TC-AMT-02 typed digits format live as "Rp X.XXX" @regression', async () => {
    expect(await typeAmount("250000")).toBe("Rp 250.000");
  });

  it("TC-AMT-03 backspace to empty returns helper state and re-disables save @regression", async () => {
    await tambah.selectCategory(categories.income.salary);
    await typeAmount("10000");
    expect(await tambah.isSaveEnabled()).toBe(true);
    await clearAmount();
    expect(await tambah.isSaveEnabled()).toBe(false);
    expect(await tambah.getHelperText()).toBe("Isi jumlah dulu");
  });

  it("TC-AMT-04 clear field re-disables save @regression", async () => {
    await typeAmount("10000");
    await tambah.selectCategory(categories.income.salary);
    expect(await tambah.isSaveEnabled()).toBe(true);
    await clearAmount();
    expect(await tambah.isSaveEnabled()).toBe(false);
  });

  it("TC-AMT-05 thousand separator auto-inserted on formatted amounts @regression", async () => {
    expect(await typeAmount("1234567")).toBe("Rp 1.234.567");
  });

  it("TC-AMT-06 cursor stays at end during formatting edits @regression", async () => {
    expect(await typeAmount("123")).toBe("Rp 123");
    // One backspace drops the last digit only.
    await pressBackspace();
    expect(await tambah.getAmountText()).toBe("Rp 12");
    const editor = await amountEditor();
    await editor.addValue("4");
    await driver.pause(FIELD_WRITE);
    expect(await tambah.getAmountText()).toBe("Rp 124");
  });

  it("TC-AMT-07 max digits limit clamps at 12 without crashing @regression", async () => {
    await clearAmount();
    expect(await typeAmount("9".repeat(18))).toBe("Rp 999.999.999.999");
    await expect(tambah.screen).toBeDisplayed();
  });
});
