const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\Aryan\\OneDrive\\Desktop\\Software (1)\\Software\\Gk auto';
const destDir = 'C:\\Users\\Aryan\\OneDrive\\Desktop\\Software (1)\\Software\\client\\public\\products';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
console.log('Files in source:', files);

const productMapping = {
  'ChatGPT Image Jul 18, 2026, 02_02_48 PM.png': 'microfiber_40x60_800gsm.png',
  'ChatGPT Image Jul 18, 2026, 02_07_50 PM.png': 'microfiber_40x40_smooth_fur.png',
  'ChatGPT Image Jul 18, 2026, 02_09_42 PM.png': 'microfiber_40x40_heavy_fur.png',
  'ChatGPT Image Jul 18, 2026, 02_14_52 PM.png': 'astonish_damping_2.8_plus.png',
  'ChatGPT Image Jul 18, 2026, 02_21_11 PM.png': 'side_consol.png',
  'ChatGPT Image Jul 18, 2026, 02_26_25 PM.png': 'side_consol_fix.png',
  'ChatGPT Image Jul 18, 2026, 02_27_46 PM.png': 'hook.png',
  'ChatGPT Image Jul 18, 2026, 02_34_22 PM.png': 'tissue_cover.png',
  'ChatGPT Image Jul 18, 2026, 02_37_15 PM.png': 'tissue_cover_heavy.png',
  'ChatGPT Image Jul 18, 2026, 02_48_56 PM.png': 'seat_cover.png',
  'ChatGPT Image Jul 18, 2026, 02_50_55 PM.png': 'memory_neck_rest.png',
  'ChatGPT Image Jul 18, 2026, 02_53_42 PM.png': 'memory_cushion_pillow.png',
  'ChatGPT Image Jul 18, 2026, 03_06_01 PM.png': 'tyre_inflator.png',
  'ChatGPT Image Jul 18, 2026, 04_05_55 PM.png': 'car_vacuum.png',
  'ChatGPT Image Jul 18, 2026, 04_14_55 PM.png': 'cross_body_bag.png'
};

Object.entries(productMapping).forEach(([srcFile, destFile]) => {
  const srcPath = path.join(srcDir, srcFile);
  const destPath = path.join(destDir, destFile);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${srcFile} to ${destFile}`);
  } else {
    console.error(`Source file does not exist: ${srcPath}`);
  }
});
