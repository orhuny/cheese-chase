import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

export const isNativeApp = Capacitor.isNativePlatform();

/** Hides the launch screen once the game has drawn its first frame (iPhone app only). */
export function hideSplashWhenReady(): void {
  if (!isNativeApp) return;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    SplashScreen.hide().catch(() => { /* already hidden */ });
  }));
}
