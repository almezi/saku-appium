import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

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
export const IOS_APP_PATH =
  process.env.SAKU_IOS_APP ??
  path.resolve(
    os.homedir(),
    'AndroidStudioProjects/SimpleMoneyTrackerKT/iosApp/build/DerivedData/Build/Products/Debug-iphonesimulator/Saku.app',
  )

/** Bundle id of the iOS app (the Android twin is id.almezi.simplemoneytracker_kt). */
export const IOS_BUNDLE_ID = 'id.almezi.saku'
