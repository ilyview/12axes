/*
 * Nya mode on the share cards (see utils/nya.ts and public/cute/cute-mode.js).
 * renderSharePng calls these when the paw button is on MAX (2) or HYPER (3):
 *   - the card's text is uwu-ified and the ideology becomes UwUism (nyaPrepareTarget),
 *   - the background becomes a pink gradient (MAX) or a bright pastel rainbow (HYPER) with paws, hearts and sparkles,
 *   - mascots peek in: a kitten in the top right on MAX, plus a mascot next to the QR and two at the edges on HYPER.
 * Nothing is drawn over the QR code, and the QR gets its own backing plate so it still scans on the brighter colours.
 */
import { nyaAssetBase, nyaCuteTree, nyaNamesReady } from './nya';

type Rect = { x: number; y: number; width: number; height: number };

/** The colour the card's portrait and fades blend into (replaces the ideology colour). */
export function nyaBaseColor(level: number): string {
  return level >= 3 ? '#ff5fa8' : '#e8338a';
}

/** Uwu-ifies the off-screen card and makes its text readable on the new background. */
export async function nyaPrepareTarget(target: HTMLElement, level: number): Promise<void> {
  // The card sits in the page while it is drawn: keep the page-wide uwu pass off it (it would uwu it twice).
  target.parentElement?.setAttribute('data-nya-skip', '');
  await nyaNamesReady(2500);
  nyaCuteTree(target);
  const color = getComputedStyle(target).color;
  const light = luminance(color) > 0.5;
  target.style.textShadow = light
    ? level >= 3
      ? '0 2px 0 rgba(150, 0, 80, 0.55), 0 0 14px rgba(150, 0, 80, 0.5)'
      : '0 2px 8px rgba(120, 0, 60, 0.35)'
    : '0 0 10px rgba(255, 255, 255, 0.9)';
  // The header label (top right) makes room for the kitten.
  target.querySelectorAll<HTMLElement>('[data-nya-label]').forEach((label) => {
    label.style.visibility = 'hidden';
  });
}

function luminance(cssColor: string): number {
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(cssColor);
  if (!m) return 1;
  return (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) / 255;
}

export function drawNyaBackground(ctx: CanvasRenderingContext2D, level: number) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const hyper = level >= 3;
  const fill = ctx.createLinearGradient(0, 0, W, H);
  const stops = hyper
    ? ['#ff6fb5', '#ff9fc9', '#c792ff', '#7fc8ff', '#ff8cc6']
    : ['#ff4f9a', '#e8338a', '#b44dff'];
  stops.forEach((stop, i) => fill.addColorStop(i / (stops.length - 1), stop));
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, W, H);

  // soft glowing blobs
  const blobs: [number, number, number, number][] = hyper
    ? [[W, 0, 520, 0.55], [0, H * 0.45, 460, 0.4], [W * 0.7, H, 520, 0.45], [W * 0.2, H * 0.08, 300, 0.35]]
    : [[W, 0, 420, 0.25], [0, H, 460, 0.18]];
  blobs.forEach(([x, y, r, a]) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });

  // paw-print pattern
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${hyper ? 0.16 : 0.1})`;
  const step = 150;
  for (let y = 40; y < H; y += step) {
    for (let x = (y / step) % 2 ? 20 : 95; x < W; x += step) {
      paw(ctx, x, y, 22, -0.25 + ((x + y) % 3) * 0.2);
    }
  }
  ctx.restore();

  // scattered hearts and sparkles
  const rand = seeded(level * 99 + 7);
  for (let i = 0; i < (hyper ? 70 : 32); i++) {
    const x = rand() * W;
    const y = rand() * H;
    const s = 10 + rand() * (hyper ? 26 : 18);
    ctx.fillStyle = `rgba(255,255,255,${0.18 + rand() * (hyper ? 0.4 : 0.22)})`;
    if (i % 2) heart(ctx, x, y, s);
    else sparkle(ctx, x, y, s);
  }
}

/** Drawn on top of everything: a frame, stickers and the mascots (never over the QR). */
export async function drawNyaOverlay(ctx: CanvasRenderingContext2D, level: number, target: HTMLElement) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const hyper = level >= 3;
  const base = nyaAssetBase();

  // frame inside the 64px margin: white dashed line (MAX) or rainbow band with hearts (HYPER)
  ctx.save();
  if (hyper) {
    const band = ctx.createLinearGradient(0, 0, W, H);
    ['#ff5fa2', '#ffb86b', '#ffe66b', '#7bffb0', '#6bd6ff', '#b98bff', '#ff5fa2'].forEach((c, i, a) => band.addColorStop(i / (a.length - 1), c));
    ctx.strokeStyle = band;
    ctx.lineWidth = 14;
    roundRect(ctx, { x: 18, y: 18, width: W - 36, height: H - 36 }, 46);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 4;
    roundRect(ctx, { x: 32, y: 32, width: W - 64, height: H - 64 }, 36);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let x = 90; x < W - 60; x += 110) {
      heart(ctx, x, 18, 16);
      heart(ctx, x, H - 18, 16);
    }
    for (let y = 120; y < H - 60; y += 130) {
      heart(ctx, 18, y, 16);
      heart(ctx, W - 18, y, 16);
    }
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 14]);
    roundRect(ctx, { x: 26, y: 26, width: W - 52, height: H - 52 }, 40);
    ctx.stroke();
  }
  ctx.restore();

  const names = hyper ? ['mascot-2', 'mascot-5', 'mascot-3', 'mascot-4'] : ['mascot-2'];
  const images = await Promise.all(names.map((name) => load(`${base}${name}.webp`).catch(() => null)));
  const [kitten, star, bunny, berry] = images;

  // kitten in the top right, where the header label was
  if (kitten) sticker(ctx, kitten, W - 206, 4, 170, 0.12);

  if (hyper) {
    // in the footer's empty middle, between the text and the QR (skipped when the text leaves no room)
    const footer = target.querySelector<HTMLElement>('[data-nya-footer]');
    const text = footer?.firstElementChild as HTMLElement | null;
    const qr = footer?.querySelector<HTMLElement>('[data-share-image="qr"]');
    if (star && footer && text && qr) {
      const rootRect = target.getBoundingClientRect();
      const left = text.getBoundingClientRect().right - rootRect.left;
      const right = qr.getBoundingClientRect().left - rootRect.left;
      const box = footer.getBoundingClientRect();
      const size = Math.min(200, right - left - 24, box.height + 40);
      if (size >= 90) {
        sticker(ctx, star, (left + right) / 2 - size / 2, box.bottom - rootRect.top - size + 4, size, -0.08);
      }
    }
    // peeking in from the left and right edges, inside the margin
    if (bunny) sticker(ctx, bunny, -64, H * 0.42, 130, 0.25);
    if (berry) sticker(ctx, berry, W - 66, H * 0.6, 130, -0.25);
    // a "nya~" sticker on the top-left corner
    ctx.save();
    ctx.translate(150, 34);
    ctx.rotate(-0.12);
    ctx.font = '400 34px "Mochiy Pop One", "M PLUS Rounded 1c", sans-serif';
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.lineJoin = 'round';
    ctx.strokeText('✧ nya~ ✧', 0, 0);
    ctx.fillStyle = '#ff1f8f';
    ctx.fillText('✧ nya~ ✧', 0, 0);
    ctx.restore();
  }
}

/** Plate behind the QR so it keeps its contrast on the brighter backgrounds. */
export function drawNyaQrPlate(ctx: CanvasRenderingContext2D, rect: Rect, tint: string) {
  const lightModules = luminance(hexToRgbCss(tint)) > 0.5;
  ctx.save();
  ctx.fillStyle = lightModules ? '#9e1b5c' : '#ffffff';
  ctx.shadowColor = 'rgba(255,255,255,0.8)';
  ctx.shadowBlur = 18;
  roundRect(ctx, { x: rect.x - 16, y: rect.y - 16, width: rect.width + 32, height: rect.height + 32 }, 22);
  ctx.fill();
  ctx.restore();
}

function hexToRgbCss(color: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function sticker(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, size: number, angle: number) {
  const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
  const w = image.naturalWidth * scale;
  const h = image.naturalHeight * scale;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(angle);
  ctx.shadowColor = 'rgba(160, 0, 80, 0.35)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => reject(new Error('timeout')), 8000);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Could not load ' + src));
    };
    image.src = new URL(src, window.location.href).href;
  });
}

function paw(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.45, r * 0.62, r * 0.52, 0, 0, Math.PI * 2);
  ctx.ellipse(-r * 0.78, -r * 0.2, r * 0.26, r * 0.34, -0.3, 0, Math.PI * 2);
  ctx.ellipse(-r * 0.3, -r * 0.68, r * 0.26, r * 0.36, -0.1, 0, Math.PI * 2);
  ctx.ellipse(r * 0.3, -r * 0.68, r * 0.26, r * 0.36, 0.1, 0, Math.PI * 2);
  ctx.ellipse(r * 0.78, -r * 0.2, r * 0.26, r * 0.34, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.9, y - s * 0.25, x - s * 0.45, y - s * 0.95, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 0.9, y - s * 0.25, x, y + s * 0.35);
  ctx.fill();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  ctx.beginPath();
  ctx.moveTo(r.x + radius, r.y);
  ctx.arcTo(r.x + r.width, r.y, r.x + r.width, r.y + r.height, radius);
  ctx.arcTo(r.x + r.width, r.y + r.height, r.x, r.y + r.height, radius);
  ctx.arcTo(r.x, r.y + r.height, r.x, r.y, radius);
  ctx.arcTo(r.x, r.y, r.x + r.width, r.y, radius);
  ctx.closePath();
}

function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
