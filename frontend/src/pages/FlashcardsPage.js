import React, { useState, useEffect } from 'react';
import { flashcardsApi, subjectsApi } from '../lib/api';
import {
  Brain,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Filter
} from 'lucide-react';

export default function FlashcardsPage() {
  const [subjects, setSubjects] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [mode, setMode] = useState('all'); // 'all' or 'due'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subRes, cardsRes] = await Promise.all([
        subjectsApi.getAll(),
        mode === 'due' 
          ? flashcardsApi.getDue()
          : flashcardsApi.getAll({ subject_id: filterSubject || undefined })
      ]);
      setSubjects(subRes.data);
      setCards(cardsRes.data);
      setCurrentIndex(0);
      setFlipped(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterSubject, mode]);

  const handleReview = async (quality) => {
    if (reviewing || cards.length === 0) return;
    setReviewing(true);
    
    const card = cards[currentIndex];
    
    try {
      await flashcardsApi.review(card.id, { quality });
      
      // Move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setFlipped(false);
      } else {
        // Refresh cards
        fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewing(false);
    }
  };

  const currentCard = cards[currentIndex];

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-[#E2E8F0] rounded" />
        <div className="h-96 bg-[#E2E8F0] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="flashcards-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Flashcards
          </h1>
          <p className="text-[#64748B] mt-1">
            {cards.length} cartes {mode === 'due' ? 'à réviser' : 'disponibles'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setMode('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'all'
                ? 'bg-[#0F172A] text-white'
                : 'border border-[#E2E8F0] hover:bg-[#F1F5F9]'
            }`}
            data-testid="mode-all"
          >
            Toutes
          </button>
          <button
            onClick={() => setMode('due')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === 'due'
                ? 'bg-[#0F172A] text-white'
                : 'border border-[#E2E8F0] hover:bg-[#F1F5F9]'
            }`}
            data-testid="mode-due"
          >
            À réviser
          </button>
        </div>
      </div>

      {/* Filter */}
      {mode === 'all' && (
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-[#64748B]" />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] outline-none bg-white"
            data-testid="filter-subject"
          >
            <option value="">Toutes les matières</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Flashcard */}
      {cards.length > 0 && currentCard ? (
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          <div className="flex items-center justify-between mb-4 text-sm text-[#64748B]">
            <span>Carte {currentIndex + 1} / {cards.length}</span>
            <button
              onClick={() => { setCurrentIndex(0); setFlipped(false); }}
              className="flex items-center gap-1 hover:text-[#0F172A]"
            >
              <RotateCcw className="w-4 h-4" />
              Recommencer
            </button>
          </div>

          {/* Card */}
          <div
            className="relative h-80 cursor-pointer perspective-1000"
            onClick={() => setFlipped(!flipped)}
            data-testid="flashcard"
          >
            <div
              className={`absolute inset-0 bg-white border border-[#E2E8F0] rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-300 ${
                flipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              <div className="absolute top-4 right-4">
                <span className="text-xs text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded">
                  Question
                </span>
              </div>
              
              <Brain className="w-8 h-8 text-[#2563EB] mb-4" />
              
              <p className="text-xl font-medium text-[#0F172A]">
                {currentCard.question}
              </p>

              <p className="text-sm text-[#64748B] mt-4">
                Cliquez pour révéler la réponse
              </p>
            </div>

            <div
              className={`absolute inset-0 bg-white border border-[#E2E8F0] rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-300 ${
                flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="absolute top-4 right-4">
                <span className="text-xs text-[#64748B] bg-[#F1F5F9] px-2 py-1 rounded">
                  Réponse
                </span>
              </div>
              
              <Brain className="w-8 h-8 text-[#059669] mb-4" />
              
              <p className="text-xl font-medium text-[#0F172A]">
                {currentCard.answer}
              </p>
              
              {currentCard.explanation && (
                <p className="text-sm text-[#64748B] mt-4 max-w-md">
                  {currentCard.explanation}
                </p>
              )}
            </div>
          </div>

          {/* Navigation & Rating */}
          <div className="mt-6">
            {flipped ? (
              <div className="space-y-4">
                <p className="text-center text-sm text-[#64748B]">
                  Comment avez-vous trouvé cette carte ?
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {[
                    { quality: 0, label: 'À revoir', color: 'bg-[#E11D48]' },
                    { quality: 2, label: 'Difficile', color: 'bg-[#D97706]' },
                    { quality: 3, label: 'Moyen', color: 'bg-[#F59E0B]' },
                    { quality: 4, label: 'Bien', color: 'bg-[#10B981]' },
                    { quality: 5, label: 'Facile', color: 'bg-[#059669]' }
                  ].map(({ quality, label, color }) => (
                    <button
                      key={quality}
                      onClick={() => handleReview(quality)}
                      disabled={reviewing}
                      className={`px-4 py-2 ${color} text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50`}
                      data-testid={`rating-${quality}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false); }}
                  disabled={currentIndex === 0}
                  className="p-3 border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9] disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setCurrentIndex(Math.min(cards.length - 1, currentIndex + 1)); setFlipped(false); }}
                  disabled={currentIndex === cards.length - 1}
                  className="p-3 border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9] disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E2E8F0]">
          <Sparkles className="w-16 h-16 mx-auto text-[#E2E8F0] mb-4" />
          <h3 className="text-xl font-semibold text-[#0F172A] mb-2">
            {mode === 'due' ? 'Aucune carte à réviser' : 'Aucune flashcard'}
          </h3>
          <p className="text-[#64748B]">
            {mode === 'due' 
              ? 'Toutes vos cartes sont à jour !'
              : 'Les flashcards sont générées automatiquement depuis vos cours'}
          </p>
        </div>
      )}
    </div>
  );
}
