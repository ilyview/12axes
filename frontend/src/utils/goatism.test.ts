import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QuizResult } from '../types/quiz';
import { applyGoatMode, GOATISM_STORAGE_KEY } from './goatism';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value)
  };
}

function baseResult(): QuizResult {
  return {
    topMatch: { name: 'Original ideology' },
    topPersonalityMatch: { name: 'Original personality' },
    topCountryMatch: { name: 'Original country' },
    personalityMatches: [{ name: 'Original personality' }, { name: 'Second personality' }, { name: 'Third personality' }]
  } as unknown as QuizResult;
}

describe('applyGoatMode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the original result when goat mode is off', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    const result = baseResult();

    expect(applyGoatMode(result)).toBe(result);
  });

  it('overrides the downloaded matches when goat mode is on', () => {
    vi.stubGlobal('localStorage', memoryStorage({ [GOATISM_STORAGE_KEY]: 'true' }));
    const result = applyGoatMode(baseResult());

    expect(result.topMatch.name).toBe('Raw Goatism');
    expect(result.topPersonalityMatch.name).toBe('Goatis');
    expect(result.topCountryMatch.name).toBe('Latvia');
    expect(result.personalityMatches.map((match) => match.name)).toEqual([
      'Goatis',
      'Aajonus Vonderplanitz',
      'Third personality'
    ]);
  });
});
