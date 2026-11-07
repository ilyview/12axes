import type { QuizResult } from '../types/quiz';

export const GOATISM_STORAGE_KEY = '12axes:goatism';

const RAW_GOATISM_IDEOLOGY = {
  ideologyId: 'raw-goatism',
  name: 'Raw Goatism',
  category: 'Raw',
  description:
    'A primal philosophy advocating the return to unprocessed, raw animal foods — raw meat, raw dairy, raw organs — as the foundation of human health and political sovereignty. Rejects industrial agriculture, the medical establishment, and the cooked-food consensus.',
  longDescription:
    'A primal philosophy advocating the return to unprocessed, raw animal foods — raw meat, raw dairy, raw organs — as the foundation of human health and political sovereignty. In practical terms: political values tend to be decentralized and anti-institutional; the economy tends to be agrarian and barter-based; social norms tend to be radically traditionalist and carnivore.',
  phrase:
    'I want a society where people eat raw meat, drink raw milk straight from the goat, and are free from the tyranny of the oven.',
  compatibility: 99.9,
};

const GOATIS_PERSONALITY = {
  personalityId: 'goatis',
  name: 'Goatis',
  role: 'Raw Meat Influencer & Primal Lifestyle Advocate',
  category: 'Raw' as never,
  lifespan: '1990s–present',
  description:
    'Online raw food advocate known for documenting his primal diet of raw meat, raw organs, and unpasteurised dairy. A leading voice in the modern raw animal food movement.',
  imagePath: '/personalities/portraits/goatis.jpg',
  compatibility: 99.9,
};

const AAJONUS_PERSONALITY = {
  personalityId: 'aajonus-vonderplanitz',
  name: 'Aajonus Vonderplanitz',
  role: 'Raw Food Pioneer & Author',
  category: 'Raw' as never,
  lifespan: '1947–2013',
  description:
    'American nutritional consultant and raw food advocate who developed the Primal Diet. Author of "We Want to Live" and the driving force behind the global raw meat movement.',
  imagePath: '/personalities/portraits/aajonus-vonderplanitz.jpg',
  compatibility: 97.4,
};

const LATVIA_COUNTRY = {
  countryId: 'letonia',
  name: 'Latvia',
  category: 'National-Atlanticist parliamentary republic',
  description:
    'A Baltic parliamentary republic, Latvia combines the EU, NATO and an open economy with defence of the Latvian language, citizenship withheld from part of the Russian-speaking minority, distrust of Russia and a Lutheran, Catholic and Orthodox society that is highly secular.',
  flagPath: '/countries/flags/letonia.png',
  historical: false,
  period: 'present',
  compatibility: 99.9,
};

export function readGoatMode(): boolean {
  try {
    return localStorage.getItem(GOATISM_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Overrides the result with the Raw Goatism easter egg when goat mode is on. */
export function applyGoatMode(result: QuizResult): QuizResult {
  if (!readGoatMode()) return result;
  return {
    ...result,
    topMatch: RAW_GOATISM_IDEOLOGY,
    topPersonalityMatch: GOATIS_PERSONALITY,
    personalityMatches: [GOATIS_PERSONALITY, AAJONUS_PERSONALITY, ...result.personalityMatches.slice(2)],
    topCountryMatch: LATVIA_COUNTRY,
  };
}
