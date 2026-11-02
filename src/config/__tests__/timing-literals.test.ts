/**
 * Guardrail for the timing contract (code_review.md findings M5 and M6).
 *
 * Wait budgets live in `src/config/timeouts.ts`; settle pauses live in
 * `src/config/settles.ts`. A numeric literal written inline at a call site is
 * invisible to both files: nothing then says whether `15_000` here means the
 * same thing as `15_000` there, and **S9**'s re-tuning has no inventory to work
 * from. This test turns that into a failing check.
 *
 * Parsed with the TypeScript AST rather than a regex, so a doc comment that
 * quotes `timeout: 15_000` is not a violation and a shorthand `{ timeout }`
 * passing a variable through is not either.
 *
 * Out of scope by design: `duration:` inside a W3C `performActions` sequence
 * (that is part of the gesture's shape, not a wait or a sleep) and the runner
 * configs' mocha/connection budgets (`wdio*.conf.ts`, outside src/).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const SRC_DIR = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(SRC_DIR, "..");

/** The two modules that are allowed to state a number. */
const DEFINITION_FILES = new Set(["config/timeouts.ts", "config/settles.ts"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(full);
    if (!entry.name.endsWith(".ts")) return [];
    return [full];
  });
}

const BUDGET_KEYS = new Set(["timeout", "wait", "interval"]);

/** Every inline numeric timing literal under src/, as `file:line  text`. */
function inlineLiterals(file: string): string[] {
  const found: string[] = [];
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.ESNext,
    true,
  );
  const lineOf = (pos: number) => source.getLineAndCharacterOfPosition(pos).line + 1;

  const literalArg = (node: ts.Node): boolean => ts.isNumericLiteral(node);

  const visit = (node: ts.Node) => {
    // `waitForExist({ timeout: 15_000 })` / `toBeDisplayed({ wait: 5_000 })`
    if (
      ts.isPropertyAssignment(node) &&
      BUDGET_KEYS.has(node.name.getText()) &&
      literalArg(node.initializer)
    ) {
      found.push(
        `${path.relative(REPO_ROOT, file)}:${lineOf(node.getStart())}  ${node.getText().slice(0, 60)}`,
      );
    }
    // `async waitForScreen(timeout = 30_000)`
    if (
      ts.isParameter(node) &&
      node.name.getText() === "timeout" &&
      node.initializer &&
      literalArg(node.initializer)
    ) {
      found.push(
        `${path.relative(REPO_ROOT, file)}:${lineOf(node.getStart())}  ${node.getText().slice(0, 60)}`,
      );
    }
    // `driver.pause(500)`
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "pause"
    ) {
      const arg = node.arguments[0];
      if (arg && literalArg(arg))
        found.push(
          `${path.relative(REPO_ROOT, file)}:${lineOf(node.getStart())}  ${node.getText().slice(0, 60)}`,
        );
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

test("no wait budget or settle pause is written as an inline number (M5/M6)", () => {
  const hits = sourceFiles(SRC_DIR)
    .filter((f) => !DEFINITION_FILES.has(path.relative(SRC_DIR, f)))
    .flatMap(inlineLiterals);
  assert.deepEqual(
    hits,
    [],
    `Move each number into src/config/timeouts.ts (a deadline) or src/config/settles.ts (a sleep).\n${hits.join("\n")}`,
  );
});

test("every constant in the timing modules is used and every value is a plain number", () => {
  const files = sourceFiles(SRC_DIR).filter(
    (f) => !DEFINITION_FILES.has(path.relative(SRC_DIR, f)),
  );
  const bodies = files.map((f) => readFileSync(f, "utf8")).join("\n");
  for (const rel of DEFINITION_FILES) {
    const full = path.join(SRC_DIR, rel);
    const source = ts.createSourceFile(
      full,
      readFileSync(full, "utf8"),
      ts.ScriptTarget.ESNext,
      true,
    );
    const names: string[] = [];
    for (const statement of source.statements) {
      if (
        !ts.isVariableStatement(statement) ||
        !ts.canHaveModifiers(statement) ||
        !statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      )
        continue;
      for (const decl of statement.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        if (decl.initializer && !ts.isNumericLiteral(decl.initializer)) continue; // alias, e.g. DEFAULT_TIMEOUT
        names.push(decl.name.text);
      }
    }
    assert.ok(names.length > 0, `${rel} declares no constants`);
    const unused = names.filter((n) => !new RegExp(`\\b${n}\\b`).test(bodies));
    assert.deepEqual(
      unused,
      [],
      `${rel} declares constants nothing waits on: ${unused.join(", ")}`,
    );
  }
});
