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
  Sparkles
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
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-[#E2E8F0] rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-[#E2E8F0] rounded-xl" />)}
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Tableau de bord
        </h1>
        <p className="text-[#64748B] mt-1">
          Bienvenue ! Voici un aperçu de votre progression.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Matières"
          value={stats.subject_count || 0}
          color="#3B82F6"
          testId="stat-subjects"
        />
        <StatCard
          icon={FileText}
          label="Cours"
          value={stats.course_count || 0}
          color="#8B5CF6"
          testId="stat-courses"
        />
        <StatCard
          icon={HelpCircle}
          label="Questions"
          value={stats.question_count || 0}
          color="#EC4899"
          testId="stat-questions"
        />
        <StatCard
          icon={TrendingUp}
          label="Taux de réussite"
          value={`${stats.success_rate || 0}%`}
          color="#059669"
          testId="stat-success"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Courses */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Cours récents
            </h2>
            <Link
              to="/courses"
              className="text-sm text-[#2563EB] hover:underline flex items-center gap-1"
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
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                  style={{ animationDelay: `${idx * 0.05}s` }}
                  data-testid={`recent-course-${idx}`}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${course.subject_color}20` }}
                  >
                    <FileText className="w-5 h-5" style={{ color: course.subject_color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#0F172A] truncate">{course.title}</p>
                    <p className="text-sm text-[#64748B]">{course.subject_name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#64748B]">
                    <Clock className="w-3 h-3" />
                    {new Date(course.updated_at).toLocaleDateString('fr-FR')}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-[#E2E8F0] mb-3" />
              <p className="text-[#64748B]">Aucun cours récent</p>
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 mt-3 text-[#2563EB] hover:underline"
              >
                <Plus className="w-4 h-4" /> Ajouter un cours
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Flashcards Due */}
          <div className="bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white/80 text-sm">Flashcards à réviser</p>
                <p className="text-3xl font-bold">{data?.due_flashcards || 0}</p>
              </div>
            </div>
            <Link
              to="/flashcards"
              className="block w-full bg-white text-[#2563EB] text-center py-2 rounded-lg font-medium hover:bg-white/90 transition-colors"
              data-testid="flashcards-cta"
            >
              Commencer la révision
            </Link>
          </div>

          {/* Quick Quiz */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#F0FDF4] rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#059669]" />
              </div>
              <h3 className="font-semibold text-[#0F172A]">Quiz rapide</h3>
            </div>
            <p className="text-sm text-[#64748B] mb-4">
              Testez vos connaissances avec un quiz aléatoire.
            </p>
            <Link
              to="/quiz"
              className="block w-full bg-[#0F172A] text-white text-center py-2 rounded-lg font-medium hover:bg-[#1E293B] transition-colors"
              data-testid="quiz-cta"
            >
              Lancer un quiz
            </Link>
          </div>
        </div>
      </div>

      {/* Subjects Overview */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Vos matières
          </h2>
          <Link
            to="/subjects"
            className="text-sm text-[#2563EB] hover:underline flex items-center gap-1"
          >
            Gérer <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {subjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subjects.slice(0, 8).map((subject, idx) => (
              <Link
                key={subject.id}
                to={`/subjects/${subject.id}`}
                className="subject-card p-4 bg-white border border-[#E2E8F0] rounded-lg hover:-translate-y-1 transition-transform"
                style={{ borderLeftColor: subject.color }}
                data-testid={`subject-card-${idx}`}
              >
                <h4 className="font-medium text-[#0F172A] mb-1">{subject.name}</h4>
                <p className="text-sm text-[#64748B]">
                  {subject.course_count} cours · {subject.question_count} questions
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto text-[#E2E8F0] mb-3" />
            <p className="text-[#64748B]">Aucune matière créée</p>
            <Link
              to="/subjects"
              className="inline-flex items-center gap-2 mt-3 text-[#2563EB] hover:underline"
            >
              <Plus className="w-4 h-4" /> Créer une matière
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, testId }) {
  return (
    <div
      className="bg-white rounded-xl border border-[#E2E8F0] p-5 card-hover"
      data-testid={testId}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div>
          <p className="text-sm text-[#64748B]">{label}</p>
          <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
        </div>
      </div>
    </div>
  );
}
