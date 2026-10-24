/**
 * Test tag contract, mirroring TestTags.kt in the app repo
 * (composeApp/src/commonMain/kotlin/id/almezi/simplemoneytracker_kt/TestTags.kt).
 *
 * Locator rule (TESTABILITY.md): never locate by visible text, only by test
 * tag. On Android the app sets testTagsAsResourceId, so every tag surfaces as
 * a bare resource-id (for example `tambah_button_save`) and is resolved with
 * a UiAutomator2 resourceId selector.
 *
 * Keep this file in sync with TestTags.kt only; never invent tags here.
 */
export const tags = {
  // App shell
  loadingScreen: 'loading_screen',

  // Bottom navigation
  navBottom: 'component_nav_bottom',
  navTambah: 'component_nav_bottom_tambah',
  navDaftar: 'component_nav_bottom_daftar',
  navRingkasan: 'component_nav_bottom_ringkasan',

  // Tambah (add transaction)
  tambah: {
    screen: 'tambah_screen',
    header: 'tambah_header',
    toggleType: 'tambah_toggle_type',
    toggleIncome: 'tambah_toggle_type_0',
    toggleExpense: 'tambah_toggle_type_1',
    inputAmount: 'tambah_input_amount',
    categoryPager: 'tambah_category_pager',
    // The category sheet root reuses the bare item tag (TransactionForm.kt
    // passes TAMBAH_CATEGORY_ITEM as the sheet testTag); rows carry _<id>.
    categorySheetRoot: 'tambah_category_item',
    categoryItem: (categoryId: string) => `tambah_category_item_${categoryId}`,
    categorySearch: 'tambah_category_search',
    categorySearchEmpty: 'tambah_category_search_empty',
    linkKelolaKategori: 'tambah_link_kelola_kategori',
    selectAccount: 'tambah_select_account',
    selectDate: 'tambah_select_date',
    sheetAccount: 'tambah_sheet_account',
    accountItem: (accountId: string) => `tambah_account_item_${accountId}`,
    inputNote: 'tambah_input_note',
    helper: 'tambah_helper',
    buttonSave: 'tambah_button_save',
    errorAmount: 'tambah_error_amount',
    errorCategory: 'tambah_error_category',
    datePicker: 'tambah_date_picker',
    datePickerOk: 'tambah_date_picker_ok',
    datePickerCancel: 'tambah_date_picker_cancel',
  },

  // Daftar (transaction list)
  daftar: {
    screen: 'daftar_screen',
    monthSwitcher: 'daftar_month_switcher',
    monthPrev: 'daftar_month_switcher_prev',
    monthLabel: 'daftar_month_switcher_label',
    monthNext: 'daftar_month_switcher_next',
    monthPicker: 'daftar_month_picker',
    backupButton: 'daftar_backup_button',
    // Root of the delete-confirmation sheet (verified live: the shared
    // `component_sheet_bottom` root claimed by TESTABILITY.md does not exist
    // in the v2.2 APK — each screen scopes its own sheet root).
    deleteSheet: 'daftar_delete_sheet',
    summaryMasuk: 'daftar_summary_masuk',
    summaryKeluar: 'daftar_summary_keluar',
    item: (transactionId: string) => `daftar_item_${transactionId}`,
    /** Any transaction row, matched by regex. */
    itemAny: 'daftar_item_*',
    dayHeaderAny: 'daftar_day_header_*',
    emptyState: 'daftar_empty_state',
  },

  // Ringkasan (summary)
  ringkasan: {
    screen: 'ringkasan_screen',
    monthSwitcher: 'ringkasan_month_switcher',
    monthPrev: 'ringkasan_month_switcher_prev',
    monthLabel: 'ringkasan_month_switcher_label',
    monthNext: 'ringkasan_month_switcher_next',
    totalsCardIncome: 'ringkasan_totals_card_income',
    totalsCardExpense: 'ringkasan_totals_card_expense',
    balanceCard: 'ringkasan_balance_card',
    balanceValue: 'ringkasan_balance_value',
    savingsRow: 'ringkasan_savings_row',
    savingsValue: 'ringkasan_savings_value',
    anggaranButton: 'ringkasan_anggaran_button',
    kelolaButton: 'ringkasan_kelola_button',
    comparison: 'ringkasan_comparison',
    breakdownIncome: 'ringkasan_breakdown_income',
    breakdownExpense: 'ringkasan_breakdown_expense',
    categoryItem: (categoryId: string) => `ringkasan_category_item_${categoryId}`,
    emptyState: 'ringkasan_empty_state',
    emptyAction: 'ringkasan_empty_action',
  },

  // Ubah transaksi (edit transaction)
  ubah: {
    screen: 'ubah_screen',
    header: 'ubah_header',
    buttonSave: 'ubah_button_save',
    buttonDelete: 'ubah_button_delete',
    deleteSheet: 'ubah_delete_sheet',
  },

  // Shared components
  component: {
    sheetBottom: 'component_sheet_bottom',
    sheetConfirm: 'component_sheet_button_confirm',
    sheetCancel: 'component_sheet_button_cancel',
    buttonPrimary: 'component_button_primary',
    buttonSecondary: 'component_button_secondary',
    buttonDestructive: 'component_button_destructive',
    buttonTextDanger: 'component_button_text_danger',
    buttonBack: 'component_button_back',
    toast: 'component_toast',
    toastAction: 'component_toast_action',
    fieldSearch: 'component_field_search',
    emptyState: 'component_state_empty',
  },

  /** Edit/delete affordances live on the transaction card, tagged `<card>_edit_<categoryId>`. */
  cardEdit: (transactionId: string, categoryId: string) => `daftar_item_${transactionId}_edit_${categoryId}`,
  cardDelete: (transactionId: string, categoryId: string) => `daftar_item_${transactionId}_delete_${categoryId}`,
} as const
