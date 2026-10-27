import { existsSync, mkdirSync, readdirSync } from 'node:fs'
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

/**
 * Device list resolution, in precedence order:
 *
 * 1. `SAKU_DEVICES="udid1,udid2,..."` — comma-separated UDIDs, any number of
 *    devices (`adb devices -l` lists them). Each device gets its own
 *    uiautomator2 systemPort (8200 + index) so parallel sessions never
 *    collide.
 * 2. Legacy pair: `ANDROID_UDID` (defaults to the emulator) plus optional
 *    `REAL_DEVICE_UDID` for a second device — still honored for backwards
 *    compatibility.
 * 3. Fallback: `emulator-5554` alone.
 */
const SAKU_DEVICES = process.env.SAKU_DEVICES
const DEVICE_UDID = process.env.ANDROID_UDID ?? 'emulator-5554'
const REAL_DEVICE_UDID = process.env.REAL_DEVICE_UDID

function resolveDeviceUdids(): string[] {
  const fromSakuDevices = (SAKU_DEVICES ?? '')
    .split(',')
    .map((udid) => udid.trim())
    .filter(Boolean)
  if (fromSakuDevices.length > 0) return fromSakuDevices
  const legacy = [DEVICE_UDID]
  if (REAL_DEVICE_UDID) legacy.push(REAL_DEVICE_UDID)
  return legacy
}

/**
 * External Appium servers (optional). Set SAKU_APPIUM_PORTS="4723,4725" to
 * connect to servers you started yourself — one per device, e.g.
 * `npm run appium:server1` and `npm run appium:server2` in two terminals —
 * instead of letting the runner spawn a single shared server. Device N talks
 * to server N: each capability carries its own hostname/port/path connection
 * override, which the WDIO runner explicitly supports. The servers must use
 * `--base-path=/wd/hub` (the npm scripts do). Unset => the @wdio/appium-service
 * spawns one shared server on port 4725 for all devices.
 */
const SAKU_APPIUM_PORTS = (process.env.SAKU_APPIUM_PORTS ?? '')
  .split(',')
  .map((port) => port.trim())
  .filter(Boolean)

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
  // Real devices with system animations can freeze the uiautomator2
  // instrumentation on element-visibility checks (seen on HiOS/Android 16);
  // skip window animations inside the session as belt-and-braces alongside
  // zeroing the device's animation scales.
  'appium:disableWindowAnimation': true,
  'appium:newCommandTimeout': 240,
  'appium:uiautomator2ServerLaunchTimeout': 120_000,
  'appium:uiautomator2ServerInstallTimeout': 120_000,
  'appium:adbExecTimeout': 60_000,
  'appium:printPageSourceOnFindFailure': false,
}

function makeSaku(opts: {
  udid: string
  systemPort: number
  specs?: string[]
  appiumPort?: number
}): SakuDevice {
  const { udid, systemPort, specs, appiumPort } = opts
  return {
    capability: {
      ...BASE_CAPABILITY,
      'appium:deviceName': udid,
      'appium:udid': udid,
      // Each parallel device gets its own uiautomator2 systemPort so two
      // sessions' automation servers never collide.
      'appium:systemPort': systemPort,
      ...(specs ? { 'wdio:specs': specs } : {}),
      // Per-capability connection override: when external servers are used,
      // device N talks to server N. The runner merges these over the global
      // config when creating the session.
      ...(appiumPort
        ? { hostname: '127.0.0.1', protocol: 'http', path: '/wd/hub', port: appiumPort }
        : {}),
    },
    udid,
  }
}

/**
 * Shard mode (`SAKU_SHARD=1`): split the spec files round-robin across the
 * devices so the suite finishes in roughly wallTime/deviceCount instead of
 * running the full suite on every device (the default "matrix" behavior).
 * Specs are assigned as a flat `'wdio:specs'` array on purpose — a nested
 * array would group files into one worker per device, sharing a single
 * session and losing the clean-app-data isolation every spec file relies on.
 */
const SHARD = process.env.SAKU_SHARD === '1'

const deviceUdids = resolveDeviceUdids()

// `test:parallel` and shard mode only make sense with more than one device;
// fail fast with instructions instead of silently running single-device.
const parallelRequested = SHARD || process.env.SAKU_PARALLEL === '1'
if (parallelRequested && deviceUdids.length < 2) {
  throw new Error(
    `Parallel run requested but only ${deviceUdids.length} device(s) resolved: ` +
      `${deviceUdids.join(', ')}. Set SAKU_DEVICES="udid1,udid2" (or legacy ` +
      'REAL_DEVICE_UDID=<udid>; `adb devices -l` lists the UDIDs) to run ' +
      'against multiple devices.',
  )
}
if (SAKU_APPIUM_PORTS.length > 0 && SAKU_APPIUM_PORTS.length < deviceUdids.length) {
  throw new Error(
    `${deviceUdids.length} devices requested but SAKU_APPIUM_PORTS only lists ` +
      `${SAKU_APPIUM_PORTS.length} server port(s): ${SAKU_APPIUM_PORTS.join(', ')}. ` +
      'Start one Appium server per device and list its port, e.g. ' +
      'SAKU_APPIUM_PORTS="4723,4725".',
  )
}

function collectSpecFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...collectSpecFiles(full))
    else if (entry.name.endsWith('.spec.ts')) found.push(full)
  }
  return found
}

function roundRobin<T>(items: T[], buckets: number): T[][] {
  const parts: T[][] = Array.from({ length: buckets }, () => [])
  items.forEach((item, index) => parts[index % buckets].push(item))
  return parts
}

const specShards = SHARD
  ? roundRobin(collectSpecFiles(path.resolve(__dirname, 'src', 'tests')).sort(), deviceUdids.length)
  : undefined

// The appium:* vendor prefixes and platformName ride on W3C capabilities but
// are not part of the strict W3C type, so cast through unknown.
const sakuDevices: SakuDevice[] = deviceUdids.map((udid, index) =>
  makeSaku({
    udid,
    systemPort: 8200 + index,
    specs: specShards?.[index],
    appiumPort: SAKU_APPIUM_PORTS[index] ? Number(SAKU_APPIUM_PORTS[index]) : undefined,
  }),
)

const capabilities = sakuDevices.map(
  (device) => device.capability,
) as unknown as Capabilities.RequestedStandaloneCapabilities

export const config: TestrunnerConfig = {
  runner: 'local',
  specs: ['./src/tests/**/*.spec.ts'],
  // iOS spec files (*.ios.spec.ts) are driven by wdio.ios.conf.ts with
  // XCUITest capabilities — never let this Android config pick them up.
  exclude: ['./src/tests/**/*.ios.spec.ts'],
  maxInstances: sakuDevices.length,
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
