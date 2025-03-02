#!/bin/bash

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "ImageMagick is not installed. Please install it first."
    exit 1
fi

# Create directory for screenshots if it doesn't exist
mkdir -p screenshots

# Generate icons
echo "Generating icons..."

# Create a base SVG for our icon
cat > temp_icon.svg << EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <circle cx="256" cy="256" r="256" fill="#FF0000" />
  <path d="M256 128 A128 128 0 0 1 384 256" stroke="white" stroke-width="32" fill="none" stroke-linecap="round" />
  <circle cx="160" cy="280" r="48" stroke="white" stroke-width="32" fill="none" />
  <circle cx="352" cy="280" r="48" stroke="white" stroke-width="32" fill="none" />
</svg>
EOF

# Convert SVG to PNG icons
convert -background none temp_icon.svg -resize 192x192 android-chrome-192x192.png
convert -background none temp_icon.svg -resize 512x512 android-chrome-512x512.png
convert -background none temp_icon.svg -resize 180x180 apple-touch-icon.png
convert -background none temp_icon.svg -resize 32x32 favicon-32x32.png
convert -background none temp_icon.svg -resize 16x16 favicon-16x16.png

# Create desktop screenshot
convert -size 1280x800 xc:#f8f9fa \
    -fill "#FF0000" -draw "rectangle 0,0 1280,120" \
    -fill "#FF0000" -draw "circle 640,250 640,350" \
    -fill white -draw "rectangle 128,400 1152,480" \
    -fill white -draw "rectangle 128,520 1152,600" \
    -fill white -draw "rectangle 128,640 1152,720" \
    screenshots/desktop.png

# Create mobile screenshot
convert -size 414x896 xc:#f8f9fa \
    -fill "#FF0000" -draw "rectangle 0,0 414,120" \
    -fill "#FF0000" -draw "circle 207,250 207,300" \
    -fill white -draw "rectangle 41,400 373,480" \
    -fill white -draw "rectangle 41,520 373,600" \
    -fill white -draw "rectangle 41,640 373,720" \
    screenshots/mobile.png

# Clean up
rm temp_icon.svg

echo "All icons and screenshots generated successfully!" 