import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { coursesApi, subjectsApi, formatApiError } from '../lib/api';
import ReactMarkdown from 'react-markdown';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  HelpCircle,
  Tag,
  Link as LinkIcon,
  BookOpen,
  Sparkles,
  Save,
  X
} from 'lucide-react';

export default function CourseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ title: '', content: '', tags: '', chapter: '' });
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchCourse = async () => {
    try {
      const res = await coursesApi.get(id);
      setCourse(res.data);
      setEditData({
        title: res.data.title,
        content: res.data.content,
        tags: res.data.tags?.join(', ') || '',
        chapter: res.data.chapter || ''
      });
      
      // Fetch subject info
      const subRes = await subjectsApi.get(res.data.subject_id);
      setSubject(subRes.data);
    } catch (err) {
      console.error(err);
      navigate('/courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourse();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await coursesApi.update(id, {
        ...editData,
        tags: editData.tags ? editData.tags.split(',').map(t => t.trim()) : []
      });
      setEditing(false);
      fetchCourse();
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce cours ?')) return;
    
    try {
      await coursesApi.delete(id);
      navigate('/courses');
    } catch (err) {
      alert(formatApiError(err));
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Régénérer les questions ? Les anciennes seront supprimées.')) return;
    
    setRegenerating(true);
    try {
      await coursesApi.regenerateQuestions(id);
      setTimeout(fetchCourse, 2000);
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setRegenerating(false);
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

  if (!course) return null;

  const analysis = course.analysis || {};

  return (
    <div className="space-y-6" data-testid="course-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="mt-1 p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-[#64748B]" />
          </button>
          <div>
            {editing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="text-2xl font-bold text-[#0F172A] border-b-2 border-[#2563EB] outline-none bg-transparent"
                data-testid="edit-title"
              />
            ) : (
              <h1 className="text-2xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {course.title}
              </h1>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-[#64748B]">
              <span
                className="px-2 py-1 rounded-md"
                style={{ backgroundColor: `${subject?.color}20`, color: subject?.color }}
              >
                {subject?.name}
              </span>
              {course.chapter && <span>· {course.chapter}</span>}
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(course.updated_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="p-2 text-[#64748B] hover:bg-[#F1F5F9] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-[#059669] text-white px-4 py-2 rounded-lg hover:bg-[#047857]"
                data-testid="save-btn"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Sauvegarder
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-2 px-3 py-2 text-[#64748B] hover:bg-[#F1F5F9] rounded-lg"
                title="Régénérer les questions"
                data-testid="regenerate-btn"
              >
                <RefreshCw className={`w-5 h-5 ${regenerating ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setEditing(true)}
                className="p-2 text-[#64748B] hover:bg-[#F1F5F9] rounded-lg"
                data-testid="edit-btn"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-[#64748B] hover:text-[#E11D48] hover:bg-[#FFE4E6] rounded-lg"
                data-testid="delete-btn"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course Content */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Contenu du cours
            </h2>
            {editing ? (
              <textarea
                value={editData.content}
                onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                rows={20}
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] outline-none resize-y font-mono text-sm"
                data-testid="edit-content"
              />
            ) : (
              <div className="prose-course">
                <ReactMarkdown>{course.content}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Tags */}
          {(course.tags?.length > 0 || editing) && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags
              </h2>
              {editing ? (
                <input
                  type="text"
                  value={editData.tags}
                  onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                  placeholder="Séparez les tags par des virgules"
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] outline-none"
                  data-testid="edit-tags"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {course.tags?.map((tag, i) => (
                    <span key={i} className="badge badge-accent">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Analysis */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2563EB]" />
              Analyse IA
            </h2>
            
            {analysis.summary ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-[#64748B] mb-2">Résumé</h4>
                  <p className="text-sm text-[#334155]">{analysis.summary}</p>
                </div>

                {analysis.concepts?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[#64748B] mb-2">Notions clés</h4>
                    <div className="flex flex-wrap gap-1">
                      {analysis.concepts.slice(0, 10).map((c, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-[#F1F5F9] rounded-md text-[#334155]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.definitions?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[#64748B] mb-2">Définitions</h4>
                    <div className="space-y-2">
                      {analysis.definitions.slice(0, 3).map((d, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-[#0F172A]">{d.term}:</span>
                          <span className="text-[#64748B] ml-1">{d.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-[#64748B]">Analyse en cours...</p>
              </div>
            )}
          </div>

          {/* Questions Count */}
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#DBEAFE] rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#0F172A]">{course.question_count}</p>
                  <p className="text-sm text-[#64748B]">Questions générées</p>
                </div>
              </div>
              <Link
                to={`/quiz?course_id=${id}`}
                className="text-sm text-[#2563EB] hover:underline"
              >
                Quiz →
              </Link>
            </div>
          </div>

          {/* Cross References */}
          {course.cross_references?.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Cours liés
              </h2>
              <div className="space-y-3">
                {course.cross_references.map((ref, i) => (
                  <Link
                    key={i}
                    to={`/courses/${ref.course_id}`}
                    className="block p-3 rounded-lg hover:bg-[#F1F5F9] transition-colors"
                  >
                    <p className="font-medium text-[#0F172A]">{ref.title}</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      Notions communes: {ref.shared_concepts?.slice(0, 3).join(', ')}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
