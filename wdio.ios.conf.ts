import { existsSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { Capabilities, Options } from '@wdio/types'

// `capabilities` is missing from Options.Testrunner in this @wdio/types
// version, so add it back explicitly.
type TestrunnerConfig = Omit<Options.Testrunner, 'capabilities'> & {
  capabilities: Capabilities.RequestedStandaloneCapabilities | Capabilities.RequestedMultiremoteCapabilities
}

/**
 * The XCUITest driver shells out to `xcrun` for every simulator operation.
 * This machine's xcode-select points at CommandLineTools, which ships no iOS
 * SDK (same quirk iosApp/build-app.sh in the app repo works around), so
 * point DEVELOPER_DIR at a full Xcode unless the caller already did.
 */
const XCODE_APP = '/Applications/Xcode.app/Contents/Developer'
if (process.platform === 'darwin' && !process.env.DEVELOPER_DIR && existsSync(XCODE_APP)) {
  process.env.DEVELOPER_DIR = XCODE_APP
}

/**
 * .app bundle used by the iOS suite — the Compose Multiplatform build from
 * the app repo (`iosApp/build-app.sh`). Override with SAKU_IOS_APP.
 */
const DEFAULT_IOS_APP = path.resolve(
  os.homedir(),
  'AndroidStudioProjects/SimpleMoneyTrackerKT/iosApp/build/DerivedData/Build/Products/Debug-iphonesimulator/Saku.app',
)
const IOS_APP_PATH = process.env.SAKU_IOS_APP ?? DEFAULT_IOS_APP

/**
 * Simulator list. `SAKU_IOS_DEVICES="udid1,udid2"` enables parallel runs
 * (each device gets its own wdaLocalPort); default is the iPhone 18 Pro
 * simulator used for the first iOS bring-up.
 */
const IOS_DEVICES = (process.env.SAKU_IOS_DEVICES ?? '80FCD259-BA75-4018-8FE6-31F4E812AD9B')
  .split(',')
  .map((udid) => udid.trim())
  .filter(Boolean)

/**
 * Optional prebuilt WebDriverAgent (SAKU_IOS_WDA_APP). By default the driver
 * builds WDA from its bundled source — version-matched and cached in
 * DerivedData after the first run. Reusing an externally cached WDA .app
 * (e.g. the Appium MCP cache) is NOT the default: `xcodebuild
 * test-without-building` against that app exited 65 on this setup (3
 * consecutive session-creation failures, 2026-10-27), while the driver-built
 * WDA works.
 */
const PREBUILT_WDA = process.env.SAKU_IOS_WDA_APP

/**
 * External Appium servers (optional): `SAKU_APPIUM_PORTS="4723,4725"` — one
 * per device, e.g. `npx appium server --port 4723` (base path `/`). Unset =>
 * the @wdio/appium-service spawns one shared server on port 4725 for all
 * devices. Port 4723 stays free for Appium MCP sessions.
 */
const SAKU_APPIUM_PORTS = (process.env.SAKU_APPIUM_PORTS ?? '')
  .split(',')
  .map((port) => port.trim())
  .filter(Boolean)

if (SAKU_APPIUM_PORTS.length > 0 && SAKU_APPIUM_PORTS.length < IOS_DEVICES.length) {
  throw new Error(
    `${IOS_DEVICES.length} iOS devices requested but SAKU_APPIUM_PORTS only lists ` +
      `${SAKU_APPIUM_PORTS.length} server port(s): ${SAKU_APPIUM_PORTS.join(', ')}.`,
  )
}

const capabilities = IOS_DEVICES.map((udid, index) => {
  const caps: Record<string, unknown> = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:app': IOS_APP_PATH,
    'appium:bundleId': 'id.almezi.saku',
    'appium:deviceName': 'iPhone',
    'appium:udid': udid,
    // Fresh app data per session => every spec file starts from a clean DB
    // (same isolation contract as the Android suite).
    'appium:noReset': false,
    // Each parallel device gets its own WDA listener port so sessions never
    // collide.
    'appium:wdaLocalPort': 8100 + index,
    'appium:newCommandTimeout': 240,
    'appium:wdaLaunchTimeout': 120_000,
    'appium:printPageSourceOnFindFailure': false,
    ...(PREBUILT_WDA
      ? { 'appium:usePrebuiltWDA': true, 'appium:prebuiltWDAPath': PREBUILT_WDA }
      : {}),
    ...(SAKU_APPIUM_PORTS[index]
      ? { hostname: '127.0.0.1', protocol: 'http', path: '/', port: Number(SAKU_APPIUM_PORTS[index]) }
      : {}),
  }
  return caps
}) as unknown as Capabilities.RequestedStandaloneCapabilities

export const config: TestrunnerConfig = {
  runner: 'local',
  // iOS spec files carry the .ios.spec.ts suffix so the Android config and
  // this one never pick up each other's specs.
  specs: ['./src/tests/**/*.ios.spec.ts'],
  exclude: [],
  maxInstances: IOS_DEVICES.length,
  maxInstancesPerCapability: 1,

  capabilities,

  logLevel: 'warn',
  bail: 0,
  waitforTimeout: 15_000,
  connectionRetryTimeout: 180_000,
  connectionRetryCount: 3,

  services: SAKU_APPIUM_PORTS.length > 0
    ? [] // External servers: nothing to spawn.
    : [
        [
          'appium',
          {
            args: {
              port: 4725,
              log: path.resolve(__dirname, 'reports', 'appium-ios-wdio.log'),
              'log-level': 'info',
            },
          },
        ],
      ],

  framework: 'mocha',
  reporters: [['spec', { outputDir: './reports' }]],

  mochaOpts: {
    ui: 'bdd',
    timeout: 180_000,
    // Same @sanity / @regression / @integration filter contract as the
    // Android suite (TEST_GREP, see package.json).
    grep: process.env.TEST_GREP || undefined,
  },

  onPrepare: function () {
    if (!existsSync(IOS_APP_PATH)) {
      throw new Error(
        `Saku.app not found at ${IOS_APP_PATH}. Build it (./iosApp/build-app.sh Debug in the app ` +
          'repo) or set SAKU_IOS_APP to an existing bundle.',
      )
    }
    mkdirSync(path.join('reports', 'screenshots'), { recursive: true })
  },

  afterTest: async function (test, _context, results) {
    if (results.passed) return
    const safeTitle = test.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 80)
    const file = path.join('reports', 'screenshots', `ios-${Date.now()}-${safeTitle}.png`)
    await browser.saveScreenshot(file).catch((e: Error) => console.warn('screenshot failed', e.message))
  },
}
