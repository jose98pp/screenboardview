import React, { useState } from 'react';
import { ScoreboardData, BoardType, SportPreset } from '../types';
import { QUICK_TEMPLATES, createNewBoard } from '../utils/presets';
import {
  saveBoard,
  deleteBoard,
  duplicateBoard,
  exportBoardsToJson,
  importBoardsFromJson
} from '../utils/storage';
import {
  Plus,
  Tv,
  Search,
  Copy,
  Check,
  Play,
  RotateCcw,
  Trash2,
  Copy as DuplicateIcon,
  Download,
  Upload,
  ExternalLink,
  Sparkles,
  Layers,
  Flame,
  Trophy,
  Hash,
  Target,
  Gamepad2,
  Radio,
  Sliders,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

interface DashboardHomeProps {
  boards: ScoreboardData[];
  onSelectBoard: (board: ScoreboardData) => void;
  onRefreshBoards: () => void;
  onOpenObsHelp: (boardId?: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  boards,
  onSelectBoard,
  onRefreshBoards,
  onOpenObsHelp,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Board Form State
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<BoardType>('sports_match');
  const [newSport, setNewSport] = useState<SportPreset>('soccer');

  const filteredBoards = boards.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.homeTeam?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.awayTeam?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'all') return true;
    if (filterType === 'sports') return b.type === 'sports_match';
    if (filterType === 'esports') return b.type === 'esports_bo';
    if (filterType === 'leaderboard') return b.type === 'leaderboard';
    if (filterType === 'tally') return b.type === 'tally_counter';
    if (filterType === 'goal') return b.type === 'stream_goal';
    return true;
  });

  const handleCreateFromTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    const created = createNewBoard(template.type, template.sport, `${template.name} - En Vivo`);
    saveBoard(created);
    onRefreshBoards();
    onSelectBoard(created);
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createNewBoard(
      newType,
      newSport,
      newTitle.trim() || 'Nuevo Marcador'
    );
    saveBoard(created);
    onRefreshBoards();
    setShowCreateModal(false);
    setNewTitle('');
    onSelectBoard(created);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateBoard(id);
    onRefreshBoards();
  };

  const handleDelete = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`¿Estás seguro de eliminar el marcador "${title}"?`)) {
      deleteBoard(id);
      onRefreshBoards();
    }
  };

  const handleResetScore = (board: ScoreboardData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`¿Reiniciar puntos de "${board.title}" a cero?`)) {
      const reset = {
        ...board,
        homeTeam: { ...board.homeTeam, score: 0, sets: 0 },
        awayTeam: { ...board.awayTeam, score: 0, sets: 0 },
        players: board.players ? board.players.map((p) => ({ ...p, score: 0 })) : [],
        timer: { ...board.timer, seconds: board.timer.initialSeconds, isRunning: false },
      };
      saveBoard(reset);
      onRefreshBoards();
    }
  };

  const handleCopyObsUrl = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?mode=overlay&id=${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportBoardsToJson());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `scoreboards_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        if (event.target?.result) {
          const success = importBoardsFromJson(event.target.result as string);
          if (success) {
            onRefreshBoards();
            alert('¡Marcadores importados con éxito!');
          } else {
            alert('Error al leer el archivo JSON.');
          }
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-20">
      {/* Bento Grid Top Hero Showcase */}
      <div className="border-b border-slate-800/80 bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header Info Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-xs font-bold tracking-wide">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  OBS LIVE SYNC READY
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-slate-300 rounded-full border border-slate-700/80 text-xs font-mono">
                  <HardDrive className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Memoria Local Segura (IndexedDB + LocalStorage)</span>
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase">
                Marcadores & Screen Boards <span className="text-slate-500 font-medium normal-case tracking-normal">// Control Room</span>
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-2xl">
                Crea, sincroniza y transmite marcadores interactivos para OBS Studio, Twitch y YouTube con transparencia nativa.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onOpenObsHelp()}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition-all active:scale-95"
              >
                <Tv className="h-4 w-4 text-indigo-400" /> Guía OBS Studio
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 text-xs font-bold shadow-lg shadow-indigo-900/40 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" /> Crear Marcador
              </button>
            </div>
          </div>

          {/* Quick Bento Templates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Plantillas Rápidas (1 Clic)
              </h2>
              <span className="text-[11px] font-mono text-slate-500">SELECCIÓN INSTANTÁNEA</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {QUICK_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => handleCreateFromTemplate(tmpl)}
                  className="flex flex-col items-start rounded-2xl border border-slate-800 bg-slate-900/60 p-3.5 text-left hover:border-indigo-500/50 hover:bg-slate-900 transition-all group active:scale-95 shadow-md"
                >
                  <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{tmpl.icon}</span>
                  <span className="text-xs font-bold text-white truncate w-full">{tmpl.name}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tmpl.badge}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* Controls, Filters & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 rounded-2xl bg-slate-900 p-1.5 border border-slate-800 text-xs font-bold">
            {[
              { id: 'all', label: `Todos (${boards.length})` },
              { id: 'sports', label: '⚽ Deportes' },
              { id: 'esports', label: '🎮 Esports' },
              { id: 'leaderboard', label: '🏆 Leaderboards' },
              { id: 'tally', label: '🔢 Contadores' },
              { id: 'goal', label: '🎯 Metas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`rounded-xl px-3.5 py-1.5 transition-all ${
                  filterType === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & Import/Export */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar marcador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleExport}
              title="Descargar copia de seguridad en JSON"
              className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <Download className="h-4 w-4" />
            </button>

            <label
              title="Restaurar marcadores desde JSON"
              className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>

        {/* Scoreboards Bento Grid */}
        {filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-800 bg-slate-900/30 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-400 mb-4 border border-indigo-500/20 shadow-lg shadow-indigo-900/20">
              <Tv className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-white uppercase tracking-wide">No se encontraron marcadores</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Crea uno nuevo con el botón superior o selecciona una de las plantillas rápidas de fútbol, basket, esports o trivia.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-900/30 hover:bg-indigo-500"
            >
              Crear mi primer marcador
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBoards.map((b) => (
              <div
                key={b.id}
                onClick={() => onSelectBoard(b)}
                className="group relative flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl hover:border-slate-700 hover:bg-slate-900/90 transition-all cursor-pointer overflow-hidden"
              >
                {/* Bento Ambient Glow in Card */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-600/5 blur-[50px] rounded-full -mr-12 -mt-12 pointer-events-none group-hover:bg-indigo-600/10 transition-all" />

                {/* Card Top */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 border border-slate-700/60 text-sm">
                        {b.type === 'sports_match'
                          ? b.sport === 'soccer'
                            ? '⚽'
                            : b.sport === 'basketball'
                            ? '🏀'
                            : '🎾'
                          : b.type === 'esports_bo'
                          ? '🎮'
                          : b.type === 'leaderboard'
                          ? '🏆'
                          : b.type === 'tally_counter'
                          ? '🔢'
                          : '🎯'}
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-white truncate group-hover:text-indigo-300 transition-colors">
                          {b.title}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">
                          {b.type.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-800/80 border border-slate-700/60 px-2.5 py-0.5 text-[10px] font-mono text-indigo-400 font-bold uppercase">
                      {b.overlay.layout.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Mini Score Bento Tile */}
                  <div className="my-3 rounded-2xl bg-slate-950/90 border border-slate-800 p-3.5 shadow-inner">
                    {b.type === 'leaderboard' ? (
                      <div className="space-y-1.5 text-xs">
                        {b.players?.slice(0, 3).map((p, idx) => (
                          <div
                            key={p.id}
                            className={`flex justify-between items-center px-2 py-1 rounded-lg ${
                              idx === 0 ? 'bg-indigo-600/20 border border-indigo-500/30 text-white font-bold' : 'text-slate-300'
                            }`}
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono font-black italic text-slate-500 text-[10px]">0{idx + 1}</span>
                              <span>{p.avatarEmoji} {p.name}</span>
                            </span>
                            <span className="font-mono font-bold text-indigo-400">{p.score} pts</span>
                          </div>
                        ))}
                      </div>
                    ) : b.type === 'stream_goal' && b.goalConfig ? (
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                          <span className="text-slate-400 uppercase text-[10px] tracking-wider">{b.goalConfig.title}</span>
                          <span className="font-mono text-indigo-400">
                            {b.goalConfig.current} / {b.goalConfig.target}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-900 overflow-hidden p-0.5 border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                (b.goalConfig.current / b.goalConfig.target) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : b.type === 'tally_counter' ? (
                      <div className="flex flex-wrap gap-2 text-xs">
                        {b.tallies?.slice(0, 3).map((t) => (
                          <div key={t.id} className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-xl">
                            <span className="text-slate-400 text-[11px]">{t.label}: </span>
                            <span className="font-mono font-bold text-indigo-400">{t.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Sports & Esports Scoreboard
                      <div className="flex items-center justify-between">
                        {/* Home */}
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{b.homeTeam.logoEmoji || '🔴'}</span>
                          <span className="font-bold text-xs text-white uppercase tracking-tight">
                            {b.homeTeam.shortName || b.homeTeam.name}
                          </span>
                        </div>

                        {/* Big Score */}
                        <div className="flex items-center gap-2 font-mono font-black text-2xl text-white tracking-tight">
                          <span>{b.homeTeam.score}</span>
                          <span className="text-slate-600 text-base font-normal">-</span>
                          <span>{b.awayTeam.score}</span>
                        </div>

                        {/* Away */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white uppercase tracking-tight">
                            {b.awayTeam.shortName || b.awayTeam.name}
                          </span>
                          <span className="text-lg">{b.awayTeam.logoEmoji || '🔵'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Bottom */}
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3.5 mt-2 relative z-10">
                  <div className="flex items-center gap-1.5">
                    {/* Copy OBS Browser Source URL */}
                    <button
                      onClick={(e) => handleCopyObsUrl(b.id, e)}
                      title="Copiar URL para fuente de navegador OBS"
                      className="flex items-center gap-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/30 px-3 py-1.5 text-xs font-bold text-indigo-300 hover:text-white transition-all active:scale-95 shadow-sm"
                    >
                      {copiedId === b.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>{copiedId === b.id ? '¡Copiado!' : 'URL OBS'}</span>
                    </button>

                    {/* Open Overlay in new tab */}
                    <a
                      href={`${window.location.origin}/?mode=overlay&id=${b.id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Abrir vista de overlay limpia"
                      className="rounded-xl border border-slate-800 bg-slate-900 p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Reset score */}
                    <button
                      onClick={(e) => handleResetScore(b, e)}
                      title="Reiniciar marcador a 0"
                      className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-800 hover:text-amber-400"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>

                    {/* Duplicate */}
                    <button
                      onClick={(e) => handleDuplicate(b.id, e)}
                      title="Duplicar marcador"
                      className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-800 hover:text-white"
                    >
                      <DuplicateIcon className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => handleDelete(b.id, b.title, e)}
                      title="Eliminar marcador"
                      className="rounded-xl p-1.5 text-slate-500 hover:bg-rose-950/50 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE NEW BOARD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-400" /> Crear Nuevo Marcador / Screen Board
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Título del Marcador / Partido
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Final Torneo Champions, Partido Amistoso..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Tipo de Marcador
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'sports_match', label: '⚽ Partido Deportivo', desc: 'Fútbol, Basket, Tenis' },
                    { id: 'esports_bo', label: '🎮 Esports (BO3 / BO5)', desc: 'Valorant, CS2, LoL' },
                    { id: 'leaderboard', label: '🏆 Tabla Clasificación', desc: 'Trivia, Torneos' },
                    { id: 'tally_counter', label: '🔢 Multi-Contador', desc: 'Victorias, Kills, Retos' },
                    { id: 'stream_goal', label: '🎯 Barra de Metas', desc: 'Subs, Donaciones' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setNewType(t.id as BoardType)}
                      className={`flex flex-col items-start rounded-xl p-3 text-left border transition-all ${
                        newType === t.id
                          ? 'border-indigo-500 bg-indigo-950/50 text-white font-bold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xs">{t.label}</span>
                      <span className="text-[10px] text-slate-500">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {newType === 'sports_match' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Deporte Específico
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'soccer', label: 'Fútbol / Futsal' },
                      { id: 'basketball', label: 'Baloncesto' },
                      { id: 'padel', label: 'Pádel / Tenis' },
                      { id: 'volleyball', label: 'Voleibol' },
                    ].map((sp) => (
                      <button
                        type="button"
                        key={sp.id}
                        onClick={() => setNewSport(sp.id as SportPreset)}
                        className={`rounded-xl py-2 text-center text-xs font-semibold border transition-all ${
                          newSport === sp.id
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-slate-800 bg-slate-950 text-slate-400'
                        }`}
                      >
                        {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
                >
                  Crear y Abrir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
