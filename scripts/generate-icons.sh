#!/bin/bash
# Generate iOS app icons from a source 1024x1024 PNG.
# Usage: ./scripts/generate-icons.sh path/to/icon-1024.png
#
# Requires: ImageMagick (brew install imagemagick)
# Output: public/ directory icons + ios/App/App/Assets.xcassets/AppIcon.appiconset/

set -e

SRC="${1:-icon-source.png}"
PUB="public"
IOS_ICONSET="ios/App/App/Assets.xcassets/AppIcon.appiconset"

if ! command -v convert &>/dev/null; then
  echo "Error: ImageMagick not found. Install with: brew install imagemagick"
  exit 1
fi

if [ ! -f "$SRC" ]; then
  echo "Error: Source image not found: $SRC"
  echo "Usage: $0 path/to/icon-1024.png"
  exit 1
fi

echo "Generating web icons in $PUB/..."
for SIZE in 48 120 152 180 192 512 1024; do
  convert "$SRC" -resize "${SIZE}x${SIZE}" "$PUB/icon-${SIZE}.png"
  echo "  icon-${SIZE}.png"
done

echo "Generating iOS Xcode icons in $IOS_ICONSET/..."
mkdir -p "$IOS_ICONSET"

declare -A IOS_SIZES=(
  ["Icon-20@2x.png"]=40
  ["Icon-20@3x.png"]=60
  ["Icon-29@2x.png"]=58
  ["Icon-29@3x.png"]=87
  ["Icon-40@2x.png"]=80
  ["Icon-40@3x.png"]=120
  ["Icon-60@2x.png"]=120
  ["Icon-60@3x.png"]=180
  ["Icon-76.png"]=76
  ["Icon-76@2x.png"]=152
  ["Icon-83.5@2x.png"]=167
  ["Icon-1024.png"]=1024
)

for FILENAME in "${!IOS_SIZES[@]}"; do
  SIZE="${IOS_SIZES[$FILENAME]}"
  convert "$SRC" -resize "${SIZE}x${SIZE}" "$IOS_ICONSET/$FILENAME"
  echo "  $FILENAME (${SIZE}x${SIZE})"
done

# Write Contents.json for Xcode
cat > "$IOS_ICONSET/Contents.json" << 'EOF'
{
  "images": [
    { "idiom": "iphone", "scale": "2x", "size": "20x20",   "filename": "Icon-20@2x.png"   },
    { "idiom": "iphone", "scale": "3x", "size": "20x20",   "filename": "Icon-20@3x.png"   },
    { "idiom": "iphone", "scale": "2x", "size": "29x29",   "filename": "Icon-29@2x.png"   },
    { "idiom": "iphone", "scale": "3x", "size": "29x29",   "filename": "Icon-29@3x.png"   },
    { "idiom": "iphone", "scale": "2x", "size": "40x40",   "filename": "Icon-40@2x.png"   },
    { "idiom": "iphone", "scale": "3x", "size": "40x40",   "filename": "Icon-40@3x.png"   },
    { "idiom": "iphone", "scale": "2x", "size": "60x60",   "filename": "Icon-60@2x.png"   },
    { "idiom": "iphone", "scale": "3x", "size": "60x60",   "filename": "Icon-60@3x.png"   },
    { "idiom": "ipad",   "scale": "2x", "size": "20x20",   "filename": "Icon-20@2x.png"   },
    { "idiom": "ipad",   "scale": "1x", "size": "29x29",   "filename": "Icon-29@2x.png"   },
    { "idiom": "ipad",   "scale": "2x", "size": "29x29",   "filename": "Icon-29@2x.png"   },
    { "idiom": "ipad",   "scale": "1x", "size": "40x40",   "filename": "Icon-40@2x.png"   },
    { "idiom": "ipad",   "scale": "2x", "size": "40x40",   "filename": "Icon-40@2x.png"   },
    { "idiom": "ipad",   "scale": "1x", "size": "76x76",   "filename": "Icon-76.png"      },
    { "idiom": "ipad",   "scale": "2x", "size": "76x76",   "filename": "Icon-76@2x.png"   },
    { "idiom": "ipad",   "scale": "2x", "size": "83.5x83.5","filename": "Icon-83.5@2x.png"},
    { "idiom": "ios-marketing", "scale": "1x", "size": "1024x1024", "filename": "Icon-1024.png" }
  ],
  "info": { "author": "xcode", "version": 1 }
}
EOF

echo ""
echo "Done! Next steps:"
echo "  1. Open ios/App/App.xcodeproj in Xcode"
echo "  2. Set Bundle Identifier to: com.pesta.app"
echo "  3. Set Team in Signing & Capabilities"
echo "  4. Product → Archive → Distribute App → App Store Connect"
