import { $$ } from '@wdio/globals'
import { iosByTag } from '../helpers/locators'
import {
  iosDismissKeyboard,
  iosFieldEditor,
  iosFieldText,
  iosKeyboardShown,
  iosTypeIntoTaggedField,
} from '../helpers/input'
import { tags } from '../config/tags'
import { kategoriTags } from './kategori.page'
import { BaseIosPage } from './base.ios.page'
import type { ChainablePromiseElement } from '../types'
import { KEY_RETURN_SETTLE, POLL_CADENCE, SHEET_CLOSE_SETTLE_QUICK, STALE_RETRY, STALE_RETRY_QUICK, SWIPE_ANIM } from '../config/settles'
import { COMPOSITION_WAIT, POLL_INTERVAL, SCREEN_READY, STATE_SYNC, SURFACE_DISMISS } from '../config/timeouts'

type Rect = { x: number; y: number; width: number; height: number }

function containsCenter(outer: Rect, inner: Rect): boolean {
  const cx = inner.x + inner.width / 2
  const cy = inner.y + inner.height / 2
  return (
    cx >= outer.x &&
    cx <= outer.x + outer.width &&
    cy >= outer.y &&
    cy <= outer.y + outer.height
  )
}

/** Eye-icon labels, verified live on iOS 27.0 (state is readable in both states). */
const EYE_HIDDEN = /Tampilkan/i
const EYE_VISIBLE = /Sembunyikan/i

/**
 * Flat list viewport, measured live: title/back to y=130, type toggle 150-198,
 * search field 206-254, and the LazyColumn body is its own node at y=268..816
 * (402×874 screen). Rows only exist as children of that node, and a row is
 * tappable only once its eye toggle sits inside the band.
 */
const LIST_TOP = 272
const LIST_BOTTOM_PAD = 60

/** Every category row composes exactly one eye toggle, top-to-bottom in tree order. */
const ROW_TOGGLES =
  '-ios predicate string: type == "XCUIElementTypeButton" AND name BEGINSWITH "kategori_row_hide_"'

/**
 * Kelola kategori on iOS — accessibility-id twin of KategoriPage, driven by
 * the same tag contract (testTag -> accessibilityIdentifier). Every tag used
 * here was verified live on the iPhone 18 Pro simulator (iOS 27.0) on
 * 2026-10-27; method names mirror the Android page.
 *
 * iOS behaviors baked into this port:
 *  - default categories render ONLY the eye toggle: the pencil and trash are
 *    composed only for `!row.isDefault` (KelolaKategoriScreen.kt), so the
 *    rename/delete flows need a custom category created through the
 *    "Tambah kategori" form (its row id is runtime-generated `cus_pem_<ms>`);
 *  - a row's testTag lands on an EMPTY Other; its name/caption are hoisted to
 *    siblings inside the list, so row text is read by geometry (center inside
 *    the row's rect), same class of read as AnggaranIosPage;
 *  - the row CONTAINER node disappears from the tree while the row sits
 *    clipped under the search field (~y < 268), while its action buttons stay
 *    composed — so scrolling and visibility checks anchor on the eye button
 *    and require the row to be inside the list viewport, not merely in the
 *    tree. That viewport is small (y 268..816 of a 402×874 screen), so swipes
 *    must both start and end inside it: a swipe starting in the sticky header
 *    band does not scroll the list at all;
 *  - the eye toggle's label flips between "Sembunyikan kategori" / "Tampilkan
 *    kategori"; a tap that lands while the list is settling can be swallowed,
 *    so hiding verifies the label and re-clicks from a fresh read;
 *  - the rename dialog is a Compose AlertDialog INSIDE the main tree (unlike
 *    the empty bottom sheets): its field/buttons are tagged, the field is
 *    PREFILLED with the custom name, and the keyboard shifts the dialog up
 *    ~145 px instead of dismissing it;
 *  - there is no system BACK: leaving taps `component_button_back`.
 */
export class KategoriIosPage extends BaseIosPage {
  constructor() {
    super(kategoriTags.screen)
  }

  get addButton(): ChainablePromiseElement {
    return iosByTag(kategoriTags.addButton)
  }

  get addFormScreen(): ChainablePromiseElement {
    return iosByTag(kategoriTags.formScreen)
  }

  get formName(): ChainablePromiseElement {
    return iosByTag(kategoriTags.formName)
  }

  get formSave(): ChainablePromiseElement {
    return iosByTag(kategoriTags.formSave)
  }

  get formCancel(): ChainablePromiseElement {
    return iosByTag(kategoriTags.formCancel)
  }

  row(categoryId: string): ChainablePromiseElement {
    return iosByTag(kategoriTags.row(categoryId))
  }

  /** Eye toggle — the row's always-composed anchor node. */
  rowHide(categoryId: string): ChainablePromiseElement {
    return iosByTag(kategoriTags.rowHide(categoryId))
  }

  rowEdit(categoryId: string): ChainablePromiseElement {
    return iosByTag(kategoriTags.rowEdit(categoryId))
  }

  mark(categoryId: string): ChainablePromiseElement {
    return iosByTag(`mark_${categoryId}`)
  }

  async openFromRingkasan(): Promise<void> {
    await iosByTag(tags.ringkasan.kelolaButton).click()
    await this.waitForScreen()
  }

  async openFromTambah(): Promise<void> {
    await iosByTag(tags.tambah.linkKelolaKategori).click()
    await this.waitForScreen()
  }

  async selectType(type: 'pemasukan' | 'pengeluaran'): Promise<void> {
    await iosByTag(type === 'pemasukan' ? kategoriTags.toggleIncome : kategoriTags.toggleExpense).click()
  }

  /**
   * Types into the shared search field; the list filters live by name.
   * Clearing goes through its own path: WDA's addValue rejects an empty
   * string, so the filter is removed by clearing the editor node directly.
   */
  async search(query: string): Promise<void> {
    const field = iosByTag(tags.component.fieldSearch)
    if (query.length > 0) {
      await iosTypeIntoTaggedField(field, query, tags.component.fieldSearch)
      return
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await iosFieldText(field).catch(() => '')
      if (current.length === 0) return
      await field.click()
      const editor = await iosFieldEditor(field)
      await editor?.clearValue().catch(() => undefined)
      const afterClear = await iosFieldText(field).catch(() => '')
      if (afterClear.length > 0) {
        await (editor ?? field).addValue('\uE003'.repeat(afterClear.length + 2))
      }
      await iosDismissKeyboard()
    }
    throw new Error('kategori search field never cleared')
  }

  /**
   * Count of category rows sitting inside the list viewport, measured by their
   * eye toggles (one per row, and the tag prefix `kategori_row_(hide|edit|
   * delete)_` can never collide with a container id). Rows the LazyColumn still
   * composes beyond the band are skipped, so the count matches what a user sees.
   */
  async categoryRowCount(): Promise<number> {
    const toggles = await $$(ROW_TOGGLES)
    const { height } = await driver.getWindowSize()
    let count = 0
    for (const toggle of toggles) {
      const rect = await this.rectOf(toggle).catch(() => null)
      if (rect && rect.y >= LIST_TOP && rect.y + rect.height <= height - LIST_BOTTOM_PAD) count++
    }
    return count
  }

  /**
   * Scrolls the list until `categoryId`'s row sits inside the viewport band.
   * Sweeping blindly does not work here: the whole list is only a few swipes
   * long, so a fixed comb parks the target under the sticky header (where its
   * container node is pruned) or past the fold, and — worse — a content-down
   * swipe that STARTS in the header band never scrolls at all (verified live:
   * finger 262→611 leaves the list untouched, 350→700 scrolls it). So the
   * direction is chosen from the row's own rect and flipped whenever a swipe
   * moves nothing, which is what tells "pinned at the end of the list" apart
   * from "the other end of the list" for a row that is not composed at all.
   */
  async scrollToRow(categoryId: string): Promise<void> {
    let direction: 'up' | 'down' = 'up'
    let lastTop = await this.topRowY()
    for (let step = 0; step < 30; step++) {
      const state = await this.rowState(categoryId)
      if (state === 'inView') return
      if (state === 'above') direction = 'down'
      else if (state === 'below') direction = 'up'
      await this.swipeContent(direction)
      const top = await this.topRowY()
      if (top === lastTop) direction = direction === 'up' ? 'down' : 'up'
      lastTop = top
    }
    throw new Error(`kategori row ${categoryId} never settled inside the list viewport`)
  }

  /**
   * Rendered texts of a category row (name, "Bawaan/Buatan sendiri · N
   * transaksi"). The row's testTag lands on an EMPTY Other and the texts are
   * hoisted to siblings inside the list, so they are read by geometry:
   * every static text whose center falls inside the row's measured rect.
   */
  async rowText(categoryId: string): Promise<string> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.scrollToRow(categoryId)
        const row = this.row(categoryId)
        if (!(await row.isExisting().catch(() => false))) {
          // Container pruned at the list edge — nudge content down and retry.
          await this.swipeContent('down')
          continue
        }
        const texts = await this.textsInside(await this.rectOf(row))
        if (texts.length > 0) return texts.join(' ')
      } catch {
        // Stale handle mid-recompose — settle and re-query.
      }
      await driver.pause(STALE_RETRY_QUICK)
    }
    throw new Error(`kategori row "${categoryId}" rendered no text on iOS`)
  }

  /** True while the category is hidden (eye shows "Tampilkan kategori"). */
  async isHidden(categoryId: string): Promise<boolean> {
    const toggle = this.rowHide(categoryId)
    for (let attempt = 0; attempt < 10; attempt++) {
      const label = ((await toggle.getAttribute('label').catch(() => '')) || '').trim()
      if (EYE_HIDDEN.test(label)) return true
      if (EYE_VISIBLE.test(label)) return false
      await driver.pause(POLL_CADENCE)
    }
    throw new Error(`eye state unreadable for kategori row "${categoryId}"`)
  }

  /**
   * Drives the eye toggle to `hidden` and verifies it, re-reading before each
   * retry so a swallowed tap can never flip the state twice. Left behind by
   * live verification: one tap on the row's toggle was lost while the list
   * settled, the label never changed, and a blind retry would have reverted
   * the write.
   */
  async setHidden(categoryId: string, hidden: boolean): Promise<void> {
    await this.scrollToRow(categoryId)
    for (let attempt = 0; attempt < 3; attempt++) {
      if ((await this.isHidden(categoryId)) !== hidden) {
        await this.rowHide(categoryId).click()
      }
      try {
        await driver.waitUntil(async () => (await this.isHidden(categoryId)) === hidden, {
          timeout: STATE_SYNC,
          interval: POLL_INTERVAL,
        })
        return
      } catch {
        await this.scrollToRow(categoryId)
      }
    }
    throw new Error(`kategori row "${categoryId}" never reached hidden=${hidden}`)
  }

  /** Opens the "Tambah kategori" form (the row pencil/trash need a custom row). */
  async openAddForm(): Promise<void> {
    // The button is the LazyColumn's last item — below the default rows — so
    // walk the list to the end before tapping it.
    let lastTop = await this.topRowY()
    for (let step = 0; step < 20; step++) {
      if (await this.addButtonInView()) break
      await this.swipeContent('up')
      const top = await this.topRowY()
      if (top === lastTop) throw new Error('kategori add button never entered the list viewport')
      lastTop = top
    }
    await this.addButton.click()
    await this.addFormScreen.waitForDisplayed({ timeout: SCREEN_READY })
  }

  /**
   * Creates a custom category through the Tambah kategori form and waits for
   * the list again. Returns the id derived from the new row, since the app
   * generates it at runtime (`cus_pem_<epochMs>`).
   */
  async createCategory(name: string): Promise<string> {
    await this.openAddForm()
    await iosTypeIntoTaggedField(this.formName, name, kategoriTags.formName)
    await this.formSave.click()
    await this.addFormScreen.waitForExist({ timeout: SCREEN_READY, reverse: true })
    await this.waitForScreen()
    return this.findCustomCategoryId()
  }

  /**
   * Id of the newest custom category row. Reads the eye toggle (always
   * composed for a rendered row) and strips the row-action prefix; swipes the
   * list when the new row starts out below the fold.
   */
  async findCustomCategoryId(): Promise<string> {
    for (let step = 0; step < 12; step++) {
      const toggles = await $$(
        '-ios predicate string: type == "XCUIElementTypeButton" AND ' +
          'name BEGINSWITH "kategori_row_hide_cus_"',
      )
      if (toggles[0]) {
        const name = String(await toggles[0].getAttribute('name'))
        return name.replace('kategori_row_hide_', '')
      }
      await this.swipeContent('up')
    }
    throw new Error('custom kategori row never appeared in the list')
  }

  async openEditDialog(categoryId: string): Promise<void> {
    await this.scrollToRow(categoryId)
    await this.rowEdit(categoryId).click()
    await this.formName.waitForDisplayed({ timeout: COMPOSITION_WAIT })
  }

  /** Rendered value of the open rename dialog's field (prefilled on iOS). */
  async renameFieldText(): Promise<string> {
    return iosFieldText(this.formName)
  }

  /**
   * Types a replacement name into the open rename dialog (empty string
   * clears it). Does NOT reuse the shared iOS typing helper: that one
   * dismisses the keyboard by tapping the dead zone at y=30, which here is
   * the AlertDialog's scrim — the tap would dismiss the dialog (verified
   * live). The Return IME action closes the keyboard without touching the
   * scrim, and the editable TextView is targeted directly (it is the wrapper's
   * sibling, not its child).
   */
  async typeRename(name: string): Promise<void> {
    let landed = ''
    let lastError: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.formName.waitForExist({ timeout: COMPOSITION_WAIT })
        await this.formName.click()
        const current = await iosFieldText(this.formName).catch(() => '')
        if (current.length > 0) {
          const editor = await iosFieldEditor(this.formName)
          await editor?.clearValue().catch(() => undefined)
          const afterClear = await iosFieldText(this.formName).catch(() => '')
          if (afterClear.length > 0) {
            await (editor ?? this.formName).addValue('\uE003'.repeat(afterClear.length + 2))
          }
        }
        if (name.length > 0) {
          const editor = (await iosFieldEditor(this.formName)) ?? this.formName
          await editor.addValue(name)
        }
        await this.closeDialogKeyboard()
        landed = await iosFieldText(this.formName).catch(() => '')
        if (landed === name) return
        lastError = null
      } catch (e) {
        lastError = e
        await driver.pause(STALE_RETRY)
      }
    }
    if (lastError) throw lastError
    throw new Error(`Rename field holds "${landed}" instead of "${name}" after 3 attempts`)
  }

  /** Taps "Ubah" (save) — does NOT wait for dismissal (an empty name keeps it open). */
  async saveRename(): Promise<void> {
    await this.closeDialogKeyboard()
    await this.formSave.click()
  }

  /** Cancels the dialog and waits for it to disappear. */
  async cancelRename(): Promise<void> {
    await this.closeDialogKeyboard()
    await this.formCancel.click()
    await this.formName.waitForExist({ timeout: SURFACE_DISMISS, reverse: true })
  }

  /** Waits until the rename dialog closes (successful save). */
  async waitForDialogClosed(): Promise<void> {
    await this.formName.waitForExist({ timeout: SURFACE_DISMISS, reverse: true })
  }

  /**
   * Dismisses a bottom sheet by tapping the scrim above it. iOS has no system
   * BACK and the picker sheet has no cancel button.
   */
  async dismissSheet(rootTag: string): Promise<void> {
    const { width } = await driver.getWindowSize()
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: Math.floor(width / 2), y: 120 },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await driver.pause(SHEET_CLOSE_SETTLE_QUICK)
    await iosByTag(rootTag).waitForExist({ timeout: SURFACE_DISMISS, reverse: true })
  }

  /**
   * Closes the software keyboard from inside the AlertDialog. The Return IME
   * action is used instead of the shared dead-zone tap because y=30 is the
   * dialog's scrim — tapping it dismisses the dialog (verified live).
   */
  private async closeDialogKeyboard(): Promise<void> {
    if (!(await iosKeyboardShown().catch(() => false))) return
    await driver.performActions([
      {
        type: 'key',
        id: 'keyboard1',
        actions: [
          { type: 'keyDown', value: '\n' },
          { type: 'keyUp', value: '\n' },
        ],
      },
    ])
    await driver.pause(KEY_RETURN_SETTLE)
  }

  /**
   * Where the row sits relative to the list viewport. 'absent' means the
   * LazyColumn has disposed it (or pruned its action nodes) — which end of the
   * list it is at cannot be read from the tree, only inferred by scrolling.
   */
  private async rowState(categoryId: string): Promise<'inView' | 'above' | 'below' | 'absent'> {
    const toggle = this.rowHide(categoryId)
    if (!(await toggle.isExisting().catch(() => false))) return 'absent'
    const rect = await this.rectOf(toggle).catch(() => null)
    if (!rect) return 'absent'
    const { height } = await driver.getWindowSize()
    if (rect.y < LIST_TOP) return 'above'
    if (rect.y + rect.height > height - LIST_BOTTOM_PAD) return 'below'
    return 'inView'
  }

  /**
   * y of the topmost composed row, used as the list's scroll fingerprint: if a
   * swipe leaves it unchanged the list did not move, i.e. it is already pinned
   * at that end. The first three toggles in tree order are enough for that and
   * keep the per-swipe cost at three round trips.
   */
  private async topRowY(): Promise<number | null> {
    const toggles = await $$(ROW_TOGGLES)
    let top: number | null = null
    let seen = 0
    for (const toggle of toggles) {
      if (seen++ >= 3) break
      const rect = await this.rectOf(toggle).catch(() => null)
      if (!rect) continue
      if (top === null || rect.y < top) top = rect.y
    }
    return top
  }

  /** True once the "Tambah kategori" button can actually be tapped. */
  private async addButtonInView(): Promise<boolean> {
    const rect = await this.rectOf(this.addButton).catch(() => null)
    if (!rect) return false
    const { height } = await driver.getWindowSize()
    return rect.y >= LIST_TOP && rect.y + rect.height <= height - LIST_BOTTOM_PAD
  }

  /**
   * One raw-touch swipe of the list content (~32 % of the screen). Both ends of
   * the gesture stay inside the list viewport on purpose: a swipe that STARTS
   * in the sticky header band (search field / type toggle) scrolls nothing at
   * all, which is what silently broke the earlier content-down return sweep.
   */
  private async swipeContent(direction: 'up' | 'down'): Promise<void> {
    const { width, height } = await driver.getWindowSize()
    const x = Math.floor(width / 2)
    const near = Math.floor(height * 0.4)
    const far = Math.floor(height * 0.72)
    const yStart = direction === 'up' ? far : near
    const yEnd = direction === 'up' ? near : far
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x, y: yStart },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 150 },
          { type: 'pointerMove', duration: 500, x, y: yEnd },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ])
    await driver.pause(SWIPE_ANIM)
  }

  /** Static texts whose centers fall inside `rect`, top-to-bottom then left-to-right. */
  private async textsInside(rect: Rect): Promise<string[]> {
    const nodes = await $$('-ios predicate string: type == "XCUIElementTypeStaticText"')
    const found: { y: number; x: number; text: string }[] = []
    for (const node of nodes) {
      const inner = await this.rectOf(node).catch(() => null)
      if (!inner || !containsCenter(rect, inner)) continue
      const text = ((await node.getText()) || '').trim()
      if (text) found.push({ y: inner.y, x: inner.x, text })
    }
    return found.sort((a, b) => a.y - b.y || a.x - b.x).map((entry) => entry.text)
  }

  private async rectOf(el: Pick<ChainablePromiseElement, 'getLocation' | 'getSize'>): Promise<Rect> {
    const { x, y } = await el.getLocation()
    const { width, height } = await el.getSize()
    return { x, y, width, height }
  }
}
