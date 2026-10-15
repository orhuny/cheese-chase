import { astronautMouse } from './astronaut';
import { chefMouse } from './chef';
import { classicMouse } from './classic';
import type { MouseSkin } from './MouseSkin';
import { ninjaMouse } from './ninja';
import { pirateMouse } from './pirate';
import { spriteMouse } from './spriteSkin';

/**
 * Every mouse in the game, drawn from the pictures in art/source/ (the code-drawn versions are the fallback).
 * To add one: see MouseSkin.ts, then add it here and to SKIN_OFFERS in config/economy.ts.
 */
export const SKINS: readonly MouseSkin[] = [
  spriteMouse(classicMouse, 'mouse_classic'),
  spriteMouse(ninjaMouse, 'mouse_ninja'),
  spriteMouse(chefMouse, 'mouse_chef'),
  spriteMouse(pirateMouse, 'mouse_pirate'),
  spriteMouse(astronautMouse, 'mouse_astronaut'),
];

export const DEFAULT_SKIN_ID = classicMouse.id;

export function getSkin(id: string): MouseSkin {
  return SKINS.find(s => s.id === id) ?? SKINS[0];
}
