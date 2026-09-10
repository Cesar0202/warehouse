import React, { useState } from 'react';
import { Lock, User, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toUpperCase();
    const cleanPass = password.trim();

    if (cleanUser === 'ALMACEN' && cleanPass === 'ALMACEN') {
      localStorage.setItem('warehouse_auth_session', 'true');
      onLoginSuccess();
    } else {
      setError('Credenciales incorrectas. Verifique usuario y contraseña.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 font-sans text-neutral-900">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-300 shadow-xl p-6 sm:p-8 space-y-6">
        {/* Header / Logo */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-neutral-900">
            DEMO - ALMACÉN
          </h1>
          <p className="text-xs text-neutral-500">
            Ingreso al sistema de homologación y stock
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-neutral-100 border border-neutral-300 rounded-xl text-neutral-800 text-xs font-semibold text-center animate-shake">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-1 font-mono">
              Usuario
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="ALMACEN"
                required
                autoFocus
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs font-mono focus:bg-white focus:border-neutral-900 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 uppercase tracking-wider mb-1 font-mono">
              Contraseña
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 text-xs font-mono focus:bg-white focus:border-neutral-900 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-neutral-900 hover:bg-black active:scale-98 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>Iniciar Sesión</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-neutral-100 text-center">
          <span className="text-[11px] text-neutral-400 font-mono">
            Acceso restringido • Warehouse v1.0
          </span>
        </div>
      </div>
    </div>
  );
};
