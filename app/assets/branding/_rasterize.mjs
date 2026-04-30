// 일회성 SVG → PNG 변환 스크립트.
// (PR-S1) bootsplash CLI 입력으로 쓸 1024×1024 PNG 생성. qlmanage 가 alpha 를
// flatten 해 흰 배경을 박는 이슈가 있어 sharp(libvips) 로 직접 렌더한다.
// 실행:  node assets/branding/_rasterize.mjs
//
// (PR #113 리뷰 I2) 명명 규칙 — 파일명의 `light/dark` 접미어는 부울더 fill 색이 아닌
// "어떤 배경에 올릴지" 를 가리킨다:
//   splash-logo-light.png — **라이트 배경** 에 얹는 자산 → ink fill boulder
//   splash-logo-dark.png  — **다크 배경**  에 얹는 자산 → lime fill boulder
// 현재 splash bg 가 ink (#0D0F12) 이므로 실제 사용은 splash-logo-dark.png.
// 산출물: icon.png (lime bg + ink boulder), splash-logo-light/dark.png (투명 bg).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const HERE = new URL('.', import.meta.url).pathname;
const SIZE = 1024;

async function rasterize(name, svgString) {
  const out = path.join(HERE, `${name}.png`);
  await sharp(Buffer.from(svgString), { density: 384 })
    .resize(SIZE, SIZE, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(out);
  console.log('wrote', out);
}

// 부울더 폴리곤 — docs/design/claude/v2/Crimp Logo.html 의 boulder-mark 그대로.
const POINTS = '50,180 30,120 70,40 160,20 250,30 320,80 350,150 320,200 200,210 110,200';

// icon: 정사각 1024 + lime bg + ink 부울더 (수직·수평 중앙).
// 원본 polygon bounds 약 30..350 가로, 20..210 세로 → 320×190 ≒ 비율 1.68:1.
// 1024 정사각 안에 80% 영역 (820×486) 으로 스케일하면 polygon 폭 820×scale,
// scale = 820/320 ≒ 2.56. 위치는 중앙 (translate 으로 보정).
const iconScale = 2.56;
const iconW = 320 * iconScale; // 819.2
const iconH = 190 * iconScale; // 486.4
const iconX = (SIZE - iconW) / 2 - 30 * iconScale; // polygon left at 30
const iconY = (SIZE - iconH) / 2 - 20 * iconScale; // polygon top at 20

const icon = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="${SIZE}" height="${SIZE}" fill="#C9F84B"/>
  <g transform="translate(${iconX.toFixed(2)}, ${iconY.toFixed(2)}) scale(${iconScale})">
    <polygon points="${POINTS}" fill="#0F1419"/>
  </g>
</svg>`;

// splash logo: 정사각 1024 + 투명 bg + 부울더 (중앙). 색만 라이트/다크 다름.
function splash(fill) {
  const splashScale = 2.0; // 더 작게 — 스플래쉬는 여백이 넉넉해야 자연스러움.
  const w = 320 * splashScale;
  const h = 190 * splashScale;
  const x = (SIZE - w) / 2 - 30 * splashScale;
  const y = (SIZE - h) / 2 - 20 * splashScale;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <g transform="translate(${x.toFixed(2)}, ${y.toFixed(2)}) scale(${splashScale})">
    <polygon points="${POINTS}" fill="${fill}"/>
  </g>
</svg>`;
}

await rasterize('icon', icon);
await rasterize('splash-logo-light', splash('#0F1419'));
await rasterize('splash-logo-dark', splash('#C9F84B'));

// 소스 SVG 들도 최종 형태로 덮어써 둠 — git 에 함께 커밋해 재생성 가능하게.
await fs.writeFile(path.join(HERE, 'icon.svg'), icon);
await fs.writeFile(path.join(HERE, 'splash-logo-light.svg'), splash('#0F1419'));
await fs.writeFile(path.join(HERE, 'splash-logo-dark.svg'), splash('#C9F84B'));
console.log('source SVGs synced');
