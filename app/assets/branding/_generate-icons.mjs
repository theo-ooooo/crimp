// 일회성 앱 아이콘 자산 생성 — icon.png (1024×1024) 에서 iOS/Android 전 사이즈 출력.
//
// (PR-S1) bootsplash CLI 는 splash 만 처리하고 app icon 은 미지원. 라이트 모드용
// 단일 lime bg 아이콘만 만든다 — Android 12+ 의 themed icon (monochrome) 은 Phase 2.
// iOS 18 의 dark/tinted variant 도 동일하게 후속.
//
// 실행: node assets/branding/_generate-icons.mjs

import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = '/Users/kwkang/Workspace/crimp/app';
const SOURCE = path.join(ROOT, 'assets/branding/icon.png');

// iOS — AppIcon.appiconset.
const IOS_OUT = path.join(ROOT, 'ios/Crimp/Images.xcassets/AppIcon.appiconset');
const IOS_ICONS = [
  { size: 40,   name: 'icon-20@2x.png',       idiom: 'iphone',         scale: '2x', sizeKey: '20x20' },
  { size: 60,   name: 'icon-20@3x.png',       idiom: 'iphone',         scale: '3x', sizeKey: '20x20' },
  { size: 58,   name: 'icon-29@2x.png',       idiom: 'iphone',         scale: '2x', sizeKey: '29x29' },
  { size: 87,   name: 'icon-29@3x.png',       idiom: 'iphone',         scale: '3x', sizeKey: '29x29' },
  { size: 80,   name: 'icon-40@2x.png',       idiom: 'iphone',         scale: '2x', sizeKey: '40x40' },
  { size: 120,  name: 'icon-40@3x.png',       idiom: 'iphone',         scale: '3x', sizeKey: '40x40' },
  { size: 120,  name: 'icon-60@2x.png',       idiom: 'iphone',         scale: '2x', sizeKey: '60x60' },
  { size: 180,  name: 'icon-60@3x.png',       idiom: 'iphone',         scale: '3x', sizeKey: '60x60' },
  { size: 1024, name: 'icon-marketing.png',   idiom: 'ios-marketing',  scale: '1x', sizeKey: '1024x1024' },
];

// Android — mipmap-* 밀도별 ic_launcher / ic_launcher_round.
const ANDROID_OUT = path.join(ROOT, 'android/app/src/main/res');
const ANDROID_DENSITIES = [
  { dir: 'mipmap-mdpi',    size: 48 },
  { dir: 'mipmap-hdpi',    size: 72 },
  { dir: 'mipmap-xhdpi',   size: 96 },
  { dir: 'mipmap-xxhdpi',  size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

async function genSquare(size, outPath, { flattenAlpha = false } = {}) {
  let pipeline = sharp(SOURCE).resize(size, size);
  if (flattenAlpha) {
    // Apple App Store 마케팅 아이콘 (1024×1024) 은 알파 채널 금지 — 검증 단계에서 reject.
    pipeline = pipeline.flatten({ background: '#C9F84B' }).removeAlpha();
  }
  await pipeline.png().toFile(outPath);
}

async function genRound(size, outPath) {
  // Android 의 round launcher — 원형 마스크 + 알파.
  const buf = await sharp(SOURCE).resize(size, size).png().toBuffer();
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  await sharp(buf)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toFile(outPath);
}

async function main() {
  // iOS 출력 + Contents.json 갱신.
  await fs.mkdir(IOS_OUT, { recursive: true });
  for (const i of IOS_ICONS) {
    await genSquare(i.size, path.join(IOS_OUT, i.name), {
      flattenAlpha: i.idiom === 'ios-marketing',
    });
    console.log('ios', i.size, '→', i.name);
  }
  const contents = {
    images: IOS_ICONS.map((i) => ({
      idiom: i.idiom,
      scale: i.scale,
      size: i.sizeKey,
      filename: i.name,
    })),
    info: { author: 'crimp-icon-generator', version: 1 },
  };
  await fs.writeFile(
    path.join(IOS_OUT, 'Contents.json'),
    JSON.stringify(contents, null, 2) + '\n',
  );

  // Android 출력 — square + round.
  for (const d of ANDROID_DENSITIES) {
    const dir = path.join(ANDROID_OUT, d.dir);
    await fs.mkdir(dir, { recursive: true });
    await genSquare(d.size, path.join(dir, 'ic_launcher.png'));
    await genRound(d.size, path.join(dir, 'ic_launcher_round.png'));
    console.log('android', d.dir, d.size + 'px');
  }

  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
