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

echo "==> 2b. Signing backend binary..."
codesign --force --sign - src-tauri/bin/skilldesk-server

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

# Add friendly instructions for unnotarized Gatekeeper bypass
cat << 'EOF' > "$DMG_STAGING/HOW_TO_OPEN.txt"
SkillDesk for macOS (Apple Silicon)
====================================

If macOS shows:
"SkillDesk is damaged and can't be opened. You should move it to the Bin."

This is standard macOS Gatekeeper behavior when opening an app downloaded from the web that was built with ad-hoc signing rather than an annual $99 Apple Developer ID certificate.

How to open:
1. Drag "SkillDesk" into the "Applications" folder.
2. In Applications, RIGHT-CLICK (or Control-Click) "SkillDesk.app" and select "Open".
3. In the dialog that appears, click "Open".

Alternatively, open Terminal and paste:
xattr -cr /Applications/SkillDesk.app
EOF

VERSION="1.1.0"
rm -f ./SkillDesk.dmg "src-tauri/target/release/bundle/dmg/SkillDesk_${VERSION}_aarch64.dmg"
hdiutil create -volname "SkillDesk" -srcfolder "$DMG_STAGING" -ov -format UDZO ./SkillDesk.dmg
mkdir -p "src-tauri/target/release/bundle/dmg"
cp ./SkillDesk.dmg "src-tauri/target/release/bundle/dmg/SkillDesk_${VERSION}_aarch64.dmg"
rm -rf "$DMG_STAGING"

echo "==> 7. Signing DMG container..."
codesign --force --sign - ./SkillDesk.dmg
codesign --force --sign - "src-tauri/target/release/bundle/dmg/SkillDesk_${VERSION}_aarch64.dmg"

echo "==> 8. Verifying DMG disk image..."
hdiutil verify ./SkillDesk.dmg

echo "==> Success! Standalone DMG created at: $DIR/SkillDesk.dmg"
