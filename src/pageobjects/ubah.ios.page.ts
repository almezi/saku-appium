import { iosByTag } from '../helpers/locators'
import { tags } from '../config/tags'
import { BaseIosPage } from './base.ios.page'
import type { DaftarIosPage } from './daftar.ios.page'

/**
 * Ubah transaksi (edit) on iOS. Shares its form fields with Tambah — the
 * form component is one and the same, so amount/category/note/account reads
 * live on the TambahIosPage against tags.tambah.
 *
 * tapBack() taps the header's back button (`component_button_back`) — the
 * platform-equivalent of Android's toolbar back; iOS has no system BACK to
 * press (same adaptation as TC-NAV-06).
 */
export class UbahIosPage extends BaseIosPage {
  constructor() {
    super(tags.ubah.screen)
  }

  /** Opens the edit screen from the Transaksi list via the row's edit affordance. */
  async openFromDaftar(daftar: DaftarIosPage, categoryId: string): Promise<void> {
    await daftar.tapEdit(categoryId)
    await this.waitForScreen()
  }

  /** Leaving without saving returns to the Transaksi list. */
  async tapBack(): Promise<void> {
    await super.tapBack()
    await iosByTag(tags.daftar.screen).waitForDisplayed({ timeout: 15_000 })
  }
}
