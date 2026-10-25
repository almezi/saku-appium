import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import type { Capabilities, Options } from '@wdio/types'

// `capabilities` is missing from Options.Testrunner in this @wdio/types
// version, so add it back explicitly.
type TestrunnerConfig = Omit<Options.Testrunner, 'capabilities'> & {
  capabilities: Capabilities.RequestedStandaloneCapabilities | Capabilities.RequestedMultiremoteCapabilities
}

// UiAutomator2 refuses to create sessions without an SDK location. Fall back
// to the standard macOS install so the suite runs from a bare shell; an
// exported ANDROID_HOME always wins.
if (!process.env.ANDROID_HOME && !process.env.ANDROID_SDK_ROOT) {
  const defaultSdk = path.join(process.env.HOME ?? '', 'Library', 'Android', 'sdk')
  if (existsSync(defaultSdk)) process.env.ANDROID_HOME = defaultSdk
}

// APK used by the suite. Override with SAKU_APK to point at another build
// (for example the debug APK with seeded debug tooling).
const DEFAULT_APK = path.resolve(__dirname, 'resources', 'SimpleMoneyTrackerKT-v2.2.apk')
const APK_PATH = process.env.SAKU_APK ?? DEFAULT_APK

// The emulator/device under test. Override for another device.
const DEVICE_UDID = process.env.ANDROID_UDID ?? 'emulator-5554'

/**
 * Real device under test (opt-in). Set REAL_DEVICE_UDID (e.g. via `adb
 * devices | awk 'NR==2{print $1}'`) to run in parallel against one real
 * device AND one emulator: `REAL_DEVICE_UDID=<udid> npm test`. Leave unset
 * for the default single-run on the emulator. Each device gets its own
 * uiautomator2 systemPort so the two sessions never collide.
 */
const REAL_DEVICE_UDID = process.env.REAL_DEVICE_UDID

interface SakuDevice {
  capability: Record<string, unknown>
  udid: string
}

const BASE_CAPABILITY = {
  platformName: 'Android',
  'appium:automationName': 'UiAutomator2',
  'appium:app': APK_PATH,
  'appium:appPackage': 'id.almezi.simplemoneytracker_kt',
  'appium:appActivity': '.MainActivity',
  // Fresh app data per session => every spec file starts from a clean DB.
  'appium:noReset': false,
  'appium:newCommandTimeout': 240,
  'appium:uiautomator2ServerLaunchTimeout': 120_000,
  'appium:uiautomator2ServerInstallTimeout': 120_000,
  'appium:adbExecTimeout': 60_000,
  'appium:printPageSourceOnFindFailure': false,
}

function makeSaku(udid: string, systemPort: number): SakuDevice {
  return {
    capability: {
      ...BASE_CAPABILITY,
      'appium:deviceName': udid,
      'appium:udid': udid,
      // Each parallel device gets its own uiautomator2 systemPort so two
      // sessions' automation servers never collide.
      'appium:systemPort': systemPort,
    },
    udid,
  }
}

// The appium:* vendor prefixes and platformName ride on W3C capabilities but
// are not part of the strict W3C type, so cast through unknown.
const sakuDevices: SakuDevice[] = [makeSaku(DEVICE_UDID, 8200)]
if (REAL_DEVICE_UDID) sakuDevices.push(makeSaku(REAL_DEVICE_UDID, 8201))

const capabilities = sakuDevices.map(
  (device) => device.capability,
) as unknown as Capabilities.RequestedStandaloneCapabilities

export const config: TestrunnerConfig = {
  runner: 'local',
  specs: ['./src/tests/**/*.spec.ts'],
  exclude: [],
  maxInstances: sakuDevices.length,
  maxInstancesPerCapability: 1,

  capabilities,

  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 15_000,
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 3,

  services: [
    [
      'appium',
      {
        // Port 4725 leaves 4723 free for the Appium MCP session.
        args: {
          port: 4725,
          log: path.resolve(__dirname, 'reports', 'appium.log'),
          'log-level': 'info',
        },
      },
    ],
  ],

  framework: 'mocha',
  reporters: [['spec', { outputDir: './reports' }]],

  mochaOpts: {
    ui: 'bdd',
    // 180 s per test: the former 20-minute ceiling only existed for the
    // 100-transaction seed test, which is now it.skip-ped (TC-LIST-08).
    // WDIO's mocha wrapper does not forward `this` into hooks/tests, so
    // per-test this.timeout() cannot be relied on; true hangs are still
    // bounded by appium:newCommandTimeout (240 s without a driver command).
    timeout: 180_000,
    // Test-type filter: every describe carries a @sanity / @regression /
    // @integration tag and the type scripts set TEST_GREP, e.g.
    // `TEST_GREP=@sanity npm test` (see package.json). Unset => run all.
    // Mocha matches the tag anywhere in a test's full title, so no wrapping
    // or escaping is needed for '@'.
    grep: process.env.TEST_GREP || undefined,
  },

  /**
   * Fail fast and loud when the APK is missing, instead of letting every
   * spec time out inside Appium session creation. Also ensure the
   * screenshots directory exists up front: saveScreenshot does not create
   * parent directories, so every afterTest write would fail with ENOENT.
   */
  onPrepare: function () {
    if (!existsSync(APK_PATH)) {
      throw new Error(
        `APK not found at ${APK_PATH}. Build it (./gradlew assembleDebug in the app repo) ` +
          'or set SAKU_APK to an existing APK.',
      )
    }
    mkdirSync(path.join('reports', 'screenshots'), { recursive: true })
  },

  /**
   * Screenshot into ./reports/screenshots whenever a test fails.
   */
  afterTest: async function (test, _context, results) {
    if (results.passed) return
    const safeTitle = test.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 80)
    const file = path.join('reports', 'screenshots', `${Date.now()}-${safeTitle}.png`)
    await browser.saveScreenshot(file).catch((e: Error) => console.warn('screenshot failed', e.message))
  },
}
