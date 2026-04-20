import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, Loader2, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';

interface VisionLoginProps {
  onLogin: () => void;
}

export function VisionLogin({ onLogin }: VisionLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-12 rounded-3xl"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 bg-yellow-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-400/20">
            <Monitor className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2 uppercase">Nexus Vision</h1>
          <p className="text-zinc-400 text-lg">Inicia sesión para activar el Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 text-white pl-12 pr-4 py-5 rounded-2xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all text-lg"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 text-white pl-12 pr-4 py-5 rounded-2xl focus:ring-2 focus:ring-yellow-400 focus:border-transparent outline-none transition-all text-lg"
                required
              />
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-center bg-red-400/10 py-3 rounded-xl border border-red-400/20"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-5 rounded-2xl transition-all flex items-center justify-center space-x-2 text-xl uppercase tracking-wider"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              'Entrar al Dashboard'
            )}
          </button>
        </form>

        <p className="mt-12 text-center text-zinc-500 text-sm italic">
          Nexus Vision &copy; 2026 - Roma Center Edition
        </p>
      </motion.div>
    </div>
  );
}
