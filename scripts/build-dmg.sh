#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo "==> 1. Building Vite frontend..."
npm run build

echo "==> 2. Compiling standalone backend binary..."
mkdir -p src-tauri/bin
bun build server/index.js --compile --outfile src-tauri/bin/skilldesk-server
chmod +x src-tauri/bin/skilldesk-server

echo "==> 3. Building Tauri macOS application..."
npx tauri build --bundles app

APP_PATH="src-tauri/target/release/bundle/macos/SkillDesk.app"

echo "==> 4. Signing app bundle with deep ad-hoc signature..."
codesign --force --deep --sign - "$APP_PATH"

echo "==> 5. Verifying code signature..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

echo "==> 6. Creating DMG package..."
DMG_STAGING="src-tauri/target/release/dmg_staging"
rm -rf "$DMG_STAGING"
mkdir -p "$DMG_STAGING"

cp -R "$APP_PATH" "$DMG_STAGING/"
ln -s /Applications "$DMG_STAGING/Applications"

rm -f ./SkillDesk.dmg "src-tauri/target/release/bundle/dmg/SkillDesk_1.0.0_aarch64.dmg"
hdiutil create -volname "SkillDesk" -srcfolder "$DMG_STAGING" -ov -format UDZO ./SkillDesk.dmg
mkdir -p "src-tauri/target/release/bundle/dmg"
cp ./SkillDesk.dmg "src-tauri/target/release/bundle/dmg/SkillDesk_1.0.0_aarch64.dmg"
rm -rf "$DMG_STAGING"

echo "==> 7. Verifying DMG disk image..."
hdiutil verify ./SkillDesk.dmg

echo "==> Success! Standalone DMG created at: $DIR/SkillDesk.dmg"
