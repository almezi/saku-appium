#!/usr/bin/env node
/**
 * Twin-parity gate — code_review.md finding M7.
 *
 * The harness keeps every screen twice (Android `X.page.ts` / iOS
 * `X.ios.page.ts`, `name.spec.ts` / `name.ios.spec.ts`) and the drift that
 * M1–M4 describe was invisible until someone read both files side by side.
 * This script makes it a build failure. It checks four invariants:
 *
 *   1. page-object surface — the public method/getter set of each twin pair
 *      matches (private/protected helpers and constructor do not count;
 *      members of either base class are unioned in, so an inherited or
 *      overridden name is never reported as a gap).
 *   2. test-case identity — within a platform, one `TC-<AREA>-<NN>` id names
 *      exactly one `it()` title (the M4 failure: TC-LIST-08 defined 8 times).
 *   3. spec-twin id sets — each Android/iOS spec pair shares a common id set
 *      (the M3 failure: TC-BUD vs TC-BUDGET, 0 shared ids), and a pair with
 *      ZERO shared ids always fails; it cannot be baselined away.
 *   4. twin files exist — every `X.spec.ts` has a `X.ios.spec.ts` and every
 *      screen page object has an iOS twin.
 *
 * Known drift is recorded in scripts/parity-baseline.json with a reason and
 * a ratchet: a NEW gap fails, and a gap that has been CLOSED but is still
 * listed also fails, so the baseline can only stay as long as the debt does.
 *
 * Deliberate limitations (documented rather than faked):
 *   - Titles are read textually, not executed. An `it()` inside a loop is ONE
 *      call site: `${id}`-built titles (transaction-list.spec.ts's bulk-seed
 *      chunks) resolve to no id here and are not counted. Interpolation
 *      expressions are stripped to "" first, which is what lets a literal
 *      `TC-LIST-08 … ${first}–${last}` repeat still register 7 duplicates.
 *   - Only `it`/`it.skip`-style call sites with a string or template literal
 *      first argument are scanned.
 *
 * Usage:
 *   node scripts/check_parity.mjs              # check (exit 1 on drift)
 *   node scripts/check_parity.mjs --update     # rewrite the baseline from
 *                                              # the current tree
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");
const BASELINE_PATH = join(ROOT, "scripts", "parity-baseline.json");

const ANDROID_BASE = "BasePage";
const IOS_BASE = "BaseIosPage";

/* ------------------------------------------------------------------ *
 * Parsing helpers
 * ------------------------------------------------------------------ */

function listFiles(dir, filter, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, filter, out);
    else if (filter(entry.name)) out.push(full);
  }
  return out.sort();
}

/** Path relative to the repo, with forward slashes (for messages/baseline). */
function rel(file) {
  return relative(ROOT, file)
    .split(/[\\/]+/)
    .join("/");
}

// An id is `TC-<AREA>-<NN>` with an optional one-letter suffix, and the AREA
// segment may itself contain digits — TC-A11Y-01 (accessibility.spec.ts). An
// `[A-Z]+` area silently skipped all 7 cases on both sides of that pair, which
// is how a gate can look green while ignoring a whole spec.
const ID_RE = /\bTC-[A-Z0-9]+-\d+[A-Za-z]?\b/;
const IT_RE = /\bit(?:\.\w+)*\(\s*(['"`])((?:[\s\S])*?)\1\s*,/g;

/** `${expr}` → '' so a template title still exposes its literal TC- id. */
function stripInterpolations(title) {
  return title.replace(/\$\{[^}]*\}/g, "");
}

/**
 * Every `TC-` id asserted by a `it()`/`it.skip()` title in `file`.
 * Returns {id, title, line} triples — line is where the case is defined.
 */
function idsInSpec(file) {
  const text = readFileSync(file, "utf8");
  const found = [];
  for (const match of text.matchAll(IT_RE)) {
    const title = stripInterpolations(match[2] ?? "");
    const id = title.match(ID_RE)?.[0];
    if (!id) continue;
    found.push({
      id,
      title: match[2].split("\n").join(" ").trim(),
      line: lineOf(text, match.index),
    });
  }
  return found;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

const NON_MEMBERS = new Set([
  "if",
  "for",
  "while",
  "switch",
  "catch",
  "return",
  "do",
  "else",
  "new",
  "function",
  "constructor",
]);
const MODIFIER_RE = /^(public|private|protected|static|readonly|async|get|set)\s+/;
const NAME_CALL_RE = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/;

/**
 * Parse one line as a class member declaration, or null.
 *
 * Indentation is NOT trusted: tambah.page.ts's selectCategory block is
 * indented 3 spaces instead of 2, and an indent-strict parser reported that as
 * a missing Android method. Instead a line counts when it carries a modifier
 * (`async`/`get`/…, which no statement begins with) or, for a bare
 * `name(args)` method, sits at exactly the class-body indent of 2 — the
 * narrower rule is safe there because a bare call at depth would otherwise
 * read as a member.
 */
function parseMember(line) {
  const indent = (line.match(/^ */) ?? [""])[0].length;
  if (indent < 2) return null;
  let rest = line.slice(indent);
  const modifiers = [];
  for (;;) {
    const m = rest.match(MODIFIER_RE);
    if (!m) break;
    modifiers.push(m[1]);
    rest = rest.slice(m[0].length);
  }
  const name = rest.match(NAME_CALL_RE)?.[1];
  if (!name || NON_MEMBERS.has(name)) return null;
  if (modifiers.length === 0 && indent !== 2) return null;
  return { name, modifiers };
}

/**
 * Public member names declared by the class in `file`.
 *
 * The class body is sliced between its `export class … {` line and the first
 * line that is exactly `}` — the tag maps these files export live ABOVE the
 * class, and their 2-space keys would otherwise parse as members.
 */
function membersOfClass(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  const start = lines.findIndex((l) => /^export (?:abstract )?class \w+/.test(l));
  if (start === -1) throw new Error(`${rel(file)}: no exported class found`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === "}") {
      end = i;
      break;
    }
  }
  const names = new Set();
  for (const line of lines.slice(start + 1, end)) {
    const member = parseMember(line);
    if (!member) continue;
    if (member.modifiers.some((m) => m === "private" || m === "protected")) continue;
    names.add(member.name);
  }
  return names;
}

/* ------------------------------------------------------------------ *
 * Collect the tree
 * ------------------------------------------------------------------ */

const specFiles = listFiles(SRC, (n) => n.endsWith(".spec.ts"));
const pageFiles = listFiles(join(SRC, "pageobjects"), (n) => n.endsWith(".page.ts"));

const baseMembers = new Set();
for (const base of [ANDROID_BASE, IOS_BASE]) {
  const file = pageFiles.find((f) => readFileSync(f, "utf8").includes(`class ${base} `));
  if (file) for (const m of membersOfClass(file)) baseMembers.add(m);
}

/** group key for a spec: area/name, without the .ios / .spec.ts suffixes. */
function specGroup(file) {
  return rel(file)
    .replace(/^src\/tests\//, "")
    .replace(/\.ios\.spec\.ts$/, "")
    .replace(/\.spec\.ts$/, "");
}

function pageGroup(file) {
  return rel(file)
    .replace(/^src\/pageobjects\//, "")
    .replace(/\.ios\.page\.ts$/, "")
    .replace(/\.page\.ts$/, "");
}

/** {group: {android: {file, ids[]}, ios: {file, ids[]}}} */
const specGroups = new Map();
for (const file of specFiles) {
  const group = specGroup(file);
  const side = file.endsWith(".ios.spec.ts") ? "ios" : "android";
  if (!specGroups.has(group)) specGroups.set(group, {});
  specGroups.get(group)[side] = { file, ids: idsInSpec(file) };
}

/** {group: {android: Set, ios: Set}} for real screen twins (base excluded). */
const pagePairs = new Map();
for (const file of pageFiles) {
  const group = pageGroup(file);
  if (group === "base") continue;
  const side = file.endsWith(".ios.page.ts") ? "ios" : "android";
  if (!pagePairs.has(group)) pagePairs.set(group, {});
  pagePairs.get(group)[side] = { file, members: membersOfClass(file) };
}

/* ------------------------------------------------------------------ *
 * Compute the current state
 * ------------------------------------------------------------------ */

const only = (set, other) => [...set].filter((v) => !other.has(v)).sort();

/** missing iOS twin spec / page object files. */
const missingTwins = [];
for (const [group, sides] of specGroups) {
  if (sides.android && !sides.ios) missingTwins.push(`src/tests/${group}.spec.ts`);
}
for (const [group, sides] of pagePairs) {
  if (sides.android && !sides.ios) missingTwins.push(`src/pageobjects/${group}.page.ts`);
}
missingTwins.sort();

/** group -> {androidOnly: [], iosOnly: []} for ids, dropping the empty side. */
const specIdDiffs = {};
const zeroOverlap = [];
for (const [group, sides] of specGroups) {
  if (!sides.android || !sides.ios) continue;
  const a = new Set(sides.android.ids.map((i) => i.id));
  const b = new Set(sides.ios.ids.map((i) => i.id));
  const androidOnly = only(a, b);
  const iosOnly = only(b, a);
  if (androidOnly.length === 0 && iosOnly.length === 0) continue;
  specIdDiffs[group] = { androidOnly, iosOnly };
  if (a.size > 0 && b.size > 0 && intersectionSize(a, b) === 0) zeroOverlap.push(group);
}

function intersectionSize(a, b) {
  let n = 0;
  for (const v of a) if (b.has(v)) n++;
  return n;
}

const surfaceGaps = {};
for (const [group, sides] of pagePairs) {
  if (!sides.android || !sides.ios) continue;
  // Subtract the base-class surface from both sides: a twin may re-declare
  // `screen`/`waitForScreen`/`isDisplayed`/`tapBack` as an override while the
  // other inherits it. The CALLABLE surface is what must match, and both
  // platforms can call those names either way.
  const a = without(sides.android.members, baseMembers);
  const b = without(sides.ios.members, baseMembers);
  const androidOnly = only(a, b);
  const iosOnly = only(b, a);
  if (androidOnly.length === 0 && iosOnly.length === 0) continue;
  surfaceGaps[group] = { androidOnly, iosOnly };
}

/** Set difference that stays a Set, so it can feed `only` again. */
function without(set, other) {
  return new Set([...set].filter((v) => !other.has(v)));
}

/** per-platform duplicate ids: id -> [where…]. */
function duplicates(side) {
  const byId = new Map();
  for (const [group, sides] of specGroups) {
    const entry = sides[side];
    if (!entry) continue;
    for (const hit of entry.ids) {
      const key = `${group}#${hit.id}`;
      if (!byId.has(key)) byId.set(key, []);
      byId.get(key).push({ ...hit, file: entry.file });
    }
  }
  const dupes = {};
  for (const [key, hits] of byId) {
    if (hits.length > 1) {
      dupes[key] = hits.map((h) => `${rel(h.file)}:${h.line} "${h.title}"`);
    }
  }
  return dupes;
}
const androidDupes = duplicates("android");
const iosDupes = duplicates("ios");

/* ------------------------------------------------------------------ *
 * Baseline / ratchet
 * ------------------------------------------------------------------ */

const currentState = {
  _generatedBy: "node scripts/check_parity.mjs --update",
  _note:
    'Known twin drift, ratcheted: a gap added here must be closed to remove it, and a closed gap left in this file fails the check. Keep "reason" honest — it is the audit trail for why a platform diverges.',
  missingTwins,
  specIdDiffs,
  surfaceGaps,
};

const updating = process.argv.includes("--update");

if (updating) {
  const previous = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, "utf8")) : {};
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify(
      {
        ...currentState,
        reason: previous.reason ?? currentState.reason,
        specIdDiffs: carryReasons(previous.specIdDiffs, currentState.specIdDiffs),
        surfaceGaps: carryReasons(previous.surfaceGaps, currentState.surfaceGaps),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(`Wrote ${rel(BASELINE_PATH)} from the current tree.`);
  printState(currentState);
  process.exit(0);
}

/** Re-baselining must not erase the audit trail: keep each group's reason. */
function carryReasons(previous, current) {
  const out = {};
  for (const [group, entry] of Object.entries(current)) {
    out[group] = {
      ...entry,
      reason: previous?.[group]?.reason ?? "TODO: explain why this twin diverges.",
    };
  }
  return out;
}

if (!existsSync(BASELINE_PATH)) {
  console.error("scripts/parity-baseline.json is missing. Run: npm run check:parity -- --update");
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));

const problems = [];

// Invariant 2 — one id, one case (never baselined).
for (const [side, dupes] of [
  ["android", androidDupes],
  ["ios", iosDupes],
]) {
  for (const [key, hits] of Object.entries(dupes)) {
    problems.push(
      `${side}: test-case id "${key.split("#")[1]}" is defined ${hits.length}× — a defect report naming it cannot identify the case:\n    ${hits.join("\n    ")}`,
    );
  }
}

// Invariant 3 — pairs must overlap at all (the M3 signature). Never baselined.
for (const group of zeroOverlap) {
  const a = specGroups.get(group).android;
  const i = specGroups.get(group).ios;
  problems.push(
    `spec pair "${group}" shares ZERO test-case ids between platforms (Android ${rel(a.file)} uses ${sampleIds(a)}, iOS ${rel(i.file)} uses ${sampleIds(i)}) — the twins describe different cases:\n    fix the ids, then re-run npm run check:parity`,
  );
}

// Invariants 1/3/4 — drift vs the ratcheted baseline.
diffSection("missing iOS twin", baseline.missingTwins ?? [], missingTwins, problems);
for (const [name, kind] of [
  ["spec id", "specIdDiffs"],
  ["page-object surface", "surfaceGaps"],
]) {
  const base = baseline[kind] ?? {};
  for (const group of new Set([...Object.keys(base), ...Object.keys(currentState[kind])])) {
    const before = normalizeDiff(base[group]);
    const after = normalizeDiff(currentState[kind][group]);
    if (!before && !after) continue;
    if (!before) {
      problems.push(
        `${name} drift for "${group}" is NEW (not in the baseline):\n${formatDiff(after, "")}`,
      );
    } else if (!after) {
      problems.push(
        `${name} drift for "${group}" is CLOSED — remove it from scripts/parity-baseline.json:\n${formatDiff(before, "    was ")}`,
      );
    } else if (!sameDiff(before, after)) {
      const added = {
        androidOnly: only2(after.androidOnly, before.androidOnly),
        iosOnly: only2(after.iosOnly, before.iosOnly),
      };
      const removed = {
        androidOnly: only2(before.androidOnly, after.androidOnly),
        iosOnly: only2(before.iosOnly, after.iosOnly),
      };
      problems.push(
        `${name} drift for "${group}" changed:\n${formatDiff(added, "  + NEW ")}${formatDiff(removed, "  - closed, drop from baseline ")}`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(
    `Twin parity check FAILED (${problems.length} problem${problems.length === 1 ? "" : "s"}):\n`,
  );
  problems.forEach((p, i) => console.error(`  ${i + 1}. ${p}\n`));
  console.error(
    "Fix the drift, or — if the divergence is deliberate and explained — re-baseline with:",
  );
  console.error(
    "  npm run check:parity -- --update   (then justify the new entry in scripts/parity-baseline.json)\n",
  );
  process.exit(1);
}

console.log("Twin parity check passed.");
console.log(
  `  ${pagePairs.size} page-object twins compared, ${specGroups.size} spec groups, ` +
    `${Object.keys(baseline.surfaceGaps ?? {}).length} baselined surface gap(s), ` +
    `${Object.keys(baseline.specIdDiffs ?? {}).length} baselined id gap(s), ` +
    `${(baseline.missingTwins ?? []).length} baselined missing twin(s).`,
);

/* ------------------------------------------------------------------ *
 * Details
 * ------------------------------------------------------------------ */

function normalizeDiff(entry) {
  if (!entry) return null;
  const out = {
    androidOnly: [...(entry.androidOnly ?? [])].sort(),
    iosOnly: [...(entry.iosOnly ?? [])].sort(),
  };
  return out.androidOnly.length === 0 && out.iosOnly.length === 0 ? null : out;
}

function sameDiff(a, b) {
  return (
    a.androidOnly.join("|") === b.androidOnly.join("|") &&
    a.iosOnly.join("|") === b.iosOnly.join("|")
  );
}

function only2(a, b) {
  return a.filter((v) => !b.includes(v));
}

function formatDiff(d, prefix) {
  const lines = [];
  if (d.androidOnly.length) lines.push(`${prefix}Android-only: ${d.androidOnly.join(", ")}`);
  if (d.iosOnly.length) lines.push(`${prefix}iOS-only: ${d.iosOnly.join(", ")}`);
  return lines.map((l) => `\n    ${l.trim()}`).join("");
}

function diffSection(label, before, after, problems) {
  for (const item of after)
    if (!before.includes(item)) problems.push(`${label} is NEW (not in the baseline): ${item}`);
  for (const item of before)
    if (!after.includes(item))
      problems.push(
        `${label} "${item}" no longer exists — remove it from scripts/parity-baseline.json`,
      );
}

function sampleIds(entry) {
  const prefixes = [...new Set(entry.ids.map((i) => i.id.replace(/-?\d+[A-Za-z]?$/, "")))];
  return prefixes.length ? prefixes.slice(0, 3).join("/") : "no ids";
}

function printState(state) {
  const counts = {
    "missing twins": state.missingTwins.length,
    "spec id diffs": Object.keys(state.specIdDiffs).length,
    "surface gaps": Object.keys(state.surfaceGaps).length,
    "android duplicate ids": Object.keys(androidDupes).length,
    "ios duplicate ids": Object.keys(iosDupes).length,
  };
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
}
