// 일회성 SVG → PNG 변환 스크립트.
// (PR-S1) bootsplash CLI 입력으로 쓸 1024×1024 PNG 생성. qlmanage 가 alpha 를
// flatten 해 흰 배경을 박는 이슈가 있어 sharp(libvips) 로 직접 렌더한다.
// 실행:  node assets/branding/_rasterize.mjs
// 산출물: icon.png (lime bg + ink boulder), splash-logo-light.png (투명 bg +
// ink boulder, 1024×1024 정중앙), splash-logo-dark.png (투명 bg + lime boulder).

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

// splash logo: 정사각 1024 + 투명 bg + 부울더 + "crimp" 워드마크 오버레이.
// boulder fill 과 wordmark fill 은 항상 대비되어야 함 (워드마크가 부울더 위에 올라감).
//   light variant: ink boulder + lime wordmark — 라이트 bg 위에 사용 시 (현재 미사용).
//   dark  variant: lime boulder + ink wordmark — 현재 사용 중인 splash bg 가 ink 라
//                  boulder 가 lime 으로 떠 보이고, 그 위 wordmark 가 ink 로 박힘.
//
// (PR-S1 후속) 사용자 피드백 — 부울더 작아 보임 + 워드마크 추가 요청 반영.
//   scale 2.0 → 2.6 (icon 과 동일 톤), wordmark 는 CrimpLogo.tsx 의 좌표 (190, 130)
//   font-size 58 / letter-spacing -3.48 / weight 900 을 동일 스케일로 옮김.
function splash(boulderFill, wordmarkFill) {
  const s = 2.6;
  const w = 320 * s;
  const h = 190 * s;
  const x = (SIZE - w) / 2 - 30 * s; // polygon left at 30
  const y = (SIZE - h) / 2 - 20 * s; // polygon top at 20
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <g transform="translate(${x.toFixed(2)}, ${y.toFixed(2)}) scale(${s})">
    <polygon points="${POINTS}" fill="${boulderFill}"/>
    <text
      x="190"
      y="130"
      text-anchor="middle"
      font-family="Helvetica, -apple-system, system-ui, sans-serif"
      font-weight="900"
      font-size="58"
      letter-spacing="-3.48"
      fill="${wordmarkFill}"
    >crimp</text>
  </g>
</svg>`;
}

// boulder=ink, wordmark=lime — 라이트 bg(#FFFFFF) 위 표시용 (현재 미사용, 후속 옵션).
const splashLight = splash('#0F1419', '#C9F84B');
// boulder=lime, wordmark=ink — 다크 bg(#0D0F12) 위 표시용 (현재 사용 중).
const splashDark = splash('#C9F84B', '#0F1419');

await rasterize('icon', icon);
await rasterize('splash-logo-light', splashLight);
await rasterize('splash-logo-dark', splashDark);

// 소스 SVG 들도 최종 형태로 덮어써 둠 — git 에 함께 커밋해 재생성 가능하게.
await fs.writeFile(path.join(HERE, 'icon.svg'), icon);
await fs.writeFile(path.join(HERE, 'splash-logo-light.svg'), splashLight);
await fs.writeFile(path.join(HERE, 'splash-logo-dark.svg'), splashDark);
console.log('source SVGs synced');
