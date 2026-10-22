# WinkCasa mobile app (Android + iOS)

A Capacitor app that opens https://www.winkcasa.com inside a native shell. Prices, products, orders and accounts
always come live from the website, so you never re-publish the app for a product or price change.

## Android
1. GitHub → Actions → "Build Android app" → Run workflow. It builds in the cloud (no Android Studio needed).
2. Download the `winkcasa-android` artifact. The `.apk` installs on any Android phone for testing.
3. For Google Play you need a signed `.aab`. Create a keystore once:
   `keytool -genkey -v -keystore winkcasa.keystore -alias winkcasa -keyalg RSA -keysize 2048 -validity 10000`
   Keep the file and its password safe forever (lose it and you cannot update the app). Add repo secrets
   `ANDROID_KEYSTORE_B64` (`base64 -w0 winkcasa.keystore`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, rerun, then upload the `.aab` in Play Console ($25 one-time developer fee).

## iOS
Needs an Apple Developer account ($99/year) and a Mac with Xcode (or a cloud Mac service).
1. On the Mac: `cd mobile-app && npm install && npx cap add ios && npx @capacitor/assets generate --ios && npx cap sync ios && npx cap open ios`
2. In Xcode set your Team, bundle id `com.winkcasa.app`, then Product → Archive → Distribute to App Store Connect.
3. The "Build iOS app" workflow only proves the project compiles.

## Notes
- App id: `com.winkcasa.app`. App name: WinkCasa. Colours: #0B1916 / #C9A45C. Icon and splash are in `resources/`.
- Apple can reject apps that are only a website in a frame (guideline 4.2). Adding native features such as push notifications, biometric login or share helps. Ask Claude to add them before submitting.
- Razorpay checkout runs inside the app. Test a real UPI payment on a real phone before publishing.
- Store listing needs: privacy policy URL (https://www.winkcasa.com/privacy), screenshots, description, content rating, and account-deletion info (Account → Profile → Delete account).
