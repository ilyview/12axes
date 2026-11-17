import { useEffect, useState } from 'react';

/**
 * Configurações da pessoa, só neste navegador (localStorage): o botão rosa do modo nya, os perfis de brincadeira
 * e os eixos do teste. Sem localStorage (aba anônima, bloqueio) tudo volta ao padrão e o site funciona igual.
 *
 * O script do modo nya (public/cute/cute-mode.js) lê a mesma chave e ouve o mesmo evento, porque roda fora do React
 * e também nas páginas estáticas dos catálogos.
 */
export const SETTINGS_KEY = '12axes-settings';
export const SETTINGS_EVENT = 'axes-settings-change';

export interface UserSettings {
  /** O botão rosa (modo nya) aparece. Desligado, o modo nya também desliga. */
  cuteButton: boolean;
  /** Perfis de brincadeira (países e ideologias de fantasia, personagens de amigos) entram nos resultados. */
  jokes: boolean;
  /** Eixos desligados: as perguntas deles saem do teste e o eixo sai do resultado e da compatibilidade. */
  disabledAxes: string[];
}

export const DEFAULT_SETTINGS: UserSettings = { cuteButton: true, jokes: true, disabledAxes: [] };

export function loadSettings(): UserSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      cuteButton: parsed.cuteButton !== false,
      jokes: parsed.jokes !== false,
      disabledAxes: Array.isArray(parsed.disabledAxes) ? parsed.disabledAxes.filter((id) => typeof id === 'string') : []
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Sem armazenamento a configuração vale só até recarregar a página.
  }
  current = settings;
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
}

let current: UserSettings | null = null;

/** Configuração atual (lida uma vez e atualizada a cada mudança). */
export function getSettings(): UserSettings {
  if (!current) current = typeof window === 'undefined' ? DEFAULT_SETTINGS : loadSettings();
  return current;
}

export function useSettings(): UserSettings {
  const [settings, setSettings] = useState(getSettings);
  useEffect(() => {
    const sync = () => {
      current = loadSettings();
      setSettings(current);
    };
    const onChange = (event: Event) => setSettings((event as CustomEvent<UserSettings>).detail);
    window.addEventListener(SETTINGS_EVENT, onChange);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, onChange);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return settings;
}

/** Parâmetro que esconde os perfis de brincadeira nas chamadas da API ("" quando aparecem). */
export function jokesQueryParam(settings: UserSettings = getSettings()): string {
  return settings.jokes ? '' : 'jokes=off';
}

/** Eixos ligados, na ordem recebida. Nunca devolve lista vazia: com tudo desligado, vale tudo. */
export function enabledAxisIds(allAxisIds: readonly string[], settings: UserSettings = getSettings()): string[] {
  const enabled = allAxisIds.filter((id) => !settings.disabledAxes.includes(id));
  return enabled.length ? enabled : [...allAxisIds];
}
