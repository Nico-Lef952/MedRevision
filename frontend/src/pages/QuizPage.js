import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { quizApi, subjectsApi, coursesApi, formatApiError } from '../lib/api';
import {
  Play,
  CheckCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Trophy,
  Clock,
  Target,
  ChevronDown
} from 'lucide-react';

export default function QuizPage() {
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Quiz config
  const [mode, setMode] = useState('subject');
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject_id') || '');
  const [selectedCourse, setSelectedCourse] = useState(searchParams.get('course_id') || '');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionTypes, setQuestionTypes] = useState(['qcm', 'vrai_faux', 'flashcard']);
  
  // Quiz state
  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [answering, setAnswering] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subRes, courseRes] = await Promise.all([
          subjectsApi.getAll(),
          coursesApi.getAll({})
        ]);
        setSubjects(subRes.data);
        setCourses(courseRes.data);
        
        // Auto-set mode based on URL params
        if (searchParams.get('course_id')) {
          setMode('course');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const startQuiz = async () => {
    try {
      const res = await quizApi.start({
        mode,
        subject_id: mode === 'subject' ? selectedSubject : undefined,
        course_id: mode === 'course' ? selectedCourse : undefined,
        question_count: questionCount,
        question_types: questionTypes.length > 0 ? questionTypes : undefined
      });
      setSession(res.data);
      setCurrentIndex(0);
      setSelectedOptions([]);
      setAnswered(false);
      setResult(null);
      setFinalResult(null);
      setStartTime(Date.now());
    } catch (err) {
      alert(formatApiError(err));
    }
  };

  const submitAnswer = async () => {
    if (answering) return;
    setAnswering(true);
    
    try {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const question = session.questions[currentIndex];
      
      const res = await quizApi.answer(session.session_id, {
        question_id: question.id,
        selected_options: selectedOptions,
        time_spent: timeSpent
      });
      
      setResult(res.data);
      setAnswered(true);
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setAnswering(false);
    }
  };

  const nextQuestion = async () => {
    if (currentIndex < session.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOptions([]);
      setAnswered(false);
      setResult(null);
      setStartTime(Date.now());
    } else {
      // Complete quiz
      try {
        const res = await quizApi.complete(session.session_id);
        setFinalResult(res.data);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const resetQuiz = () => {
    setSession(null);
    setCurrentIndex(0);
    setSelectedOptions([]);
    setAnswered(false);
    setResult(null);
    setFinalResult(null);
  };

  const toggleOption = (index) => {
    if (answered) return;
    
    const question = session.questions[currentIndex];
    if (question.type === 'vrai_faux') {
      setSelectedOptions([index]);
    } else {
      if (selectedOptions.includes(index)) {
        setSelectedOptions(selectedOptions.filter(i => i !== index));
      } else {
        setSelectedOptions([...selectedOptions, index]);
      }
    }
  };

  const toggleQuestionType = (type) => {
    if (questionTypes.includes(type)) {
      setQuestionTypes(questionTypes.filter(t => t !== type));
    } else {
      setQuestionTypes([...questionTypes, type]);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-[#E2E8F0] rounded" />
        <div className="h-64 bg-[#E2E8F0] rounded-xl" />
      </div>
    );
  }

  // Final Results Screen
  if (finalResult) {
    const percentage = finalResult.percentage;
    const isGood = percentage >= 70;
    
    return (
      <div className="max-w-2xl mx-auto" data-testid="quiz-results">
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center">
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 ${
            isGood ? 'bg-[#D1FAE5]' : 'bg-[#FEF3C7]'
          }`}>
            <Trophy className={`w-12 h-12 ${isGood ? 'text-[#059669]' : 'text-[#D97706]'}`} />
          </div>
          
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Quiz terminé !
          </h2>
          
          <div className="text-5xl font-bold my-6" style={{ color: isGood ? '#059669' : '#D97706' }}>
            {percentage}%
          </div>
          
          <p className="text-[#64748B] mb-6">
            Vous avez obtenu {finalResult.score} / {finalResult.total} bonnes réponses
          </p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={resetQuiz}
              className="flex items-center gap-2 px-6 py-3 border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9] transition-colors"
              data-testid="new-quiz-btn"
            >
              <RotateCcw className="w-5 h-5" />
              Nouveau quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz In Progress
  if (session) {
    const question = session.questions[currentIndex];
    const progress = ((currentIndex + 1) / session.total) * 100;
    
    return (
      <div className="max-w-3xl mx-auto space-y-6" data-testid="quiz-in-progress">
        {/* Progress */}
        <div className="flex items-center justify-between text-sm text-[#64748B]">
          <span>Question {currentIndex + 1} / {session.total}</span>
          <span className="badge badge-accent">{question.type}</span>
        </div>
        <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#2563EB] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <h3 className="text-xl font-semibold text-[#0F172A] mb-6">
            {question.question}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {question.options?.map((opt, idx) => {
              let optionClass = 'quiz-option';
              if (answered) {
                if (result.correct_options.includes(idx)) {
                  optionClass += ' correct';
                } else if (selectedOptions.includes(idx)) {
                  optionClass += ' incorrect';
                }
                optionClass += ' disabled';
              } else if (selectedOptions.includes(idx)) {
                optionClass += ' selected';
              }
              
              return (
                <button
                  key={idx}
                  onClick={() => toggleOption(idx)}
                  disabled={answered}
                  className={`w-full p-4 text-left border border-[#E2E8F0] rounded-lg flex items-center gap-4 ${optionClass}`}
                  data-testid={`option-${idx}`}
                >
                  <span className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center text-sm font-medium shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex-1">{opt.text}</span>
                  {answered && result.correct_options.includes(idx) && (
                    <CheckCircle className="w-5 h-5 text-[#059669] shrink-0" />
                  )}
                  {answered && selectedOptions.includes(idx) && !result.correct_options.includes(idx) && (
                    <XCircle className="w-5 h-5 text-[#E11D48] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.is_correct ? 'bg-[#D1FAE5] border border-[#059669]' : 'bg-[#FFE4E6] border border-[#E11D48]'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.is_correct ? (
                  <CheckCircle className="w-5 h-5 text-[#059669]" />
                ) : (
                  <XCircle className="w-5 h-5 text-[#E11D48]" />
                )}
                <span className="font-semibold">
                  {result.is_correct ? 'Bonne réponse !' : 'Mauvaise réponse'}
                </span>
              </div>
              <p className="text-sm text-[#334155]">{result.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end mt-6">
            {!answered ? (
              <button
                onClick={submitAnswer}
                disabled={selectedOptions.length === 0 || answering}
                className="flex items-center gap-2 bg-[#0F172A] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1E293B] transition-colors disabled:opacity-50"
                data-testid="submit-answer-btn"
              >
                {answering ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Valider
                    <CheckCircle className="w-5 h-5" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="flex items-center gap-2 bg-[#2563EB] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1D4ED8] transition-colors"
                data-testid="next-question-btn"
              >
                {currentIndex < session.questions.length - 1 ? 'Suivant' : 'Terminer'}
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz Setup
  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="quiz-setup">
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Quiz
        </h1>
        <p className="text-[#64748B] mt-1">
          Testez vos connaissances
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-6">
        {/* Mode */}
        <div>
          <label className="block text-sm font-medium text-[#334155] mb-3">Mode</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: 'subject', label: 'Par matière', icon: Target },
              { value: 'course', label: 'Par cours', icon: Target },
              { value: 'transversal', label: 'Transversal', icon: Target },
              { value: 'errors', label: 'Mes erreurs', icon: Target }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                  mode === value
                    ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                    : 'border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
                data-testid={`mode-${value}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject Selection */}
        {mode === 'subject' && (
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-2">Matière</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] outline-none bg-white"
              data-testid="subject-select"
            >
              <option value="">Toutes les matières</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Course Selection */}
        {mode === 'course' && (
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-2">Cours</label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] outline-none bg-white"
              data-testid="course-select"
            >
              <option value="">Sélectionner un cours</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Question Count */}
        <div>
          <label className="block text-sm font-medium text-[#334155] mb-2">
            Nombre de questions: {questionCount}
          </label>
          <input
            type="range"
            min="5"
            max="30"
            value={questionCount}
            onChange={(e) => setQuestionCount(parseInt(e.target.value))}
            className="w-full"
            data-testid="question-count-slider"
          />
        </div>

        {/* Question Types */}
        <div>
          <label className="block text-sm font-medium text-[#334155] mb-3">Types de questions</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'qcm', label: 'QCM' },
              { value: 'vrai_faux', label: 'Vrai/Faux' },
              { value: 'flashcard', label: 'Flashcard' },
              { value: 'cas_clinique', label: 'Cas clinique' },
              { value: 'qroc', label: 'QROC' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => toggleQuestionType(value)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  questionTypes.includes(value)
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
                }`}
                data-testid={`type-${value}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={startQuiz}
          disabled={(mode === 'course' && !selectedCourse)}
          className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white py-3 rounded-lg font-medium hover:bg-[#1D4ED8] transition-colors disabled:opacity-50"
          data-testid="start-quiz-btn"
        >
          <Play className="w-5 h-5" />
          Commencer le quiz
        </button>
      </div>
    </div>
  );
}
