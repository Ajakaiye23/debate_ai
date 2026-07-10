// Generates the app icon / splash / adaptive-icon PNGs from inline SVG.
// Run: node store/gen-icons.mjs   (sharp is a devDependency)
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = join(ROOT, 'assets', 'images');

// Classic microphone glyph, drawn around center (512,469).
const mic = (fill, stroke) => `
  <g fill="${fill}">
    <rect x="412" y="232" width="200" height="356" rx="100"/>
    <rect x="497" y="582" width="30" height="120"/>
    <rect x="432" y="694" width="160" height="30" rx="15"/>
  </g>
  <path d="M 330 502 a 182 182 0 0 0 364 0" fill="none" stroke="${stroke}" stroke-width="30" stroke-linecap="round"/>
  <rect x="446" y="262" width="44" height="150" rx="22" fill="#FFFFFF" opacity="0.22"/>
`;

const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <radialGradient id="g" cx="50%" cy="42%" r="60%">
      <stop offset="0" stop-color="#FF5EE0" stop-opacity="0.55"/>
      <stop offset="0.45" stop-color="#7A3DFF" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#0E0016" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="#160022"/>
  <rect width="1024" height="1024" fill="url(#g)"/>
  ${mic('#FF5EE0', '#FF5EE0')}
</svg>`;

// Foreground for Android adaptive icon — glyph scaled into the safe zone, transparent bg.
const fgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(0.6) translate(-512 -469)">
    ${mic('#FF5EE0', '#FF5EE0')}
  </g>
</svg>`;

const monoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g transform="translate(512 512) scale(0.6) translate(-512 -469)">
    ${mic('#FFFFFF', '#FFFFFF')}
  </g>
</svg>`;

const buf = (svg) => Buffer.from(svg);

async function main() {
  // Main icon — no alpha (App Store requirement): flatten onto the solid base.
  await sharp(buf(fullSvg)).resize(1024, 1024).flatten({ background: '#160022' }).png().toFile(join(IMG, 'icon.png'));

  // Splash + Android adaptive foreground/monochrome — transparent.
  await sharp(buf(fgSvg)).resize(1024, 1024).png().toFile(join(IMG, 'splash-icon.png'));
  await sharp(buf(fgSvg)).resize(1024, 1024).png().toFile(join(IMG, 'android-icon-foreground.png'));
  await sharp(buf(monoSvg)).resize(1024, 1024).png().toFile(join(IMG, 'android-icon-monochrome.png'));

  // Solid adaptive background.
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#0E0016' } })
    .png()
    .toFile(join(IMG, 'android-icon-background.png'));

  console.log('Icons written to assets/images/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
