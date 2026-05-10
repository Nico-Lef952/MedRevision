import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi, subjectsApi, formatApiError } from '../lib/api';
import {
  Trophy,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Award,
  Send
} from 'lucide-react';

export default function ExamPage() {
  const [phase, setPhase] = useState('setup'); // setup | exam | results
  const [subjects, setSubjects] = useState([]);
  const [config, setConfig] = useState({
    subject_id: '',
    question_count: 30,
    duration_minutes: 60,
    question_types: ['qi', 'qrm', 'qroc', 'dp']
  });
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    subjectsApi.getAll().then(r => setSubjects(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (phase === 'exam' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            handleSubmit();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase, timeLeft]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const startExam = async () => {
    try {
      const res = await examApi.start(config);
      setSession(res.data);
      setTimeLeft(res.data.duration_minutes * 60);
      setAnswers({});
      setCurrentIdx(0);
      setPhase('exam');
    } catch (err) {
      alert(formatApiError(err));
    }
  };

  const toggleOption = (qIdx, optIdx, isMulti) => {
    setAnswers(prev => {
      const current = prev[qIdx]?.selected_options || [];
      let newSelection;
      if (isMulti) {
        newSelection = current.includes(optIdx) ? current.filter(i => i !== optIdx) : [...current, optIdx];
      } else {
        newSelection = [optIdx];
      }
      return { ...prev, [qIdx]: { ...(prev[qIdx] || {}), selected_options: newSelection } };
    });
  };

  const setQrocAnswer = (qIdx, text) => {
    setAnswers(prev => ({ ...prev, [qIdx]: { ...(prev[qIdx] || {}), qroc_text: text, selected_options: text.trim() ? [0] : [] } }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      const submission = {
        answers: session.questions.map((q, i) => ({
          question_id: q.id,
          selected_options: answers[i]?.selected_options || [],
          time_spent: 0
        }))
      };
      const res = await examApi.submit(session.session_id, submission);
      setResults(res.data);
      setPhase('results');
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const reset = () => {
    setPhase('setup');
    setSession(null);
    setResults(null);
    setAnswers({});
    setCurrentIdx(0);
  };

  // ============== RESULTS PHASE ==============
  if (phase === 'results' && results) {
    const pct = results.percentage;
    const isPass = pct >= 50;
    return (
      <div className="max-w-4xl mx-auto space-y-6" data-testid="exam-results">
        <div className={`relative overflow-hidden rounded-3xl p-10 text-center ${
          isPass ? 'bg-gradient-to-br from-[#22C55E] via-[#16A34A] to-[#059669]' : 'bg-gradient-to-br from-[#F59E0B] via-[#EF4444] to-[#DC2626]'
        } text-white shadow-2xl`}>
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full" />
          <div className="relative">
            <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-full mx-auto mb-4 flex items-center justify-center">
              <Award className="w-12 h-12" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {isPass ? 'Bravo !' : 'Continuez !'}
            </h1>
            <p className="text-7xl font-black my-6" data-testid="exam-score">{pct}%</p>
            <p className="text-xl">{results.score} / {results.total} bonnes réponses</p>
          </div>
        </div>

        {/* Detailed corrections */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#1E293B] mb-6">Correction détaillée</h2>
          <div className="space-y-4">
            {results.detailed.map((d, i) => (
              <div key={i} className={`p-5 rounded-xl border-2 ${d.is_correct ? 'border-[#86EFAC] bg-[#F0FDF4]' : 'border-[#FCA5A5] bg-[#FEF2F2]'}`}>
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-sm font-bold text-[#64748B]">Q{i + 1}</span>
                  {d.is_correct ? <CheckCircle2 className="w-5 h-5 text-[#22C55E]" /> : <XCircle className="w-5 h-5 text-[#EF4444]" />}
                  <p className="font-semibold text-[#1E293B] flex-1">{d.question}</p>
                </div>
                {d.options?.length > 0 && (
                  <div className="ml-12 space-y-1 my-3">
                    {d.options.map((opt, oi) => {
                      const isSelected = (d.selected || []).includes(oi);
                      const isCorrect = (d.correct_options || []).includes(oi);
                      return (
                        <div key={oi} className={`text-sm flex items-center gap-2 p-2 rounded-lg ${
                          isCorrect ? 'bg-[#DCFCE7] text-[#166534] font-medium' :
                          isSelected ? 'bg-[#FEE2E2] text-[#991B1B]' :
                          'text-[#64748B]'
                        }`}>
                          {isCorrect && <CheckCircle2 className="w-4 h-4" />}
                          {isSelected && !isCorrect && <XCircle className="w-4 h-4" />}
                          <span>{String.fromCharCode(65 + oi)}. {opt.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {d.explanation && (
                  <div className="ml-12 mt-2 text-sm text-[#475569] bg-white p-3 rounded-lg border border-[#E2E8F0]">
                    <strong>Explication : </strong>{d.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-6 py-3 bg-[#1E293B] text-white rounded-xl font-semibold hover:bg-[#0F172A] transition-colors"
            data-testid="new-exam-btn"
          >
            <RotateCcw className="w-5 h-5" />
            Nouvel examen
          </button>
        </div>
      </div>
    );
  }

  // ============== EXAM PHASE ==============
  if (phase === 'exam' && session) {
    const q = session.questions[currentIdx];
    const isQrm = q.type === 'qrm';
    const isQroc = q.type === 'qroc';
    const answered = Object.keys(answers).length;
    const timeWarning = timeLeft < 300; // 5 min

    return (
      <div className="max-w-5xl mx-auto" data-testid="exam-page">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border border-[#E2E8F0] rounded-2xl shadow-sm p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <p className="text-[#64748B]">Question</p>
              <p className="font-bold text-[#1E293B]">{currentIdx + 1} / {session.total}</p>
            </div>
            <div className="hidden md:block w-px h-10 bg-[#E2E8F0]" />
            <div className="text-sm">
              <p className="text-[#64748B]">Répondues</p>
              <p className="font-bold text-[#22C55E]">{answered} / {session.total}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-lg ${
            timeWarning ? 'bg-[#FEE2E2] text-[#DC2626] animate-pulse' : 'bg-[#EFF6FF] text-[#1D4ED8]'
          }`} data-testid="exam-timer">
            <Clock className="w-5 h-5" />
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="bg-[#EF4444] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#DC2626] transition-colors flex items-center gap-2"
            data-testid="submit-exam-btn"
          >
            <Send className="w-4 h-4" />
            Terminer
          </button>
        </div>

        {/* Question navigation grid */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-10 md:grid-cols-15 gap-2">
            {session.questions.map((_, i) => {
              const a = answers[i];
              const isAnswered = a && (a.selected_options?.length > 0 || a.qroc_text?.trim());
              return (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={`aspect-square rounded-lg text-sm font-bold transition-all ${
                    i === currentIdx ? 'bg-[#1E293B] text-white scale-110 shadow-md' :
                    isAnswered ? 'bg-[#22C55E] text-white' :
                    'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                  }`}
                  data-testid={`nav-q-${i}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm" data-testid="exam-question">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge badge-primary uppercase">{q.type}</span>
            {q.difficulty && <span className="badge bg-[#F1F5F9] text-[#64748B]">Niveau {q.difficulty}</span>}
          </div>

          {q.vignette && (
            <div className="mb-4 p-4 bg-[#F8FAFC] rounded-xl border-l-4 border-[#4F46E5]">
              <p className="text-xs uppercase font-bold text-[#4F46E5] mb-2">Vignette clinique</p>
              <p className="text-sm text-[#334155] whitespace-pre-line">{q.vignette}</p>
            </div>
          )}

          <h2 className="text-xl font-bold text-[#1E293B] mb-6">{q.question}</h2>

          {isQroc ? (
            <textarea
              rows={3}
              value={answers[currentIdx]?.qroc_text || ''}
              onChange={(e) => setQrocAnswer(currentIdx, e.target.value)}
              placeholder="Votre réponse..."
              className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] outline-none"
              data-testid="qroc-input"
            />
          ) : (
            <div className="space-y-3">
              {q.options?.map((opt, oi) => {
                const selected = (answers[currentIdx]?.selected_options || []).includes(oi);
                return (
                  <button
                    key={oi}
                    onClick={() => toggleOption(currentIdx, oi, isQrm)}
                    className={`w-full p-4 text-left border-2 rounded-xl flex items-center gap-4 transition-all ${
                      selected ? 'border-[#4F46E5] bg-[#EFF6FF]' : 'border-[#E2E8F0] hover:border-[#94A3B8] hover:bg-[#F8FAFC]'
                    }`}
                    data-testid={`exam-option-${oi}`}
                  >
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      selected ? 'bg-[#4F46E5] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="flex-1 text-[#1E293B]">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-between mt-6 pt-6 border-t border-[#E2E8F0]">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-2 px-4 py-2 text-[#64748B] hover:bg-[#F1F5F9] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="prev-q-btn"
            >
              <ChevronLeft className="w-5 h-5" />
              Précédent
            </button>
            <button
              onClick={() => setCurrentIdx(Math.min(session.total - 1, currentIdx + 1))}
              disabled={currentIdx === session.total - 1}
              className="flex items-center gap-2 px-4 py-2 bg-[#1E293B] text-white rounded-xl font-medium hover:bg-[#0F172A] disabled:opacity-50"
              data-testid="next-q-btn"
            >
              Suivant
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Submit confirmation modal */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-[#D97706]" />
                </div>
                <h3 className="text-lg font-bold text-[#1E293B]">Terminer l'examen ?</h3>
              </div>
              <p className="text-[#64748B] mb-6">
                {answered < session.total
                  ? `Vous avez répondu à ${answered} / ${session.total} questions. Les questions non répondues seront comptées comme fausses.`
                  : 'Vous avez répondu à toutes les questions. Confirmer la soumission ?'}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="px-4 py-2 text-[#64748B] hover:bg-[#F1F5F9] rounded-xl"
                  data-testid="cancel-submit-btn"
                >
                  Continuer
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 bg-[#EF4444] text-white rounded-xl font-semibold hover:bg-[#DC2626] disabled:opacity-50"
                  data-testid="confirm-submit-btn"
                >
                  {submitting ? 'Soumission...' : 'Soumettre'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============== SETUP PHASE ==============
  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="exam-setup">
      <div>
        <h1 className="text-4xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Examen blanc
        </h1>
        <p className="text-[#64748B] mt-2 text-lg">
          Conditions ECN/EDN · Chronométré · Correction à la fin
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm space-y-6">
        <div>
          <label className="block text-sm font-semibold text-[#334155] mb-2">Matière (optionnel)</label>
          <select
            value={config.subject_id}
            onChange={(e) => setConfig({ ...config, subject_id: e.target.value })}
            className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] outline-none bg-white"
            data-testid="exam-subject-select"
          >
            <option value="">Toutes matières</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#334155] mb-2">
            Nombre de questions : <span className="text-[#4F46E5]">{config.question_count}</span>
          </label>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={config.question_count}
            onChange={(e) => setConfig({ ...config, question_count: parseInt(e.target.value) })}
            className="w-full"
            data-testid="exam-count-slider"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#334155] mb-2">
            Durée : <span className="text-[#4F46E5]">{config.duration_minutes} min</span>
          </label>
          <input
            type="range"
            min="15"
            max="180"
            step="15"
            value={config.duration_minutes}
            onChange={(e) => setConfig({ ...config, duration_minutes: parseInt(e.target.value) })}
            className="w-full"
            data-testid="exam-duration-slider"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#334155] mb-3">Types de questions</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'qi', label: 'QI' },
              { value: 'qrm', label: 'QRM' },
              { value: 'qroc', label: 'QROC' },
              { value: 'dp', label: 'DP' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setConfig({
                  ...config,
                  question_types: config.question_types.includes(value)
                    ? config.question_types.filter(t => t !== value)
                    : [...config.question_types, value]
                })}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  config.question_types.includes(value)
                    ? 'bg-[#1E293B] text-white'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
                data-testid={`exam-type-${value}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-4 rounded-xl">
          <p className="text-sm text-[#92400E] flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>L'examen est <strong>chronométré</strong>. Aucun feedback pendant les questions. Le score s'affiche à la fin avec correction détaillée.</span>
          </p>
        </div>

        <button
          onClick={startExam}
          disabled={config.question_types.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#1E293B] to-[#0F172A] text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
          data-testid="start-exam-btn"
        >
          <Play className="w-6 h-6" />
          Démarrer l'examen
        </button>
      </div>
    </div>
  );
}
