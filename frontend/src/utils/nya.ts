import { useEffect, useState } from 'react';

/**
 * Bridge to "nya mode" (public/cute/cute-mode.js, the pink paw button). The script is plain JS loaded by
 * index.html; it exposes window.nyaMode and fires "nya-change" when the level changes.
 * Levels: 0 off, 1 pink, 2 MAX (uwu text, UwUism names), 3 HYPER.
 */
interface NyaApi {
  level(): number;
  text(s: string): string;
  cuteTree(el: HTMLElement): void;
  namesReady(ms?: number): Promise<void>;
  base: string;
}

function api(): NyaApi | null {
  if (typeof window === 'undefined') return null;
  return ((window as unknown as { nyaMode?: NyaApi }).nyaMode) ?? null;
}

export function nyaLevel(): number {
  return api()?.level() ?? 0;
}

/** Text as it should read on a share card now (unchanged below MAX). */
export function nyaText(text: string): string {
  const nya = api();
  return nya && nya.level() >= 2 ? nya.text(text) : text;
}

export function nyaCuteTree(el: HTMLElement): void {
  api()?.cuteTree(el);
}

export function nyaNamesReady(ms?: number): Promise<void> {
  return api()?.namesReady(ms) ?? Promise.resolve();
}

/** Folder of the mascot images (/cute/). */
export function nyaAssetBase(): string {
  return api()?.base ?? '/cute/';
}

/**
 * Changes whenever what a share card would look like changes (the level, or the cute names arriving),
 * so a preview can use it as a dependency and redraw itself.
 */
export function useNyaKey(): string {
  const [key, setKey] = useState(() => `${nyaLevel()}:0`);
  useEffect(() => {
    let names = 0;
    const onChange = () => setKey(`${nyaLevel()}:${names}`);
    const onNames = () => {
      names += 1;
      onChange();
    };
    window.addEventListener('nya-change', onChange);
    window.addEventListener('nya-names', onNames);
    onChange();
    return () => {
      window.removeEventListener('nya-change', onChange);
      window.removeEventListener('nya-names', onNames);
    };
  }, []);
  return key;
}
