import { byTag, allByTagMatches } from "../helpers/locators";
import { tags } from "../config/tags";
import { extractChildTexts } from "../helpers/elements";
import { BasePage } from "./base.page";
import { typeIntoTaggedField, setValueIntoTaggedField } from "../helpers/input";
import type { ChainablePromiseElement } from "../types";
import { SWIPE_ANIM } from "../config/settles";
import { ELEMENT_PRESENT, ELEMENT_PRESENT_QUICK } from "../config/timeouts";

/**
 * Test tags for the Kelola kategori screen, from TESTABILITY.md ("Kelola
 * kategori" section). They live here instead of config/tags.ts only because
 * that file is frozen for Phase 1; the values mirror TestTags.kt exactly.
 *
 * Row suffix format follows the locator map in
 * test-cases-simple-money-tracker.md: `kategori_row_{type}_{slug}` — the
 * category id itself (`inc_salary`) already carries type and slug, so the row
 * tag is `kategori_row_<categoryId>` and the row actions are prefixed.
 */
export const kategoriTags = {
  screen: "kategori_screen",
  toggleType: "kategori_toggle_type",
  toggleIncome: "kategori_toggle_type_0",
  toggleExpense: "kategori_toggle_type_1",
  row: (categoryId: string) => `kategori_row_${categoryId}`,
  rowEdit: (categoryId: string) => `kategori_row_edit_${categoryId}`,
  rowHide: (categoryId: string) => `kategori_row_hide_${categoryId}`,
  rowDelete: (categoryId: string) => `kategori_row_delete_${categoryId}`,
  addButton: "kategori_add_button",
  deleteSheet: "kategori_delete_sheet",
  // "Tambah kategori" (new-category) screen; the rename dialog shares the
  // form name/save/cancel tags but not this root.
  formScreen: "kategori_form_screen",
  // Rename dialog (verified live): tagged field and buttons, no text
  // fallbacks needed despite being a Compose dialog.
  formName: "kategori_form_name",
  formSave: "kategori_form_save",
  formCancel: "kategori_form_cancel",
} as const;

/**
 * Kelola kategori screen, reached from Ringkasan (`ringkasan_kelola_button`)
 * or from the Tambah form (`tambah_link_kelola_kategori`). Search uses the
 * shared `component_field_search` design-system tag.
 *
 * The "Ubah kategori" dialog is a Compose dialog with no test tags
 * (test-cases-simple-money-tracker.md locator map), so the dialog input and
 * "Batal"/"Ubah" buttons use text locators — the documented fallback.
 */
export class KategoriPage extends BasePage {
  constructor() {
    super(kategoriTags.screen);
  }

  row(categoryId: string): ChainablePromiseElement {
    return byTag(kategoriTags.row(categoryId));
  }

  /** The row's color mark square (verified live: a 32×32 px child of the row). */
  mark(categoryId: string): ChainablePromiseElement {
    return byTag(`mark_${categoryId}`);
  }

  /** "Ubah kategori" dialog name field (dialog is fully tagged on build v2.2). */
  get formName(): ChainablePromiseElement {
    return byTag(kategoriTags.formName);
  }

  get formSave(): ChainablePromiseElement {
    return byTag(kategoriTags.formSave);
  }

  get formCancel(): ChainablePromiseElement {
    return byTag(kategoriTags.formCancel);
  }

  /**
   * Scrolls the LazyColumn until `categoryId`'s row is composed AND fully
   * visible. UiScrollable scrollIntoView is unreliable over this list — rows
   * compose/uncompose mid-fling and the target can settle clipped at a
   * viewport edge (first wdio run failed TC-03/04 and TC-05 on exactly that)
   * — so this comb-searches with the suite's raw-touch swipe: check after
   * every step, sweep content-up first, then a content-down return sweep
   * catches anything stepped over.
   */
  async scrollToRow(categoryId: string): Promise<void> {
    const row = this.row(categoryId);
    if (await row.isDisplayed().catch(() => false)) return;
    for (let sweep = 0; sweep < 2; sweep++) {
      const direction = sweep === 0 ? "up" : "down";
      for (let step = 0; step < 12; step++) {
        if (await row.isDisplayed().catch(() => false)) return;
        await this.swipeList(direction as "up" | "down");
      }
    }
    throw new Error(`kategori row ${categoryId} never became fully visible`);
  }

  /**
   * One raw-touch swipe of the list content (~40 % of the screen). Raw W3C
   * actions, not `mobile: scrollGesture` (a silent no-op on Compose
   * LazyColumns here) and not UiScrollable (unreliable, see scrollToRow).
   */
  private async swipeList(direction: "up" | "down"): Promise<void> {
    const { width, height } = await driver.getWindowSize();
    const x = Math.floor(width / 2);
    const yStart = direction === "up" ? Math.floor(height * 0.7) : Math.floor(height * 0.3);
    const yEnd = direction === "up" ? Math.floor(height * 0.3) : Math.floor(height * 0.7);
    await driver.performActions([
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x, y: yStart },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: 150 },
          { type: "pointerMove", duration: 500, x, y: yEnd },
          { type: "pointerUp", button: 0 },
        ],
      },
    ]);
    await driver.pause(SWIPE_ANIM);
  }

  /**
   * Rendered texts of a category row (name, "Bawaan"/"Buatan sendiri",
   * transaction count). The row is a Compose container that aggregates no
   * text itself, so its child TextViews are read and joined — same pattern
   * as daftar.rowTexts / anggaran.rowText.
   */
  async rowText(categoryId: string): Promise<string> {
    await this.scrollToRow(categoryId);
    return (await extractChildTexts(this.row(categoryId))).join(" ");
  }

  async openFromRingkasan(): Promise<void> {
    await byTag(tags.ringkasan.kelolaButton).click();
    await this.waitForScreen();
  }

  async openFromTambah(): Promise<void> {
    await byTag(tags.tambah.linkKelolaKategori).click();
    await this.waitForScreen();
  }

  /** Toggle between Pemasukan (income) and Pengeluaran (expense) lists. */
  async selectType(type: "pemasukan" | "pengeluaran"): Promise<void> {
    await byTag(
      type === "pemasukan" ? kategoriTags.toggleIncome : kategoriTags.toggleExpense,
    ).click();
  }

  /** Types into the shared search field; text filters the current tab by name. */
  async search(query: string): Promise<void> {
    await typeIntoTaggedField(byTag(tags.component.fieldSearch), query);
  }

  /**
   * Count of top-level category rows currently rendered in the active tab.
   * The negative lookahead skips the `kategori_row_edit_/hide_/delete_` action
   * nodes that share the row tag prefix.
   */
  async categoryRowCount(): Promise<number> {
    const rows = await allByTagMatches("kategori_row_(?!(edit|hide|delete)).*");
    return rows.length;
  }

  /** Opens the "Ubah kategori" dialog for `categoryId`. */
  async openEditDialog(categoryId: string): Promise<void> {
    // The expense list holds 27 rows; bring the row fully into view before
    // clicking or its action buttons may not be composed at all.
    await this.scrollToRow(categoryId);
    await byTag(kategoriTags.rowEdit(categoryId)).click();
    await byTag(kategoriTags.formName).waitForDisplayed({ timeout: ELEMENT_PRESENT });
  }

  /**
   * Renames the category in the open dialog. The write goes through
   * setValueIntoTaggedField — keyboard-free instrumentation setText —
   * because click-to-focus typing opened the keyboard, and the resulting
   * keyboard-resize recomposition dismissed the dialog mid-interaction on
   * every WDIO attempt (BUG_Found_04, 8 historical failures); the
   * keyboard-free write is the flow that works live via Appium MCP
   * set_value. The verify step throws if the text never lands, so Save
   * below only runs with the intended content. If the dialog was dismissed
   * before typing starts, it is reopened first.
   */
  async renameInDialog(categoryId: string, newName: string): Promise<void> {
    const field = byTag(kategoriTags.formName);
    if (!(await field.isExisting().catch(() => false))) {
      await this.openEditDialog(categoryId);
    }
    await setValueIntoTaggedField(field, newName, kategoriTags.formName);
    const save = byTag(kategoriTags.formSave);
    await save.waitForDisplayed({ timeout: ELEMENT_PRESENT_QUICK });
    await save.click();
    await save.waitForDisplayed({ reverse: true, timeout: ELEMENT_PRESENT_QUICK });
  }

  /** Hides (or, when hidden, shows) the category via the eye toggle. */
  async toggleHidden(categoryId: string): Promise<void> {
    await this.scrollToRow(categoryId);
    await byTag(kategoriTags.rowHide(categoryId)).click();
  }
}
