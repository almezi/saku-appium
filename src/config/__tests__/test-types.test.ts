/**
 * Guardrail for the test-type taxonomy (src/config/test-types.ts).
 *
 * Every TEST CASE must carry exactly one recognized type tag in its it()
 * title, and all the cases in a file share that file's type. The type scripts
 * (npm run test:sanity / test:regression / test:integration) filter with
 * mocha's `grep`, which matches the tag anywhere in the test's full title — so
 * a case that forgets its tag is not a loud failure, it is SILENTLY EXCLUDED
 * from every filtered run and simply never runs. This test turns that silent
 * gap into a failing check.
 *
 * The spec files are parsed with the TypeScript AST rather than scanned with
 * a regex: a comment that mentions `it()` is not a test case, and a title
 * built from a variable is not a title the guardrail can read.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { TEST_TYPE_NAMES, testTypesOf } from '../test-types'

const REPO_ROOT = path.resolve(__dirname, '../../..')
const SPECS_DIR = path.join(REPO_ROOT, 'src/tests')

/** Every *.spec.ts under a directory, recursively. */
function specFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return specFiles(full)
    return entry.name.endsWith('.spec.ts') ? [full] : []
  })
}

/** The name of the callee, for `it(...)`, `it.skip(...)` and friends. */
function calleeName(expr: ts.Expression): string | null {
  if (ts.isIdentifier(expr)) return expr.text
  if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
    return `${expr.expression.text}.${expr.name.text}`
  }
  return null
}

/**
 * The literal title of a call's first argument, or null when the argument is
 * not a literal (a variable, a concatenation) and so cannot be read here.
 */
function titleOf(arg: ts.Expression | undefined, source: ts.SourceFile): string | null {
  if (!arg) return null
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) return arg.text
  if (ts.isTemplateExpression(arg)) return arg.getText(source).slice(1, -1)
  return null
}

interface Call {
  /** `it`, `it.skip`, `describe`, ... */
  callee: string
  title: string | null
  line: number
}

/** Every `it(...)` / `describe(...)` call in a spec file, in source order. */
function callsOf(source: string): Call[] {
  const file = ts.createSourceFile('spec.ts', source, ts.ScriptTarget.Latest, true)
  const calls: Call[] = []

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = calleeName(node.expression)
      if (callee === 'it' || callee === 'it.skip' || callee === 'it.only' || callee === 'describe') {
        const { line } = file.getLineAndCharacterOfPosition(node.getStart(file))
        calls.push({ callee, title: titleOf(node.arguments[0], file), line: line + 1 })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)

  return calls
}

test('every test case carries exactly one recognized test type', () => {
  const problems: string[] = []
  const counts: Record<string, number> = {}

  for (const file of specFiles(SPECS_DIR)) {
    const relative = path.relative(REPO_ROOT, file)
    const calls = callsOf(readFileSync(file, 'utf8'))
    const cases = calls.filter((call) => call.callee.startsWith('it'))
    const describes = calls.filter((call) => call.callee === 'describe')

    const fileTypes = new Set<string>()
    for (const call of cases) {
      if (call.title === null) {
        problems.push(
          `${relative}:${call.line}: ${call.callee}() has a title that is not a literal`,
        )
        continue
      }
      const types = testTypesOf(call.title)
      if (types.length === 0) {
        problems.push(`${relative}:${call.line}: ${call.callee}("${call.title}") carries no test type tag`)
      } else if (types.length > 1) {
        problems.push(
          `${relative}:${call.line}: ${call.callee}("${call.title}") carries ${types.length} test type tags (${types.join(', ')})`,
        )
      } else {
        const [type] = types
        if (type === undefined) continue
        fileTypes.add(type)
        counts[type] = (counts[type] ?? 0) + 1
      }
    }

    // One type per file: the type scripts scope at file level, so a file that
    // mixes types would be half-in and half-out of every filtered run.
    if (fileTypes.size > 1) {
      problems.push(`${relative}: mixes ${fileTypes.size} test types (${[...fileTypes].join(', ')})`)
    }

    // The describe title is the file's headline; if it names a type it must
    // be the same one the cases carry.
    for (const call of describes) {
      if (call.title === null) continue
      const types = testTypesOf(call.title)
      if (types.length > 1) {
        problems.push(
          `${relative}:${call.line}: describe("${call.title}") carries ${types.length} test type tags (${types.join(', ')})`,
        )
      } else if (types.length === 1 && fileTypes.size === 1 && types[0] !== [...fileTypes][0]) {
        problems.push(
          `${relative}:${call.line}: describe("${call.title}") says @${types[0]} but its cases say @${[...fileTypes][0]}`,
        )
      }
    }
  }

  assert.deepEqual(
    problems,
    [],
    `Test cases with a missing or ambiguous test type:\n${problems.join('\n')}`,
  )
  // A type nobody uses means the taxonomy has drifted from the suite.
  for (const name of TEST_TYPE_NAMES) {
    assert.ok((counts[name] ?? 0) > 0, `No test case carries the @${name} test type`)
  }
  console.log(
    `[test-types] ${TEST_TYPE_NAMES.map((name) => `@${name}: ${counts[name] ?? 0}`).join(', ')}`,
  )
})
