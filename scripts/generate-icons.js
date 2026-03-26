const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { createNodeLogger } = require('./helpers/node-logger.cjs');

const log = createNodeLogger('generate-icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconPath = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  log.banner('Generating PWA icons');
  log.stage('Render PNG icons');

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    try {
      await sharp(iconPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      log.ok(`Generated ${size}x${size} icon`);
    } catch (error) {
      log.error(`Failed to generate ${size}x${size} icon: ${error.message}`);
    }
  }

  // Generate apple-touch-icon
  try {
    await sharp(iconPath)
      .resize(180, 180)
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));
    log.ok('Generated apple-touch-icon');
  } catch (error) {
    log.error(`Failed to generate apple-touch-icon: ${error.message}`);
  }

  // Generate favicon
  try {
    await sharp(iconPath)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon.ico'));
    log.ok('Generated favicon.ico');
  } catch (error) {
    log.error(`Failed to generate favicon: ${error.message}`);
  }

  log.ok('Done!');
}

generateIcons();
