import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatApiError } from '../lib/api';
import { BookOpen, Mail, Lock, User, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="auth-page">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#0F172A] rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                MedRevision
              </h1>
              <p className="text-sm text-[#64748B]">Plateforme de révision médicale</p>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-[#0F172A] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {isLogin ? 'Connexion' : 'Inscription'}
          </h2>
          <p className="text-[#64748B] mb-8">
            {isLogin 
              ? 'Accédez à vos cours et révisions'
              : 'Créez votre compte pour commencer'}
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-[#FFE4E6] border border-[#E11D48] rounded-lg text-[#E11D48] text-sm" data-testid="auth-error">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Jean Dupont"
                    className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none transition-all"
                    required={!isLogin}
                    data-testid="auth-name-input"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none transition-all"
                  required
                  data-testid="auth-email-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#334155] mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none transition-all"
                  required
                  data-testid="auth-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F172A] text-white py-3 rounded-lg font-medium hover:bg-[#1E293B] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="auth-submit-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Se connecter' : "S'inscrire"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <p className="mt-6 text-center text-[#64748B]">
            {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="ml-2 text-[#2563EB] font-medium hover:underline"
              data-testid="auth-toggle-btn"
            >
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:flex flex-1 bg-[#0F172A] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] to-[#1E293B]" />
        <div className="relative z-10 text-center max-w-lg">
          <img
            src="https://images.pexels.com/photos/5998447/pexels-photo-5998447.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
            alt="Medical student studying"
            className="w-full rounded-2xl shadow-2xl mb-8 opacity-90"
          />
          <h3 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Révisez intelligemment
          </h3>
          <p className="text-[#94A3B8] text-lg">
            Importez vos cours, générez automatiquement des questions,
            et suivez votre progression avec l'IA.
          </p>
        </div>
      </div>
    </div>
  );
}
