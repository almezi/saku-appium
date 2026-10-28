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
  // Bottom navigation
  navBottom: "component_nav_bottom",
  navTambah: "component_nav_bottom_tambah",
  navDaftar: "component_nav_bottom_daftar",
  navRingkasan: "component_nav_bottom_ringkasan",

  // Tambah (add transaction)
  tambah: {
    screen: "tambah_screen",
    header: "tambah_header",
    toggleType: "tambah_toggle_type",
    toggleIncome: "tambah_toggle_type_0",
    toggleExpense: "tambah_toggle_type_1",
    inputAmount: "tambah_input_amount",
    categoryPager: "tambah_category_pager",
    // The category sheet root reuses the bare item tag (TransactionForm.kt
    // passes TAMBAH_CATEGORY_ITEM as the sheet testTag); rows carry _<id>.
    categorySheetRoot: "tambah_category_item",
    categoryItem: (categoryId: string) => `tambah_category_item_${categoryId}`,
    // Selected-category marker inside the form's category pager
    // (verified live on the Ubah screen; absent when no category is set).
    categoryMark: (categoryId: string) => `mark_${categoryId}`,
    categorySearch: "tambah_category_search",
    categorySearchEmpty: "tambah_category_search_empty",
    linkKelolaKategori: "tambah_link_kelola_kategori",
    selectAccount: "tambah_select_account",
    selectDate: "tambah_select_date",
    sheetAccount: "tambah_sheet_account",
    accountItem: (accountId: string) => `tambah_account_item_${accountId}`,
    inputNote: "tambah_input_note",
    helper: "tambah_helper",
    buttonSave: "tambah_button_save",
    errorAmount: "tambah_error_amount",
    errorCategory: "tambah_error_category",
    datePicker: "tambah_date_picker",
    datePickerOk: "tambah_date_picker_ok",
    datePickerCancel: "tambah_date_picker_cancel",
  },

  // Daftar (transaction list)
  daftar: {
    screen: "daftar_screen",
    monthSwitcher: "daftar_month_switcher",
    monthPrev: "daftar_month_switcher_prev",
    monthLabel: "daftar_month_switcher_label",
    monthNext: "daftar_month_switcher_next",
    // Root of the delete-confirmation sheet (verified live: the shared
    // `component_sheet_bottom` root claimed by TESTABILITY.md does not exist
    // in the v2.2 APK — each screen scopes its own sheet root).
    deleteSheet: "daftar_delete_sheet",
    summaryMasuk: "daftar_summary_masuk",
    summaryKeluar: "daftar_summary_keluar",
    item: (transactionId: string) => `daftar_item_${transactionId}`,
    emptyState: "daftar_empty_state",
    // The empty list renders its own layout instead of the header strip: the
    // `daftar_backup_button` is absent there and its `onOpenBackup` action
    // moves to the empty state's secondary button (DaftarScreen.kt).
    emptyStatePrimary: "daftar_empty_state_primary",
    emptyStateSecondary: "daftar_empty_state_secondary",
  },

  // Ringkasan (summary)
  ringkasan: {
    screen: "ringkasan_screen",
    monthSwitcher: "ringkasan_month_switcher",
    monthPrev: "ringkasan_month_switcher_prev",
    monthLabel: "ringkasan_month_switcher_label",
    monthNext: "ringkasan_month_switcher_next",
    totalsCardIncome: "ringkasan_totals_card_income",
    totalsCardExpense: "ringkasan_totals_card_expense",
    balanceCard: "ringkasan_balance_card",
    balanceValue: "ringkasan_balance_value",
    savingsRow: "ringkasan_savings_row",
    savingsValue: "ringkasan_savings_value",
    anggaranButton: "ringkasan_anggaran_button",
    kelolaButton: "ringkasan_kelola_button",
    comparison: "ringkasan_comparison",
    breakdownIncome: "ringkasan_breakdown_income",
    breakdownExpense: "ringkasan_breakdown_expense",
    categoryItem: (categoryId: string) => `ringkasan_category_item_${categoryId}`,
    emptyState: "ringkasan_empty_state",
    emptyAction: "ringkasan_empty_action",
  },

  // Ubah transaksi (edit transaction)
  ubah: {
    screen: "ubah_screen",
    header: "ubah_header",
    buttonSave: "ubah_button_save",
    buttonDelete: "ubah_button_delete",
    deleteSheet: "ubah_delete_sheet",
  },

  // Cadangan (backup & export). v2.3 dropped six of the nine TESTABILITY.md
  // tags on BOTH platforms (verified live 2026-10-28: Pixel_10 / API 37 and
  // the iOS build) — only the daftar entry button and the two export cards
  // still render; the screen root, status card, import button, import
  // result/error and warning strip are resolved as rendered output by the
  // page objects (see bugs/BUG_Found_15.md).
  cadangan: {
    daftarEntryButton: "daftar_backup_button",
    exportCsv: "cadangan_export_csv",
    exportJson: "cadangan_export_json",
  },

  // Shared components
  component: {
    sheetConfirm: "component_sheet_button_confirm",
    sheetCancel: "component_sheet_button_cancel",
    buttonPrimary: "component_button_primary",
    buttonSecondary: "component_button_secondary",
    buttonDestructive: "component_button_destructive",
    buttonTextDanger: "component_button_text_danger",
    buttonBack: "component_button_back",
    toast: "component_toast",
    toastAction: "component_toast_action",
    fieldSearch: "component_field_search",
    // Type toggle on the Ubah (edit) screen — Tambah uses tambah_toggle_type_*.
    toggleSegmented: (index: 0 | 1) => `component_toggle_segmented_${index}`,
    emptyState: "component_state_empty",
  },

  /** Edit/delete affordances live on the transaction card, tagged `<card>_edit_<categoryId>`. */
  cardEdit: (transactionId: string, categoryId: string) =>
    `daftar_item_${transactionId}_edit_${categoryId}`,
  cardDelete: (transactionId: string, categoryId: string) =>
    `daftar_item_${transactionId}_delete_${categoryId}`,

  // Anggaran (budget) — tags that live only in Android's page object.
  // Move here when the iOS twin exposes the same surface (see S5).
  anggaran: {
    screen: "anggaran_screen",
    header: "anggaran_header",
    toggleBudget: "anggaran_toggle_budget",
    inputMonthlyLimit: "anggaran_input_monthly_limit",
    inputDescription: "anggaran_input_description",
    dateRange: "anggaran_date_range",
    categoryPager: "anggaran_category_pager",
    categoryItem: (categoryId: string) => `anggaran_category_item_${categoryId}`,
    categoryMark: (categoryId: string) => `mark_${categoryId}`,
    categorySearch: "anggaran_category_search",
    categorySearchEmpty: "anggaran_category_search_empty",
    buttonSave: "anggaran_button_save",
    totalCard: "anggaran_total_card",
    emptyState: "anggaran_empty_state",
    addButton: "anggaran_add_button",
    categorySheetRoot: "anggaran_category_item",
    categorySheetItem: (categoryId: string) => `anggaran_category_item_${categoryId}`,
    formScreen: "anggaran_form_screen",
    formCategory: "anggaran_form_category",
    formCategorySheet: "anggaran_form_category_sheet",
    formCategoryOption: (categoryId: string) => `anggaran_form_category_${categoryId}`,
    formLimit: "anggaran_form_limit",
    formSave: "anggaran_form_save",
    formDelete: "anggaran_form_delete",
    row: (categoryId: string) => `anggaran_row_${categoryId}`,
    rowEdit: (categoryId: string) => `anggaran_row_${categoryId}_edit`,
    rowDelete: (categoryId: string) => `anggaran_row_${categoryId}_delete`,
    deleteSheet: "anggaran_delete_sheet",
    screenDeleteSheet: "anggaran_screen_delete_sheet",
  },

  // Kategori (category management) — tags that live only in Android's page object.
  // Move here when the iOS twin exposes the same surface (see S5).
  kategori: {
    screen: "kategori_screen",
    header: "kategori_header",
    list: "kategori_list",
    row: (categoryId: string) => `kategori_row_${categoryId}`,
    rowEdit: (categoryId: string) => `kategori_row_${categoryId}_edit`,
    rowHide: (categoryId: string) => `kategori_row_${categoryId}_hide`,
    toggleIncome: 'kategori_toggle_type_0',
    toggleExpense: 'kategori_toggle_type_1',
    formScreen: "kategori_form_screen",
    formName: "kategori_form_name",
    formSave: "kategori_form_save",
    formCancel: "kategori_form_cancel",
    addButton: "kategori_add_button",
    deleteSheet: "kategori_delete_sheet",
    deleteButton: "kategori_delete_button",
  },
} as const;
