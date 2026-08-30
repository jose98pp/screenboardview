export interface TeamPresetInfo {
  id: string;
  name: string;
  shortName: string;
  color: string;
  secondaryColor?: string;
  logoEmoji: string;
  logoUrl?: string;
  category: 'laliga' | 'futbol' | 'basket' | 'esports' | 'generic';
}

export interface CompetitionPreset {
  id: string;
  name: string;
  shortName: string;
  color: string;
  logoUrl?: string;
  logoSvg?: string;
}

// Built-in SVG data URIs for crystal clear crest rendering in OBS without external network failures
export const LALIGA_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="white"><path d="M28 20 L52 20 L38 52 L62 52 L36 82 L48 58 L24 58 Z" fill="%23ffffff"/></svg>`;

export const ATHLETIC_CLUB_LOGO = `https://upload.wikimedia.org/wikipedia/en/thumb/9/98/Club_Athletic_Bilbao_logo.svg/200px-Club_Athletic_Bilbao_logo.svg.png`;
export const REAL_MADRID_LOGO = `https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/200px-Real_Madrid_CF.svg.png`;
export const BARCELONA_LOGO = `https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/200px-FC_Barcelona_%28crest%29.svg.png`;
export const ATLETICO_MADRID_LOGO = `https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/Atletico_Madrid_2017_logo.svg/200px-Atletico_Madrid_2017_logo.svg.png`;
export const BETIS_LOGO = `https://upload.wikimedia.org/wikipedia/en/thumb/1/13/Real_betis_logo.svg/200px-Real_betis_logo.svg.png`;
export const SEVILLA_LOGO = `https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/Sevilla_FC_logo.svg/200px-Sevilla_FC_logo.svg.png`;
export const REAL_SOCIEDAD_LOGO = `https://upload.wikimedia.org/wikipedia/en/thumb/f/f1/Real_Sociedad_logo.svg/200px-Real_Sociedad_logo.svg.png`;
export const VALENCIA_LOGO = `https://upload.wikimedia.org/wikipedia/en/thumb/c/ce/Valenciacf.svg/200px-Valenciacf.svg.png`;

export const COMPETITION_PRESETS: CompetitionPreset[] = [
  {
    id: 'laliga',
    name: 'LALIGA EA SPORTS',
    shortName: 'LALIGA',
    color: '#ff2b42',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/LaLiga_EA_Sports_2023_Vertical_Logo.svg/200px-LaLiga_EA_Sports_2023_Vertical_Logo.svg.png',
  },
  {
    id: 'champions',
    name: 'UEFA Champions League',
    shortName: 'UCL',
    color: '#001438',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/bf/UEFA_Champions_League_logo_2.svg/200px-UEFA_Champions_League_logo_2.svg.png',
  },
  {
    id: 'premier',
    name: 'Premier League',
    shortName: 'PL',
    color: '#3d195b',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Premier_League_Logo.svg/200px-Premier_League_Logo.svg.png',
  },
  {
    id: 'kingsleague',
    name: 'Kings League InfoJobs',
    shortName: 'KINGS',
    color: '#f59e0b',
  },
  {
    id: 'nba',
    name: 'NBA Basketball',
    shortName: 'NBA',
    color: '#1d428a',
  },
  {
    id: 'custom_tourney',
    name: 'Torneo Personalizado',
    shortName: 'LIVE',
    color: '#4f46e5',
  },
];

export const POPULAR_TEAMS_PRESETS: TeamPresetInfo[] = [
  // LaLiga
  {
    id: 'athletic',
    name: 'Athletic Club',
    shortName: 'ATH',
    color: '#ee2524',
    secondaryColor: '#ffffff',
    logoEmoji: '🔴',
    logoUrl: ATHLETIC_CLUB_LOGO,
    category: 'laliga',
  },
  {
    id: 'real_madrid',
    name: 'Real Madrid',
    shortName: 'RMA',
    color: '#00529f',
    secondaryColor: '#ffffff',
    logoEmoji: '👑',
    logoUrl: REAL_MADRID_LOGO,
    category: 'laliga',
  },
  {
    id: 'barcelona',
    name: 'FC Barcelona',
    shortName: 'FCB',
    color: '#004d98',
    secondaryColor: '#a50044',
    logoEmoji: '🔵',
    logoUrl: BARCELONA_LOGO,
    category: 'laliga',
  },
  {
    id: 'atletico',
    name: 'Atlético de Madrid',
    shortName: 'ATM',
    color: '#cb3524',
    secondaryColor: '#ffffff',
    logoEmoji: '⚪',
    logoUrl: ATLETICO_MADRID_LOGO,
    category: 'laliga',
  },
  {
    id: 'betis',
    name: 'Real Betis',
    shortName: 'BET',
    color: '#00954c',
    secondaryColor: '#ffffff',
    logoEmoji: '🟢',
    logoUrl: BETIS_LOGO,
    category: 'laliga',
  },
  {
    id: 'sevilla',
    name: 'Sevilla FC',
    shortName: 'SEV',
    color: '#d4001f',
    secondaryColor: '#ffffff',
    logoEmoji: '⚪',
    logoUrl: SEVILLA_LOGO,
    category: 'laliga',
  },
  {
    id: 'real_sociedad',
    name: 'Real Sociedad',
    shortName: 'RSO',
    color: '#0067b1',
    secondaryColor: '#ffffff',
    logoEmoji: '🔵',
    logoUrl: REAL_SOCIEDAD_LOGO,
    category: 'laliga',
  },
  {
    id: 'valencia',
    name: 'Valencia CF',
    shortName: 'VAL',
    color: '#ee7500',
    secondaryColor: '#000000',
    logoEmoji: '🦇',
    logoUrl: VALENCIA_LOGO,
    category: 'laliga',
  },
  // Other popular
  {
    id: 'boca',
    name: 'Boca Juniors',
    shortName: 'BOC',
    color: '#003366',
    secondaryColor: '#ffcc00',
    logoEmoji: '⭐',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Boca_escudo.png/200px-Boca_escudo.png',
    category: 'futbol',
  },
  {
    id: 'river',
    name: 'River Plate',
    shortName: 'RIV',
    color: '#e51a2e',
    secondaryColor: '#ffffff',
    logoEmoji: '⚪',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Logo_River_Plate.svg/200px-Logo_River_Plate.svg.png',
    category: 'futbol',
  },
  {
    id: 'inter_miami',
    name: 'Inter Miami CF',
    shortName: 'MIA',
    color: '#f7b5cd',
    secondaryColor: '#231f20',
    logoEmoji: '🦩',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Inter_Miami_CF_logo.svg/200px-Inter_Miami_CF_logo.svg.png',
    category: 'futbol',
  },
  {
    id: 'man_city',
    name: 'Manchester City',
    shortName: 'MCI',
    color: '#6cabdd',
    secondaryColor: '#1c2c5b',
    logoEmoji: '⛵',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/200px-Manchester_City_FC_badge.svg.png',
    category: 'futbol',
  },
  // Esports
  {
    id: 'koi',
    name: 'KOI Squad',
    shortName: 'KOI',
    color: '#7022e6',
    logoEmoji: '🐟',
    category: 'esports',
  },
  {
    id: 'heretics',
    name: 'Team Heretics',
    shortName: 'HRT',
    color: '#eab308',
    logoEmoji: '💀',
    category: 'esports',
  },
  {
    id: 'giants',
    name: 'Giants Gaming',
    shortName: 'GIA',
    color: '#0284c7',
    logoEmoji: '🗿',
    category: 'esports',
  },
  {
    id: 'karmine',
    name: 'Karmine Corp',
    shortName: 'KC',
    color: '#0052cc',
    logoEmoji: '🦅',
    category: 'esports',
  },
];
