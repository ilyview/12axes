import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, enabledAxisIds, jokesQueryParam } from './settings';
import { vectorHash } from './entitlement';

describe('configurações', () => {
  const ALL = ['estrutura', 'religiao', 'moral'];

  it('eixos desligados saem; com tudo desligado, vale tudo', () => {
    expect(enabledAxisIds(ALL, { ...DEFAULT_SETTINGS, disabledAxes: ['religiao'] })).toEqual(['estrutura', 'moral']);
    expect(enabledAxisIds(ALL, { ...DEFAULT_SETTINGS, disabledAxes: ALL })).toEqual(ALL);
  });

  it('perfis de brincadeira só saem quando desligados', () => {
    expect(jokesQueryParam(DEFAULT_SETTINGS)).toBe('');
    expect(jokesQueryParam({ ...DEFAULT_SETTINGS, jokes: false })).toBe('jokes=off');
  });

  it('o hash de um resultado antigo não muda com os eixos novos vazios, e muda com um eixo desligado no meio', async () => {
    const legacy = Array.from({ length: 12 }, () => 55);
    expect(await vectorHash([...legacy, null, null])).toBe(await vectorHash(legacy));
    expect(await vectorHash([...legacy.slice(0, 3), null, ...legacy.slice(4)])).not.toBe(await vectorHash(legacy));
  });
});
