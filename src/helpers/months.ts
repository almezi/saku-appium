/**
 * Month-switcher label arithmetic for the daftar/ringkasan month switchers,
 * shared by the Android and iOS page objects.
 *
 * The switcher label renders a full Indonesian month name plus a four-digit
 * year ("Oktober 2026" — recorded live in progress.md TC-BUDGET-02; UI_SPEC
 * §6.3: Ringkasan uses the same month switcher as Transaksi). Code review R1:
 * retrying until the label merely CHANGES passes a double-registered click,
 * so the switchers parse the label, step it, and require an exact
 * (month, year) match before returning.
 */

/** Full Indonesian month names as the switchers render them, indexed 0–11. */
export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/**
 * A parsed switcher label. `monthIndex` is 0-based (0 = Januari …
 * 11 = Desember), matching JS `Date` months so `shiftMonthYear` needs no
 * ±1 correction.
 */
export interface MonthYear {
  monthIndex: number;
  year: number;
}

// Whole-word guards so a name cannot match inside a longer token (e.g. a
// format change to "Oktober/2026" or an English fragment) — the year is
// matched separately below.
const MONTH_NAME_PATTERN = new RegExp(`(?<![A-Za-z])(${MONTH_NAMES.join("|")})(?![A-Za-z])`, "i");

const YEAR_PATTERN = /\b\d{4}\b/;

/**
 * "Oktober 2026" -> { monthIndex: 9, year: 2026 }. The month is matched as a
 * whole word (case-insensitive) and the year as a standalone four-digit run.
 */
export function parseMonthLabel(label: string): MonthYear {
  const nameMatch = MONTH_NAME_PATTERN.exec(label);
  const yearMatch = YEAR_PATTERN.exec(label);
  // A changed label format must fail loudly here rather than silently weaken
  // the switch assertions: an unparseable label would make every
  // target/actual month comparison vacuous.
  if (!nameMatch || !yearMatch) {
    throw new Error(
      `Month label "${label}" does not contain a full Indonesian month name and a four-digit year`,
    );
  }
  // Case-insensitive re-lookup against the tuple — the regex alternative that
  // matched IS one of these names, so this cannot miss.
  const name = nameMatch[1]?.toLowerCase() ?? "";
  const monthIndex = MONTH_NAMES.findIndex((candidate) => candidate.toLowerCase() === name);
  if (monthIndex === -1) {
    throw new Error(
      `Month label "${label}" does not contain a full Indonesian month name and a four-digit year`,
    );
  }
  const yearText = yearMatch[0] ?? "";
  return { monthIndex, year: Number.parseInt(yearText, 10) };
}

/** Steps a parsed label by one arrow click, rolling the year over at December/January. */
export function shiftMonthYear(my: MonthYear, direction: "prev" | "next"): MonthYear {
  if (direction === "next") {
    return my.monthIndex === 11
      ? { monthIndex: 0, year: my.year + 1 }
      : { monthIndex: my.monthIndex + 1, year: my.year };
  }
  return my.monthIndex === 0
    ? { monthIndex: 11, year: my.year - 1 }
    : { monthIndex: my.monthIndex - 1, year: my.year };
}

/** "{ monthIndex: 9, year: 2026 }" -> "Oktober 2026", for error messages. */
export function formatMonthYear(my: MonthYear): string {
  return `${MONTH_NAMES[my.monthIndex] ?? ""} ${my.year}`;
}
