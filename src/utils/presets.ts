import { ScoreboardData, SportPreset, BoardType } from '../types';

export const DEFAULT_OVERLAY_SETTINGS = {
  layout: 'tv_broadcast_timer_below' as const,
  background: 'transparent' as const,
  fontFamily: 'Chakra Petch' as const,
  scale: 1,
  accentColor: '#3b82f6',
  textColor: '#ffffff',
  scoreCardColor: '#0f172a',
  borderRadius: 10,
  showTimer: true,
  showPeriod: true,
  showLogos: true,
  showSets: true,
  showFouls: false,
  showPossession: true,
  showSponsorMessage: false,
  sponsorMessage: '🔴 EN VIVO • OBS STREAM',
  animationOnScore: 'pulse' as const,
  soundEnabled: true,
  soundVolume: 0.6,
};

export function createNewBoard(
  type: BoardType = 'sports_match',
  sport: SportPreset = 'soccer',
  customTitle?: string
): ScoreboardData {
  const id = 'sb_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  const now = Date.now();

  switch (type) {
    case 'sports_match': {
      if (sport === 'basketball') {
        return {
          id,
          title: customTitle || 'Partido de Baloncesto',
          sport: 'basketball',
          type: 'sports_match',
          createdAt: now,
          updatedAt: now,
          homeTeam: {
            id: 'team_home',
            name: 'LOCAL',
            shortName: 'LOC',
            score: 0,
            sets: 0,
            color: '#dc2626',
            logoEmoji: '🏀',
            fouls: 0,
            timeouts: 5,
            serving: true,
          },
          awayTeam: {
            id: 'team_away',
            name: 'VISITANTE',
            shortName: 'VIS',
            score: 0,
            sets: 0,
            color: '#2563eb',
            logoEmoji: '⚡',
            fouls: 0,
            timeouts: 5,
            serving: false,
          },
          timer: {
            enabled: true,
            seconds: 600, // 10:00 quarter
            initialSeconds: 600,
            isRunning: false,
            direction: 'countdown',
            periodLabel: 'Q1',
            showMilliseconds: true,
          },
          players: [],
          tallies: [],
          overlay: {
            ...DEFAULT_OVERLAY_SETTINGS,
            layout: 'scorebug_narrow',
            fontFamily: 'Montserrat',
            showFouls: true,
            showPossession: true,
          },
        };
      }

      if (sport === 'volleyball' || sport === 'padel' || sport === 'tennis') {
        return {
          id,
          title: customTitle || (sport === 'padel' ? 'Partido de Pádel' : sport === 'tennis' ? 'Partido de Tenis' : 'Partido de Voleibol'),
          sport,
          type: 'sports_match',
          createdAt: now,
          updatedAt: now,
          homeTeam: {
            id: 'team_home',
            name: 'Pareja A',
            shortName: 'PAR A',
            score: 0,
            sets: 0,
            color: '#10b981',
            logoEmoji: '🎾',
            serving: true,
          },
          awayTeam: {
            id: 'team_away',
            name: 'Pareja B',
            shortName: 'PAR B',
            score: 0,
            sets: 0,
            color: '#f59e0b',
            logoEmoji: '🔥',
            serving: false,
          },
          timer: {
            enabled: true,
            seconds: 0,
            initialSeconds: 0,
            isRunning: false,
            direction: 'countup',
            periodLabel: 'SET 1',
          },
          players: [],
          tallies: [],
          overlay: {
            ...DEFAULT_OVERLAY_SETTINGS,
            layout: 'scorebug_narrow',
            fontFamily: 'Inter',
            showSets: true,
            showPossession: true,
          },
        };
      }

      // Default Soccer / Futsal
      return {
        id,
        title: customTitle || 'Partido de Fútbol',
        sport: sport || 'soccer',
        type: 'sports_match',
        createdAt: now,
        updatedAt: now,
        homeTeam: {
          id: 'team_home',
          name: 'Real Madrid',
          shortName: 'RMA',
          score: 0,
          sets: 0,
          color: '#2563eb',
          logoEmoji: '👑',
          yellowCards: 0,
          redCards: 0,
          serving: true,
        },
        awayTeam: {
          id: 'team_away',
          name: 'FC Barcelona',
          shortName: 'FCB',
          score: 0,
          sets: 0,
          color: '#dc2626',
          logoEmoji: '🔵',
          yellowCards: 0,
          redCards: 0,
          serving: false,
        },
        timer: {
          enabled: true,
          seconds: 0,
          initialSeconds: 0,
          isRunning: false,
          direction: 'countup',
          periodLabel: '1T',
        },
        players: [],
        tallies: [],
        overlay: {
          ...DEFAULT_OVERLAY_SETTINGS,
          layout: 'tv_broadcast_timer_below',
          fontFamily: 'Oswald',
          showSets: false,
        },
      };
    }

    case 'esports_bo': {
      return {
        id,
        title: customTitle || 'Gran Final Esports (BO5)',
        sport: 'esports',
        type: 'esports_bo',
        bestOf: 5,
        createdAt: now,
        updatedAt: now,
        homeTeam: {
          id: 'team_home',
          name: 'Sentinels',
          shortName: 'SEN',
          score: 0,
          sets: 0,
          color: '#ef4444',
          logoEmoji: '🔴',
        },
        awayTeam: {
          id: 'team_away',
          name: 'Fnatic',
          shortName: 'FNC',
          score: 0,
          sets: 0,
          color: '#f97316',
          logoEmoji: '🟠',
        },
        timer: {
          enabled: true,
          seconds: 100, // 1:40 round
          initialSeconds: 100,
          isRunning: false,
          direction: 'countdown',
          periodLabel: 'MAPA 1',
        },
        players: [],
        tallies: [],
        overlay: {
          ...DEFAULT_OVERLAY_SETTINGS,
          layout: 'lower_third',
          fontFamily: 'Orbitron',
          accentColor: '#ec4899',
          scoreCardColor: '#090d16',
        },
      };
    }

    case 'leaderboard': {
      return {
        id,
        title: customTitle || 'Tabla de Puntos / Trivia en Vivo',
        sport: 'generic',
        type: 'leaderboard',
        createdAt: now,
        updatedAt: now,
        homeTeam: { id: 'th', name: '', shortName: '', score: 0, sets: 0, color: '#3b82f6' },
        awayTeam: { id: 'ta', name: '', shortName: '', score: 0, sets: 0, color: '#ef4444' },
        timer: {
          enabled: true,
          seconds: 30,
          initialSeconds: 30,
          isRunning: false,
          direction: 'countdown',
          periodLabel: 'RONDA 1',
        },
        players: [
          { id: 'p1', name: 'AlexGamer', score: 150, color: '#3b82f6', avatarEmoji: '🎮', streak: 3 },
          { id: 'p2', name: 'Sara_Stream', score: 120, color: '#ec4899', avatarEmoji: '🌸', streak: 2 },
          { id: 'p3', name: 'Carlos_Pro', score: 90, color: '#10b981', avatarEmoji: '⚡', streak: 1 },
          { id: 'p4', name: 'Nico99', score: 60, color: '#f59e0b', avatarEmoji: '🔥', streak: 0 },
        ],
        tallies: [],
        overlay: {
          ...DEFAULT_OVERLAY_SETTINGS,
          layout: 'side_tower',
          fontFamily: 'Inter',
          accentColor: '#8b5cf6',
        },
      };
    }

    case 'tally_counter': {
      return {
        id,
        title: customTitle || 'Contador Múltiple de Eventos',
        sport: 'generic',
        type: 'tally_counter',
        createdAt: now,
        updatedAt: now,
        homeTeam: { id: 'th', name: '', shortName: '', score: 0, sets: 0, color: '#3b82f6' },
        awayTeam: { id: 'ta', name: '', shortName: '', score: 0, sets: 0, color: '#ef4444' },
        timer: {
          enabled: false,
          seconds: 0,
          initialSeconds: 0,
          isRunning: false,
          direction: 'countup',
          periodLabel: '',
        },
        players: [],
        tallies: [
          { id: 't1', label: 'Victorias', count: 7, step: 1, color: '#10b981' },
          { id: 't2', label: 'Derrotas', count: 2, step: 1, color: '#ef4444' },
          { id: 't3', label: 'Kills / Bajas', count: 24, step: 1, color: '#f59e0b' },
          { id: 't4', label: 'Muertes (Deaths)', count: 5, step: 1, color: '#64748b' },
        ],
        overlay: {
          ...DEFAULT_OVERLAY_SETTINGS,
          layout: 'corner_box',
          fontFamily: 'Chakra Petch',
          accentColor: '#06b6d4',
        },
      };
    }

    case 'stream_goal': {
      return {
        id,
        title: customTitle || 'Meta de Suscriptores / Donaciones',
        sport: 'generic',
        type: 'stream_goal',
        createdAt: now,
        updatedAt: now,
        homeTeam: { id: 'th', name: '', shortName: '', score: 0, sets: 0, color: '#3b82f6' },
        awayTeam: { id: 'ta', name: '', shortName: '', score: 0, sets: 0, color: '#ef4444' },
        timer: {
          enabled: false,
          seconds: 0,
          initialSeconds: 0,
          isRunning: false,
          direction: 'countup',
          periodLabel: '',
        },
        players: [],
        tallies: [],
        goalConfig: {
          current: 68,
          target: 100,
          title: 'Meta de Nuevos Subs',
          unit: 'subs',
          showPercentage: true,
        },
        overlay: {
          ...DEFAULT_OVERLAY_SETTINGS,
          layout: 'lower_third',
          fontFamily: 'Montserrat',
          accentColor: '#a855f7',
        },
      };
    }
  }
}

export const QUICK_TEMPLATES: {
  id: string;
  name: string;
  desc: string;
  type: BoardType;
  sport: SportPreset;
  icon: string;
  badge: string;
  accent: string;
}[] = [
  {
    id: 'soccer_classic',
    name: 'Fútbol / Futsal',
    desc: 'Reloj progresivo 90m, tarjetas y diseño TV scorebug',
    type: 'sports_match',
    sport: 'soccer',
    icon: '⚽',
    badge: 'TV Scorebug',
    accent: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
  },
  {
    id: 'basket_pro',
    name: 'Baloncesto NBA/FIBA',
    desc: 'Cuartos Q1-Q4, faltas de equipo, tiempos muertos y reloj regresivo',
    type: 'sports_match',
    sport: 'basketball',
    icon: '🏀',
    badge: 'Con Faltas',
    accent: 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
  },
  {
    id: 'padel_tennis',
    name: 'Pádel / Tenis / Voley',
    desc: 'Contador de Sets ganados, juegos, saque y reloj de partido',
    type: 'sports_match',
    sport: 'padel',
    icon: '🎾',
    badge: 'Sets & Saque',
    accent: 'from-lime-500/20 to-emerald-500/20 border-lime-500/30',
  },
  {
    id: 'esports_tournament',
    name: 'Esports (BO3 / BO5)',
    desc: 'Marcador para Valorant, CS2, Rocket League con puntos de mapa',
    type: 'esports_bo',
    sport: 'esports',
    icon: '🎮',
    badge: 'Best of 3/5',
    accent: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
  },
  {
    id: 'live_trivia_board',
    name: 'Trivia / Clasificación',
    desc: 'Leaderboard con ranking automático, medallas y avatar de jugadores',
    type: 'leaderboard',
    sport: 'generic',
    icon: '🏆',
    badge: 'Auto Ranking',
    accent: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30',
  },
  {
    id: 'tally_stream',
    name: 'Multi-Contador Stream',
    desc: 'Contador de Victorias / Derrotas / Kills / Intentos de Boss',
    type: 'tally_counter',
    sport: 'generic',
    icon: '🔢',
    badge: 'Quick +/-',
    accent: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
  },
  {
    id: 'sub_goal_bar',
    name: 'Barra de Meta / Subs',
    desc: 'Barra de progreso animada para seguidores, donaciones o retos',
    type: 'stream_goal',
    sport: 'generic',
    icon: '🎯',
    badge: 'Progress Bar',
    accent: 'from-violet-500/20 to-fuchsia-500/20 border-violet-500/30',
  },
];
