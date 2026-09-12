import React, { useState } from 'react';
import { Tv, Volume2, LogIn, LogOut, User as UserIcon, AlertTriangle, ExternalLink, Copy, Check, X } from 'lucide-react';
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
  const [showDomainModal, setShowDomainModal] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'screenboardview.vercel.app';

  const handleTestSound = () => {
    setTestingSound(true);
    playSound('fanfare', 0.6);
    setTimeout(() => setTestingSound(false), 800);
  };

  const handleCopyHost = () => {
    navigator.clipboard.writeText(currentHost);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.warn('Sign-in notice:', err);
      const errCode = err?.code || '';
      const errMsg = err?.message || '';

      if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) {
        setShowDomainModal(true);
      } else {
        setAuthError('No se pudo completar el inicio de sesión. Revisa la consola o tu conexión.');
        setTimeout(() => setAuthError(null), 4000);
      }
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

      {/* Domain Authorization Guidance Modal */}
      {showDomainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl text-left">
            <button
              onClick={() => setShowDomainModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Autorizar Dominio en Firebase Console
                </h3>
                <p className="text-xs text-slate-400">
                  Google bloquea el inicio de sesión desde dominios externos nuevos por seguridad.
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300">
              <p>
                Para habilitar Google Sign-In en este despliegue, agrega tu dominio a los <strong>Authorized Domains</strong> de Firebase:
              </p>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">Tu dominio actual:</div>
                  <div className="font-mono text-emerald-400 font-bold text-sm select-all">
                    {currentHost}
                  </div>
                </div>
                <button
                  onClick={handleCopyHost}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition-all"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl bg-slate-850 border border-slate-800 p-3.5 space-y-2">
                <div className="font-bold text-slate-200">Pasos rápidos (1 minuto):</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400">
                  <li>Abre la consola de Firebase en tu proyecto.</li>
                  <li>Dirígete a <strong>Authentication</strong> &gt; pestaña <strong>Settings</strong> &gt; sección <strong>Authorized domains</strong>.</li>
                  <li>Haz clic en <strong>Add domain</strong> y pega <code className="text-emerald-300 font-mono">{currentHost}</code>.</li>
                  <li>¡Listo! Vuelve a hacer clic en <strong>Acceder</strong> aquí.</li>
                </ol>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-end">
              <a
                href="https://console.firebase.google.com/project/stocky-iq9xd/authentication/settings"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/40 transition-all active:scale-95"
              >
                <span>Abrir Firebase Console</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => setShowDomainModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs transition-colors"
              >
                Entendido, cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};


