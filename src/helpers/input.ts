/**
 * Shared text-entry helper for Compose text fields: the tag sits on a wrapper
 * node (where `addValue` fails with "did you interact with the correct
 * element"), so click the field's inner editor to focus, backspace any
 * existing text away, then send keys to the focused field. Every attempt is
 * verified via `fieldText` and the whole clear-then-type sequence retries up
 * to 3 times — cached-bounds clicks and keyboard races can drop or duplicate
 * keys, and typing blindly would let a form be saved with wrong content.
 * Throws an error naming `label` (pass the test tag) when the text never
 * lands, so callers never proceed with stale field content.
 *
 * Verification modes: 'exact' (default) requires the rendered text to equal
 * the typed text — right for plain fields. 'digits' compares digit content
 * only, for currency fields the app formats as you type ("254000" renders
 * "Rp 254.000", so exact equality can never hold there).
 */
import { $, $$ } from "@wdio/globals";
import type { ChainablePromiseElement } from "../types";
import { FIELD_CLEAR, FIELD_WRITE, KEYBOARD_DISMISS, STALE_RETRY } from "../config/settles";
import { COMPOSITION_WAIT } from "../config/timeouts";

export type FieldVerify = "exact" | "digits";

export async function typeIntoTaggedField(
  field: ChainablePromiseElement,
  text: string,
  label = "tagged field",
  verify: FieldVerify = "exact",
): Promise<void> {
  const landedOk =
    verify === "digits"
      ? (held: string) => held.replace(/\D/g, "") === text.replace(/\D/g, "")
      : (held: string) => held === text;
  // Re-resolve the field on EVERY attempt: the kategori rename dialog
  // recomposes while the keyboard resizes, and the handle resolved in an
  // earlier attempt is stale — reusing the passed chainable would fail all
  // retries identically. Resolving from the selector re-queries fresh.
  const selector = String(await Promise.resolve(field.selector));
  let landed = "";
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Composition wait: on a cold start the first field lookup can run
      // while the screen is still composing, and the interaction retries
      // below span only ~1 s. Wait for the field to enter the tree first;
      // the retry loop then handles interaction-level staleness only.
      await $(selector).waitForExist({ timeout: COMPOSITION_WAIT });
      const fresh = await $(selector);
      // Focus the inner editor node where one exists: a cached-bounds click on
      // the wrapper can land on a scrim once the keyboard resize shifts the
      // layout (seen live on the kategori rename dialog).
      const editor = await fresh.$(".//android.widget.EditText");
      const inner = (await editor.isExisting().catch(() => false)) ? editor : fresh;
      await inner.click();
      const current = await fieldText(fresh).catch(() => "");
      if (current.length > 0) {
        await driver.keys("\uE003".repeat(current.length + 2));
      }
      await driver.keys(text);
      await driver.hideKeyboard().catch(() => undefined);
      landed = await fieldText(fresh).catch(() => "");
      if (landedOk(landed)) return;
      lastError = null;
    } catch (e) {
      // Transient interaction failure — settle, then retry on a fresh query.
      lastError = e;
      await driver.pause(STALE_RETRY);
    }
  }
  if (lastError) throw lastError;
  throw new Error(
    `typeIntoTaggedField: "${label}" holds "${landed}" instead of "${text}" after 3 attempts`,
  );
}

/**
 * Rendered text of a field. Tambah/Anggaran tags sit on wrapper nodes whose
 * value renders in an inner EditText; the kategori rename dialog tags the
 * EditText itself (verified live: class android.widget.EditText with
 * resource-id kategori_form_name and no inner editor) — so fall back to the
 * field's own text when no inner editor exists.
 */
export async function fieldText(field: ChainablePromiseElement): Promise<string> {
  const editor = await field.$(".//android.widget.EditText");
  if (await editor.isExisting().catch(() => false)) {
    return (await editor.getText()).trim();
  }
  return (await field.getText().catch(() => "")).trim();
}

/**
 * Keyboard-free text entry: writes `text` straight through the
 * instrumentation (UiAutomator2 setText, the same path as Appium MCP
 * set_value), replacing any existing content — no focus click, no IME, no
 * keyboard. Built for the "Ubah kategori" dialog, whose keyboard-resize
 * recomposition kept dismissing the dialog mid-typing under WebdriverIO
 * (BUG_Found_04; the identical flow works live via MCP set_value). Because
 * the keyboard never opens, Compose fields that need focus to accept
 * setText may ignore the write — the verify step catches that and the whole
 * attempt retries on a fresh query; if a field genuinely cannot take a
 * keyboard-free write, callers should fall back to typeIntoTaggedField.
 */
export async function setValueIntoTaggedField(
  field: ChainablePromiseElement,
  text: string,
  label = "tagged field",
  verify: FieldVerify = "exact",
): Promise<void> {
  const landedOk =
    verify === "digits"
      ? (held: string) => held.replace(/\D/g, "") === text.replace(/\D/g, "")
      : (held: string) => held === text;
  const selector = String(await Promise.resolve(field.selector));
  let landed = "";
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await $(selector).waitForExist({ timeout: COMPOSITION_WAIT });
      const fresh = await $(selector);
      await fresh.setValue(text);
      landed = await fieldText(fresh).catch(() => "");
      if (landedOk(landed)) return;
      lastError = null;
    } catch (e) {
      lastError = e;
      await driver.pause(STALE_RETRY);
    }
  }
  if (lastError) throw lastError;
  throw new Error(
    `setValueIntoTaggedField: "${label}" holds "${landed}" instead of "${text}" after 3 attempts`,
  );
}

/* ------------------------------------------------------------------ *
 * iOS twins — verified live 2026-10-27 (spike, iPhone 18 Pro/iOS 27). *
 * ------------------------------------------------------------------ */

/** Inner editor node of an iOS Compose field (measured: XCUIElementTypeTextView). */
const IOS_EDITOR_PREDICATE =
  '-ios predicate string: type == "XCUIElementTypeTextView" OR type == "XCUIElementTypeTextField"';

/** Accessibility identifier carried by the passed field, or null when the selector is not a `~tag`. */
async function iosTagOf(field: ChainablePromiseElement): Promise<string | null> {
  const selector = String(await Promise.resolve(field.selector));
  return selector.startsWith("~") ? selector.slice(1) : null;
}

/**
 * Editor node of an iOS Compose field, or null when none is found.
 *
 * Two measured layouts (spike XML, 2026-10-27):
 *  - the tag sits on a container that OWNS the editor as a descendant;
 *  - the tag sits on an EMPTY self-closing wrapper (`tambah_input_amount`,
 *    `tambah_input_note`) and the editor is the wrapper's FOLLOWING SIBLING
 *    — a descendant query 404s there, which is why the sibling XPath
 *    fallback exists.
 */
export async function iosFieldEditor(
  field: ChainablePromiseElement,
): Promise<ChainablePromiseElement | null> {
  const descendant = field.$(IOS_EDITOR_PREDICATE);
  if (await descendant.isExisting().catch(() => false)) return descendant;
  const tag = await iosTagOf(field);
  if (!tag) return null;
  // Session-scoped XPath (leading //* so WDIO detects the xpath strategy —
  // element-scoped queries mangle custom-strategy strings into text matches,
  // verified in the Appium log). WDA's libxml2 supports following-sibling.
  const sibling = $$(
    `(//*[@name="${tag}"]/following-sibling::` +
      `*[self::XCUIElementTypeTextView or self::XCUIElementTypeTextField])[1]`,
  );
  if ((await sibling.length) > 0) {
    const first = sibling[0];
    if (first !== undefined) return first;
  }
  return null;
}

/**
 * Rendered text of an iOS Compose field: the editor's `value` attribute via
 * iosFieldEditor ("Rp 254.000" / "spike-note-1"), falling back to the
 * wrapper's own text for fields whose tag lands directly on the editor.
 * getText() on the wrapper alone is ALWAYS empty for the measured fields —
 * it is an accessible=false placeholder node.
 */
export async function iosFieldText(field: ChainablePromiseElement): Promise<string> {
  const editor = await iosFieldEditor(field);
  if (editor) {
    const value = ((await editor.getAttribute("value").catch(() => "")) || "").trim();
    if (value) return value;
  }
  return ((await field.getText().catch(() => "")) || "").trim();
}

/** True while the iOS software keyboard is present in the accessibility tree. */
export async function iosKeyboardShown(): Promise<boolean> {
  const keyboards = await $$('-ios predicate string: type == "XCUIElementTypeKeyboard"');
  return (await keyboards.length) > 0;
}

/**
 * Dismisses the iOS software keyboard by tapping the dead zone above the
 * screen content (inside the status-bar inset, where Saku renders nothing —
 * every screen reserves that area via safeAreaTop), falling back to the
 * Return IME action when the tap leaves the keyboard up. WDA's own
 * hideKeyboard CANNOT dismiss a Compose keyboard ("Did not know how to
 * dismiss the keyboard", ~12 s of internal retries per call — measured), so
 * it is not attempted.
 */
export async function iosDismissKeyboard(): Promise<void> {
  if (!(await iosKeyboardShown().catch(() => false))) return;
  const tapDeadZone = async () => {
    const { width } = await driver.getWindowSize();
    await driver.performActions([
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x: Math.floor(width / 2), y: 30 },
          { type: "pointerDown", button: 0 },
          { type: "pointerUp", button: 0 },
        ],
      },
    ]);
    await driver.pause(KEYBOARD_DISMISS);
  };
  await tapDeadZone();
  if (!(await iosKeyboardShown().catch(() => false))) return;
  // The dead-zone tap does not always clear focus (measured on the Tambah
  // amount field, which keeps focus across the category sheet). The Return
  // IME action does close the Compose keyboard; currency editors filter the
  // newline out. The W3C Enter code point (U+E007) is the canonical key
  // value — a literal "\n" reaches WDA as an EMPTY key value and is
  // rejected ("Key value must be present...", measured 2026-10-27).
  await driver.performActions([
    {
      type: "key",
      id: "keyboard1",
      actions: [
        { type: "keyDown", value: "\uE007" },
        { type: "keyUp", value: "\uE007" },
      ],
    },
  ]);
  await driver.pause(KEYBOARD_DISMISS);
}

/**
 * Empties a tagged iOS field.
 *
 * The field is focused first (the backspace fallback only lands on the
 * focused editor), then the editor's clearValue() takes the fast path and a
 * burst of WDA backspace keys (\uE003) clears whatever survived it —
 * verified live on the Tambah note field, where a 60-key burst emptied a
 * 60-character value. Throws when text survives, so a caller never writes
 * into a field that still holds the previous test's data.
 */
export async function iosClearField(field: ChainablePromiseElement): Promise<void> {
  await field.click();
  const editor = await iosFieldEditor(field);
  await editor?.clearValue().catch(() => undefined);
  if ((await iosFieldText(field).catch(() => "")).length > 0) {
    await field.addValue("\uE003".repeat(64));
    await driver.pause(FIELD_CLEAR);
  }
  const left = await iosFieldText(field).catch(() => "");
  if (left.length > 0) {
    throw new Error(`iosClearField: "${left}" survived the clear`);
  }
}

/**
 * Writes raw text into a tagged iOS field and returns the RENDERED text.
 *
 * The iOS twin of the Android spec's `typeKeys`/`setDirect` pair: it injects
 * characters WITHOUT asserting that they survive, because on the amount field
 * they legitimately do not — the InputFilter drops every non-digit ('abc'
 * renders an empty field) — so the raw input and the rendered value differ
 * on purpose.
 *
 * The field is cleared first (iOS setValue/addValue APPENDS instead of
 * replacing) and the keyboard is left up: dismissing it is the caller's
 * decision (the save button sits under the keyboard, so most flows want it
 * gone).
 */
export async function iosWriteRaw(
  field: ChainablePromiseElement,
  text: string,
  label = "tagged field",
): Promise<string> {
  const selector = String(await Promise.resolve(field.selector));
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const lazy = $(selector);
      await lazy.waitForExist({ timeout: COMPOSITION_WAIT });
      await iosClearField(lazy);
      await lazy.addValue(text);
      await driver.pause(FIELD_WRITE);
      return await iosFieldText(lazy);
    } catch {
      // Transient interaction failure — settle, then retry on a fresh query.
      await driver.pause(STALE_RETRY);
    }
  }
  throw new Error(`iosWriteRaw: could not write "${text}" into "${label}" after 3 attempts`);
}

/**
 * Writes text into a tagged iOS field straight through its editor node
 * (setValue) instead of the keyboard (typeText), and returns the rendered
 * text.
 *
 * The iOS keyboard simulation cannot produce emoji or CJK glyphs — the typed
 * path drops them silently — while the value-set path delivers them verbatim
 * (verified live 2026-10-27: "🎈🎉💰" survives save + reopen on the Ubah
 * screen). The field is cleared first because setValue APPENDS on this
 * build.
 */
export async function iosWriteNote(
  field: ChainablePromiseElement,
  text: string,
  label = "tagged field",
): Promise<string> {
  const selector = String(await Promise.resolve(field.selector));
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const lazy = $(selector);
      await lazy.waitForExist({ timeout: COMPOSITION_WAIT });
      await iosClearField(lazy);
      const editor = await iosFieldEditor(lazy);
      if (!editor) throw new Error(`No editor node behind "${label}"`);
      await editor.setValue(text);
      await driver.pause(FIELD_WRITE);
      return await iosFieldText(lazy);
    } catch (e) {
      lastError = e;
      await driver.pause(STALE_RETRY);
    }
  }
  const detail = lastError instanceof Error ? ` (${lastError.message})` : "";
  throw new Error(
    `iosWriteNote: could not write "${text}" into "${label}" after 3 attempts${detail}`,
  );
}

/**
 * iOS twin of typeIntoTaggedField: click the tagged field to focus, clear
 * any existing content, type via addValue, verify via iosFieldText, retry
 * the whole sequence up to 3 times on a fresh query (same contract as the
 * Android helper).
 *
 * Spike evidence driving the design:
 *  - addValue after a focus click lands the text (the Compose editor accepts
 *    WDA typeText); `setValue` APPENDS instead of replacing on this build,
 *    so it is not used;
 *  - clearing uses element.clear() on the inner editor, with a backspace-key
 *    fallback (repeat \uE003) for the case clear() races the composition;
 *  - verification is mandatory: the field live-formats currency ("254000"
 *    renders "Rp 254.000"), so callers of amount fields pass 'digits'.
 */
export async function iosTypeIntoTaggedField(
  field: ChainablePromiseElement,
  text: string,
  label = "tagged field",
  verify: FieldVerify = "exact",
): Promise<void> {
  const landedOk =
    verify === "digits"
      ? (held: string) => held.replace(/\D/g, "") === text.replace(/\D/g, "")
      : (held: string) => held === text;
  const selector = String(await Promise.resolve(field.selector));
  let landed = "";
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // Keep the chainable LAZY — never pin a resolved element. The focus
      // click opens the keyboard, which resizes the layout and recomposes
      // the Compose tree; an elementId captured before the click dies with
      // it ("No matches found for Identity Binding" law from TC-NAV) and
      // addValue on the stale handle no-ops silently. Every command below
      // re-resolves through the chainable, exactly like the working spike.
      const lazy = $(selector);
      await lazy.waitForExist({ timeout: COMPOSITION_WAIT });
      await lazy.click();
      const current = await iosFieldText(lazy).catch(() => "");
      if (current.length > 0) {
        // Clear the editor node (the wrapper itself is not editable); the
        // keyboard backspace key is the fallback (WDA maps \uE003).
        const editor = await iosFieldEditor(lazy);
        await editor?.clearValue().catch(() => undefined);
        const afterClear = await iosFieldText(lazy).catch(() => "");
        if (afterClear.length > 0) {
          await lazy.addValue("\uE003".repeat(afterClear.length + 2));
        }
      }
      await lazy.addValue(text);
      // Dismiss the keyboard so it cannot cover the save button or sheet
      // taps that follow; iOS has no system back to do it implicitly.
      await iosDismissKeyboard();
      landed = await iosFieldText(lazy).catch(() => "");
      if (landedOk(landed)) return;
      lastError = null;
    } catch (e) {
      lastError = e;
      await driver.pause(STALE_RETRY);
    }
  }
  if (lastError) throw lastError;
  throw new Error(
    `iosTypeIntoTaggedField: "${label}" holds "${landed}" instead of "${text}" after 3 attempts`,
  );
}
