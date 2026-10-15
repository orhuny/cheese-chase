import manifest from '../assets/sprites/sprites.json';

/**
 * Image sprites made by `npm run art` from the pictures in art/source/.
 * sprites.json says where each picture was trimmed from its original image,
 * so pictures made from the same template (the mice) line up exactly.
 */
export type SpriteId = keyof typeof manifest;

export interface SpriteInfo {
  file: string;
  srcW: number; srcH: number;   // original image size
  trimX: number; trimY: number; // where the trimmed picture starts in the original
  trimW: number; trimH: number; // trimmed size, in original pixels
  outW: number; outH: number;   // size of the file in the app
  bottomColor?: string;         // repeating strips: colour to continue below the picture
  groundLine?: number;          // grass edge: where the ground surface is (0 = top, 1 = bottom)
}

export interface Sprite extends SpriteInfo {
  img: HTMLImageElement;
}

const URLS = import.meta.glob('../assets/sprites/*.{png,jpg}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const loaded = new Map<SpriteId, Sprite>();

export function spriteInfo(id: SpriteId): SpriteInfo {
  return manifest[id];
}

/** The sprite, or undefined while it is still loading (callers then draw their fallback). */
export function getSprite(id: SpriteId): Sprite | undefined {
  return loaded.get(id);
}

/**
 * Starts loading every sprite. Resolves when all are loaded, or after `timeoutMs`
 * at the latest (late images still appear as soon as they arrive).
 */
export function loadSprites(timeoutMs = 4000): Promise<void> {
  const jobs = (Object.keys(manifest) as SpriteId[]).map(id => new Promise<void>(resolve => {
    const info = manifest[id];
    const url = URLS[`../assets/sprites/${info.file}`];
    if (!url) { console.warn('[sprites] missing file', info.file); resolve(); return; }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { loaded.set(id, { ...info, img }); resolve(); };
    img.onerror = () => { console.warn('[sprites] could not load', info.file); resolve(); };
    img.src = url;
  }));
  return Promise.race([
    Promise.all(jobs).then(() => undefined),
    new Promise<void>(r => setTimeout(r, timeoutMs)),
  ]);
}
