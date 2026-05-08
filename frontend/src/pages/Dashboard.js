import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, subjectsApi } from '../lib/api';
import {
  BookOpen,
  FileText,
  HelpCircle,
  Brain,
  TrendingUp,
  Clock,
  ChevronRight,
  Plus,
  Sparkles,
  Zap,
  Target
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, subRes] = await Promise.all([
          dashboardApi.get(),
          subjectsApi.getAll()
        ]);
        setData(dashRes.data);
        setSubjects(subRes.data);
      } catch (error) {
        console.error('Dashboard error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-36 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Tableau de bord
          </h1>
          <p className="text-[#64748B] mt-2 text-lg">
            Bienvenue ! Prêt à réviser ? 🎓
          </p>
        </div>
        <Link
          to="/courses"
          className="btn-gradient inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Ajouter un cours
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={BookOpen}
          label="Matières"
          value={stats.subject_count || 0}
          gradient="from-[#4F46E5] to-[#7C3AED]"
          testId="stat-subjects"
        />
        <StatCard
          icon={FileText}
          label="Cours"
          value={stats.course_count || 0}
          gradient="from-[#06B6D4] to-[#3B82F6]"
          testId="stat-courses"
        />
        <StatCard
          icon={HelpCircle}
          label="Questions"
          value={stats.question_count || 0}
          gradient="from-[#EC4899] to-[#F43F5E]"
          testId="stat-questions"
        />
        <StatCard
          icon={Target}
          label="Taux de réussite"
          value={`${stats.success_rate || 0}%`}
          gradient="from-[#10B981] to-[#059669]"
          testId="stat-success"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Courses */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              📚 Cours récents
            </h2>
            <Link
              to="/courses"
              className="text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium flex items-center gap-1"
            >
              Voir tout <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          {data?.recent_courses?.length > 0 ? (
            <div className="space-y-3">
              {data.recent_courses.map((course, idx) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-[#F0F4FF] transition-all group"
                  data-testid={`recent-course-${idx}`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${course.subject_color}20, ${course.subject_color}40)` }}
                  >
                    <FileText className="w-6 h-6" style={{ color: course.subject_color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1E293B] group-hover:text-[#4F46E5] truncate transition-colors">
                      {course.title}
                    </p>
                    <p className="text-sm text-[#64748B]">{course.subject_name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                    <Clock className="w-4 h-4" />
                    {new Date(course.updated_at).toLocaleDateString('fr-FR')}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state text-center py-12 px-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#1E293B] mb-2">Aucun cours</h3>
              <p className="text-[#64748B] mb-4">Commencez par ajouter vos cours !</p>
              <Link
                to="/courses"
                className="btn-gradient inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Ajouter un cours
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Flashcards Due */}
          <div className="relative overflow-hidden rounded-2xl p-6 text-white bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#EC4899]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <Brain className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-white/80 text-sm">Flashcards à réviser</p>
                  <p className="text-4xl font-bold">{data?.due_flashcards || 0}</p>
                </div>
              </div>
              <Link
                to="/flashcards"
                className="block w-full bg-white text-[#4F46E5] text-center py-3 rounded-xl font-semibold hover:bg-white/90 transition-colors shadow-lg"
                data-testid="flashcards-cta"
              >
                Commencer la révision
              </Link>
            </div>
          </div>

          {/* Quick Quiz */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#EF4444] flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[#1E293B]">Quiz rapide</h3>
                <p className="text-sm text-[#64748B]">Testez vos connaissances</p>
              </div>
            </div>
            <Link
              to="/quiz"
              className="block w-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white text-center py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20"
              data-testid="quiz-cta"
            >
              Lancer un quiz
            </Link>
          </div>
        </div>
      </div>

      {/* Subjects Overview */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            📖 Vos matières
          </h2>
          <Link
            to="/subjects"
            className="text-sm text-[#4F46E5] hover:text-[#4338CA] font-medium flex items-center gap-1"
          >
            Gérer <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subjects.slice(0, 8).map((subject, idx) => (
              <Link
                key={subject.id}
                to={`/courses?subject_id=${subject.id}`}
                className="subject-card p-5 border border-[#E2E8F0] hover:shadow-lg transition-all group"
                style={{ '--subject-color': subject.color }}
                data-testid={`subject-card-${idx}`}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `linear-gradient(135deg, ${subject.color}20, ${subject.color}40)` }}
                >
                  <BookOpen className="w-5 h-5" style={{ color: subject.color }} />
                </div>
                <h4 className="font-semibold text-[#1E293B] group-hover:text-[#4F46E5] transition-colors">
                  {subject.name}
                </h4>
                <p className="text-sm text-[#64748B] mt-1">
                  {subject.course_count} cours · {subject.question_count} questions
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state text-center py-12 px-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#EC4899] flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#1E293B] mb-2">Aucune matière</h3>
            <p className="text-[#64748B] mb-4">Créez votre première matière pour commencer</p>
            <Link
              to="/subjects"
              className="btn-gradient inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" /> Créer une matière
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, gradient, testId }) {
  return (
    <div
      className="stat-card relative overflow-hidden"
      data-testid={testId}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-10 -translate-y-1/2 translate-x-1/2`} />
      <div className="relative flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-sm text-[#64748B] font-medium">{label}</p>
          <p className="text-3xl font-bold text-[#1E293B]">{value}</p>
        </div>
      </div>
    </div>
  );
}
