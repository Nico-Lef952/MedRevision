import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { questionsApi, quizApi, formatApiError } from '../lib/api';
import {
  Brain,
  Sparkles,
  Bookmark,
  AlertCircle,
  CheckCircle2,
  Clock,
  PlayCircle,
  Zap,
  RefreshCw,
  Trophy,
  Calendar
} from 'lucide-react';

const STATUS_META = {
  new: { label: 'Non vues', color: 'bg-[#94A3B8]', icon: Sparkles, gradient: 'from-[#94A3B8] to-[#64748B]' },
  to_review: { label: 'À retravailler', color: 'bg-[#EF4444]', icon: AlertCircle, gradient: 'from-[#EF4444] to-[#DC2626]' },
  acquired: { label: 'Acquises', color: 'bg-[#3B82F6]', icon: CheckCircle2, gradient: 'from-[#3B82F6] to-[#2563EB]' },
  anchored: { label: 'Ancrées', color: 'bg-[#22C55E]', icon: Trophy, gradient: 'from-[#22C55E] to-[#16A34A]' },
  snoozed: { label: 'Reportées', color: 'bg-[#F59E0B]', icon: Clock, gradient: 'from-[#F59E0B] to-[#D97706]' },
  bookmarked: { label: 'Favoris', color: 'bg-[#8B5CF6]', icon: Bookmark, gradient: 'from-[#8B5CF6] to-[#7C3AED]' },
};

export default function AncragePage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await questionsApi.progressSummary();
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const startSession = async (mode, count = 15) => {
    if (starting) return;
    setStarting(true);
    try {
      await quizApi.start({ mode, question_count: count });
      navigate(`/quiz?auto_mode=${mode}&auto_count=${count}`);
    } catch (err) {
      alert(formatApiError(err));
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 skeleton rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-48 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const dueToday = summary?.due_today || 0;
  const totalAnchored = summary?.anchored || 0;
  const totalQuestions = summary?.total || 0;
  const anchorPercent = totalQuestions > 0 ? Math.round((totalAnchored / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-8" data-testid="ancrage-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Ancrage
          </h1>
          <p className="text-[#64748B] mt-2 text-lg">
            Mémorisation à long terme · Algorithme SM-2 + EDN
          </p>
        </div>
      </div>

      {/* Hero Card - Aujourd'hui */}
      <div className="relative overflow-hidden rounded-3xl p-8 text-white bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#EC4899] shadow-2xl">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/10 rounded-full" />
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-white/80 font-medium">Aujourd'hui</p>
            </div>
            <p className="text-6xl md:text-7xl font-bold mb-2" data-testid="due-today-count">{dueToday}</p>
            <p className="text-white/90 text-lg">
              {dueToday === 0 ? 'Tout est à jour ! 🎉' : `question${dueToday > 1 ? 's' : ''} à réviser`}
            </p>
            {dueToday > 0 && (
              <button
                onClick={() => startSession('due', Math.min(dueToday, 20))}
                disabled={starting}
                className="mt-4 inline-flex items-center gap-2 bg-white text-[#7C3AED] px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-colors shadow-lg disabled:opacity-50"
                data-testid="start-ancrage-btn"
              >
                <Zap className="w-5 h-5" />
                Démarrer la session
              </button>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
            <p className="text-white/80 text-sm mb-1">Progression globale</p>
            <p className="text-4xl font-bold mb-3">{anchorPercent}% ancrées</p>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-700"
                style={{ width: `${anchorPercent}%` }}
              />
            </div>
            <p className="text-xs text-white/70 mt-2">
              {totalAnchored} / {totalQuestions} questions maîtrisées
            </p>
          </div>
        </div>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const value = summary?.[key] || 0;
          const Icon = meta.icon;
          return (
            <div
              key={key}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm hover:shadow-md transition-all"
              data-testid={`status-card-${key}`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center mb-3 shadow-md`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-[#1E293B]">{value}</p>
              <p className="text-xs text-[#64748B] font-medium">{meta.label}</p>
            </div>
          );
        })}
      </div>

      {/* Sessions rapides */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <h2 className="text-xl font-bold text-[#1E293B] mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Sessions rapides
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SessionCard
            title="Mes erreurs"
            description="Retravailler les questions ratées"
            count={summary?.to_review || 0}
            icon={AlertCircle}
            gradient="from-[#EF4444] to-[#DC2626]"
            onClick={() => startSession('errors')}
            disabled={starting || (summary?.to_review || 0) === 0}
            testId="start-errors"
          />
          <SessionCard
            title="Nouvelles questions"
            description="Découvrir ce que je n'ai pas vu"
            count={summary?.new || 0}
            icon={Sparkles}
            gradient="from-[#06B6D4] to-[#3B82F6]"
            onClick={() => startSession('new')}
            disabled={starting || (summary?.new || 0) === 0}
            testId="start-new"
          />
          <SessionCard
            title="Mes favoris"
            description="Questions marquées importantes"
            count={summary?.bookmarked || 0}
            icon={Bookmark}
            gradient="from-[#8B5CF6] to-[#7C3AED]"
            onClick={() => startSession('bookmarked')}
            disabled={starting || (summary?.bookmarked || 0) === 0}
            testId="start-bookmarked"
          />
        </div>
      </div>

      {/* Légende */}
      <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-6">
        <h3 className="font-bold text-[#1E293B] mb-3 flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#4F46E5]" />
          Comment fonctionne l'ancrage ?
        </h3>
        <ul className="space-y-2 text-sm text-[#475569]">
          <li className="flex items-start gap-2"><span className="text-[#22C55E] mt-0.5">●</span> <span><strong>Ancrée</strong> : 3 bonnes réponses consécutives — la notion est mémorisée à long terme.</span></li>
          <li className="flex items-start gap-2"><span className="text-[#3B82F6] mt-0.5">●</span> <span><strong>Acquise</strong> : bonne réponse récente — l'intervalle de révision augmente progressivement (SM-2).</span></li>
          <li className="flex items-start gap-2"><span className="text-[#EF4444] mt-0.5">●</span> <span><strong>À retravailler</strong> : mauvaise réponse — la question revient rapidement.</span></li>
          <li className="flex items-start gap-2"><span className="text-[#F59E0B] mt-0.5">●</span> <span><strong>Reportée</strong> : vous avez choisi de la décaler de 1, 7 ou 30 jours.</span></li>
        </ul>
      </div>
    </div>
  );
}

function SessionCard({ title, description, count, icon: Icon, gradient, onClick, disabled, testId }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-left p-5 rounded-2xl border-2 border-[#E2E8F0] hover:border-transparent hover:shadow-xl transition-all group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      data-testid={testId}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-md`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-bold text-[#1E293B] group-hover:text-[#4F46E5] transition-colors">{title}</h3>
        <span className="text-2xl font-bold text-[#1E293B]">{count}</span>
      </div>
      <p className="text-sm text-[#64748B]">{description}</p>
    </button>
  );
}
