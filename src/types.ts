export type BoardType = 
  | 'sports_match' 
  | 'leaderboard' 
  | 'tally_counter' 
  | 'stream_goal' 
  | 'esports_bo';

export type SportPreset = 
  | 'soccer' 
  | 'basketball' 
  | 'volleyball' 
  | 'tennis' 
  | 'padel' 
  | 'esports' 
  | 'futsal' 
  | 'boxing' 
  | 'generic';

export type OverlayLayout = 
  // Requested modern broadcast layouts:
  | 'scorebug_narrow'               // Scorebug: narrow (compact horizontal top scorebug)
  | 'scorebug_wide'                 // Scorebug: wide (wide broadcast top bar)
  | 'scorebug_narrow_logos_left'    // Scorebug: narrow, logos left (NEW!)
  | 'scorebug_wide_logos_left'      // Scorebug: wide, logos left (NEW!)
  | 'teams_stacked'                 // Scoreboard: teams stacked (Home top, Away bottom)
  | 'fullscreen_broadcast'          // Scoreboard: full-screen broadcast (Studio TV preview/halftime)
  | 'tv_broadcast_timer_below'      // Scoreboard: TV broadcast, timer below teams (LaLiga EA Sports Style NEW!)
  // Legacy layouts maintained for full compatibility:
  | 'top_scorebug'                  // Barra superior clásica
  | 'lower_third'                   // Banner inferior elegante (Esports / TV)
  | 'corner_box'                    // Caja compacta en esquina (Twitch / YouTube gaming)
  | 'side_tower'                    // Columna lateral vertical (Leaderboards, Clasificaciones)
  | 'fullscreen_card'               // Pantalla completa para pausas, entretiempo o intro
  | 'minimal_ticker';               // Tira ultra-minimalista

export type OverlayBackground = 
  | 'transparent' 
  | 'dark_glass' 
  | 'solid_dark' 
  | 'green_screen'
  | 'blue_screen';

export type FontFamilyChoice = 
  | 'Chakra Petch' 
  | 'Oswald' 
  | 'Bebas Neue' 
  | 'Orbitron' 
  | 'Montserrat' 
  | 'Inter' 
  | 'Press Start 2P';

export interface TeamData {
  id: string;
  name: string;
  shortName: string;
  score: number;
  sets: number;
  color: string;
  secondaryColor?: string;
  logoEmoji?: string;
  logoUrl?: string;
  fouls?: number;
  timeouts?: number;
  yellowCards?: number;
  redCards?: number;
  serving?: boolean;
}

export interface PlayerScore {
  id: string;
  name: string;
  avatarEmoji?: string;
  color: string;
  score: number;
  streak?: number;
  secondaryStat?: string;
}

export interface TallyItem {
  id: string;
  label: string;
  count: number;
  step: number;
  color: string;
}

export interface TimerState {
  enabled: boolean;
  seconds: number;
  initialSeconds: number;
  isRunning: boolean;
  direction: 'countup' | 'countdown';
  periodLabel: string; // e.g. "1T", "2T", "Q1", "SET 2", "FINAL", "ROUND 3"
  overtimeMinutes?: number;
  showMilliseconds?: boolean;
}

export interface OverlayCustomization {
  layout: OverlayLayout;
  background: OverlayBackground;
  fontFamily: FontFamilyChoice;
  scale: number; // 0.6 to 1.5
  accentColor: string;
  textColor: string;
  scoreCardColor: string;
  borderRadius: number; // 0 to 24 px
  showTimer: boolean;
  showPeriod: boolean;
  showLogos: boolean;
  showSets: boolean;
  showFouls: boolean;
  showPossession: boolean;
  showSponsorMessage: boolean;
  sponsorMessage: string;
  animationOnScore: 'bounce' | 'pulse' | 'glow' | 'none';
  soundEnabled: boolean;
  soundVolume: number;
  leagueName?: string;
  leagueLogoUrl?: string;
  leagueColor?: string;
  showLeagueBadge?: boolean;
}

export interface ScoreboardData {
  id: string;
  title: string;
  sport: SportPreset;
  type: BoardType;
  createdAt: number;
  updatedAt: number;
  
  // Teams (for sports & esports)
  homeTeam: TeamData;
  awayTeam: TeamData;
  bestOf?: number; // 1, 3, 5, 7 for esports
  
  // Timer & Period
  timer: TimerState;
  
  // Leaderboard players (for type === 'leaderboard')
  players: PlayerScore[];
  
  // Tallies (for type === 'tally_counter')
  tallies: TallyItem[];
  
  // Goal Bar (for type === 'stream_goal')
  goalConfig?: {
    current: number;
    target: number;
    title: string;
    unit: string;
    showPercentage: boolean;
  };
  
  // Overlay display settings
  overlay: OverlayCustomization;
}

export type ActiveView = 'dashboard' | 'controller' | 'overlay';
