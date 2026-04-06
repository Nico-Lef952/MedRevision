import React, { useState, useEffect } from 'react';
import { statsApi } from '../lib/api';
import {
  BarChart3,
  TrendingUp,
  Target,
  Award,
  AlertTriangle
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';

export default function StatsPage() {
  const [overview, setOverview] = useState(null);
  const [bySubject, setBySubject] = useState([]);
  const [weakConcepts, setWeakConcepts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, subjectRes, weakRes] = await Promise.all([
          statsApi.overview(),
          statsApi.bySubject(),
          statsApi.weakConcepts()
        ]);
        setOverview(overviewRes.data);
        setBySubject(subjectRes.data);
        setWeakConcepts(weakRes.data);
      } catch (err) {
        console.error(err);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-[#E2E8F0] rounded-xl" />)}
        </div>
      </div>
    );
  }

  const radarData = bySubject.map(s => ({
    subject: s.name.length > 12 ? s.name.substring(0, 12) + '...' : s.name,
    mastery: s.mastery,
    fullMark: 100
  }));

  const activityData = overview?.recent_activity?.map((a, i) => ({
    name: `J-${6-i}`,
    score: a.total > 0 ? Math.round((a.score / a.total) * 100) : 0
  })).reverse() || [];

  return (
    <div className="space-y-6" data-testid="stats-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Statistiques
        </h1>
        <p className="text-[#64748B] mt-1">
          Suivez votre progression
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Target}
          label="Taux de réussite"
          value={`${overview?.success_rate || 0}%`}
          color="#059669"
        />
        <StatCard
          icon={BarChart3}
          label="Questions répondues"
          value={overview?.total_answers || 0}
          color="#2563EB"
        />
        <StatCard
          icon={TrendingUp}
          label="Bonnes réponses"
          value={overview?.correct_answers || 0}
          color="#8B5CF6"
        />
        <StatCard
          icon={Award}
          label="Matières"
          value={overview?.subject_count || 0}
          color="#F59E0B"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mastery Radar */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Maîtrise par matière
          </h2>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748B' }} />
                <Radar
                  name="Maîtrise"
                  dataKey="mastery"
                  stroke="#2563EB"
                  fill="#2563EB"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#64748B]">
              Pas encore de données
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Activité récente
          </h2>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fill: '#64748B' }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ fill: '#2563EB' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[#64748B]">
              Pas encore de données
            </div>
          )}
        </div>
      </div>

      {/* Subject Details & Weak Concepts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Progress */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Progression par matière
          </h2>
          {bySubject.length > 0 ? (
            <div className="space-y-4">
              {bySubject.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#0F172A]">{s.name}</span>
                    <span className="text-sm text-[#64748B]">{s.mastery}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ 
                        width: `${s.mastery}%`,
                        backgroundColor: s.color
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[#64748B] mt-1">
                    <span>{s.course_count} cours</span>
                    <span>{s.correct_answers}/{s.total_answers} correct</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#64748B]">
              Pas encore de données
            </div>
          )}
        </div>

        {/* Weak Concepts */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <AlertTriangle className="w-5 h-5 text-[#D97706]" />
            Notions à travailler
          </h2>
          {weakConcepts.length > 0 ? (
            <div className="space-y-3">
              {weakConcepts.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-[#FEF3C7] rounded-lg"
                >
                  <span className="text-sm font-medium text-[#92400E]">{c.concept}</span>
                  <span className="text-sm text-[#D97706]">{c.error_count} erreurs</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Award className="w-12 h-12 mx-auto text-[#059669] mb-2" />
              <p className="text-[#64748B]">Aucune notion à travailler !</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-5 card-hover">
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
