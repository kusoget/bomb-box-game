// BOXBOM の iOS アイコン/スプラッシュ素材を生成する。
// 既存のブランドマーク bomb-mark.png（透過・正方形）を、ブランドのグラデ背景（不透明）に
// 乗せて @capacitor/assets が食える assets/icon.png / splash.png を作る。
// iOSアイコンは透過不可（黒くなる）なので必ず不透明で書き出す。
//
// 実行: node scripts/make-ios-assets.mjs

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const MARK = 'public/images/boxbom/bomb-mark.png';
const OUT = 'assets';

/** ブランドのグラデ背景SVG（ピンク→紫→深紫 + 中央の淡い発光） */
function backgroundSVG(size) {
    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#FF2D7E"/>
        <stop offset="0.52" stop-color="#7A1FA6"/>
        <stop offset="1" stop-color="#241046"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.55">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#g)"/>
    <rect width="${size}" height="${size}" fill="url(#glow)"/>
  </svg>`);
}

/**
 * markRatio: 正方形キャンバスに対するマークの幅比率。
 * アイコンは大きめ(0.80)、スプラッシュは小さめ(0.34)で中央に。
 */
async function compose(size, markRatio, outFile) {
    const markW = Math.round(size * markRatio);
    const mark = await sharp(MARK).resize(markW, markW, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    const offset = Math.round((size - markW) / 2);

    await sharp(backgroundSVG(size))
        .composite([{ input: mark, top: offset, left: offset }])
        .flatten({ background: '#241046' }) // 透過を潰して不透明に
        .png()
        .toFile(outFile);
    console.log('✓', outFile, `${size}x${size}`);
}

await mkdir(OUT, { recursive: true });
// アイコン（1024, 不透明, マーク大）
await compose(1024, 0.80, `${OUT}/icon.png`);
// スプラッシュ（2732, 中央にマーク小）。ライト/ダーク共通の濃い背景
await compose(2732, 0.34, `${OUT}/splash.png`);
await compose(2732, 0.34, `${OUT}/splash-dark.png`);
console.log('done');
