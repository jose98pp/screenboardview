import React, { useState } from 'react';
import { Tv, Volume2, LogIn, LogOut, User as UserIcon, CloudCheck } from 'lucide-react';
import { playSound } from '../utils/audio';
import { useAuth } from '../lib/AuthContext';

interface NavbarProps {
  onGoHome: () => void;
  onOpenObsHelp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onGoHome, onOpenObsHelp }) => {
  const { user, signInWithGoogle, signOutUser, loading } = useAuth();
  const [testingSound, setTestingSound] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleTestSound = () => {
    setTestingSound(true);
    playSound('fanfare', 0.6);
    setTimeout(() => setTestingSound(false), 800);
  };

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.warn('Sign-in notice:', err);
      setAuthError('No se pudo completar el inicio de sesión.');
      setTimeout(() => setAuthError(null), 3000);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 py-3.5 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand in Bento style */}
        <button
          onClick={onGoHome}
          className="flex items-center gap-3.5 text-left group"
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-900/40 group-hover:scale-105 transition-transform">
            K
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
              KeepScore <span className="text-slate-500 font-semibold tracking-normal">// Dashboard</span>
            </h1>
            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
              ScoreBoard Studio for OBS Studio & Streaming
            </span>
          </div>
        </button>

        {/* Right buttons with Bento styled live indicator */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-xs font-bold tracking-wide">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            OBS LIVE SYNC
          </div>

          {/* Sound test button */}
          <button
            onClick={handleTestSound}
            title="Probar sintetizador de audio"
            className={`hidden md:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs font-semibold transition-all ${
              testingSound ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Volume2 className="h-3.5 w-3.5" />
            <span>Audio Test</span>
          </button>

          {/* OBS Guide Button */}
          <button
            onClick={onOpenObsHelp}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all active:scale-95"
          >
            <Tv className="h-4 w-4" />
            <span className="hidden sm:inline">Guía OBS</span>
          </button>

          {/* User Auth with Google Sign-In */}
          {!loading && (
            <div>
              {user ? (
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 pr-2.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Usuario'}
                      className="w-7 h-7 rounded-lg object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-indigo-900/60 text-indigo-300 flex items-center justify-center font-bold text-xs">
                      {user.email ? user.email.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                    </div>
                  )}
                  <span className="text-xs text-slate-300 font-medium hidden md:inline max-w-[110px] truncate">
                    {user.displayName || user.email}
                  </span>
                  <button
                    onClick={signOutUser}
                    title="Cerrar sesión"
                    className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-850 px-3 py-2 text-xs font-bold text-slate-200 hover:text-white transition-all active:scale-95"
                >
                  <LogIn className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Acceder</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {authError && (
        <div className="text-center text-[11px] text-amber-400 mt-1">
          {authError}
        </div>
      )}
    </header>
  );
};


