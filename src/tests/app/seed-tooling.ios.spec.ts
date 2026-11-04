/**
 * TC-SEED — Debug Tooling & Seeding (iOS). Catalogue cases live in
 * test-cases-simple-money-tracker.md. Android twin: seed-tooling.spec.ts.
 * Parked: needs app-side `test_seed` / `test_now` intent extras (not present).
 */
import { iosByTag } from "../../helpers/locators";
import { tags } from "../../config/tags";
import { APP_COLD_START } from "../../config/timeouts";

describe("TC-SEED — Debug Tooling & Seeding @regression", () => {
  before(async () => {
    await expect(iosByTag(tags.tambah.screen)).toBeDisplayed({ wait: APP_COLD_START });
  });

  it("TC-SEED-01 Launch with intent extra `test_seed = seed_empty` → database initialized empty @regression", async function () {
    this.skip();
  });

  it("TC-SEED-02 Launch with `test_seed = seed_month_mixed` → loads mixed data per specification @regression", async function () {
    this.skip();
  });

  it("TC-SEED-03 Launch with `test_seed = seed_excluded_categories` → loads special categories (Transfer, Tabungan, Investasi) @regression", async function () {
    this.skip();
  });

  it("TC-SEED-04 Launch with `test_seed = seed_month_boundaries` → data at start & end of month tested @regression", async function () {
    this.skip();
  });

  it("TC-SEED-05 Launch with `test_seed = seed_same_day_ordering` → same-day transaction ordering by created time tested @regression", async function () {
    this.skip();
  });

  it("TC-SEED-06 Launch with intent extra `test_now = 2026-09-15T10:00` → app uses injected fake clock @regression", async function () {
    this.skip();
  });

  it("TC-SEED-07 Verify release build is clean of debug seeding hooks @regression", async function () {
    this.skip();
  });
});
