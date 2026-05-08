import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { coursesApi, subjectsApi, formatApiError } from '../lib/api';
import {
  Plus,
  FileText,
  Upload,
  Search,
  Clock,
  HelpCircle,
  X,
  Check,
  Sparkles,
  BookOpen,
  Zap
} from 'lucide-react';

export default function CoursesPage() {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [formData, setFormData] = useState({ title: '', subject_id: '', content: '', tags: '', chapter: '' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState(searchParams.get('subject_id') || '');

  const fetchData = async () => {
    try {
      const [coursesRes, subjectsRes] = await Promise.all([
        coursesApi.getAll({ subject_id: filterSubject || undefined, search: searchQuery || undefined }),
        subjectsApi.getAll()
      ]);
      setCourses(coursesRes.data);
      setSubjects(subjectsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterSubject, searchQuery]);

  const openModal = (mode = 'create') => {
    setModalMode(mode);
    setFormData({ title: '', subject_id: filterSubject || (subjects[0]?.id || ''), content: '', tags: '', chapter: '' });
    setFile(null);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (modalMode === 'upload' && file) {
        const fd = new FormData();
        fd.append('file', file);
        await coursesApi.upload(fd, formData.subject_id);
      } else {
        await coursesApi.create({
          ...formData,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
        });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const getSubjectColor = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.color || '#4F46E5';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 skeleton rounded-lg" />
        <div className="h-14 skeleton rounded-xl" />
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="courses-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Cours
          </h1>
          <p className="text-[#64748B] mt-2 text-lg">
            {courses.length} cours au total 📝
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => openModal('upload')}
            className="flex items-center gap-2 px-5 py-3 border-2 border-[#E2E8F0] text-[#1E293B] rounded-xl font-semibold hover:border-[#4F46E5] hover:text-[#4F46E5] transition-all"
            data-testid="upload-course-btn"
          >
            <Upload className="w-5 h-5" />
            Importer
          </button>
          <button
            onClick={() => openModal('create')}
            className="btn-gradient flex items-center gap-2"
            data-testid="create-course-btn"
          >
            <Plus className="w-5 h-5" />
            Nouveau cours
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un cours..."
            className="w-full pl-12 pr-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] transition-colors"
            data-testid="search-input"
          />
        </div>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] transition-colors bg-white font-medium"
          data-testid="filter-subject"
        >
          <option value="">Toutes les matières</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Courses List */}
      {courses.length > 0 ? (
        <div className="space-y-4">
          {courses.map((course, idx) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="flex items-center gap-5 p-5 bg-white border border-[#E2E8F0] rounded-2xl hover:shadow-lg hover:border-[#4F46E5]/30 transition-all group"
              data-testid={`course-${idx}`}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${getSubjectColor(course.subject_id)}, ${getSubjectColor(course.subject_id)}CC)` }}
              >
                <FileText className="w-7 h-7 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-[#1E293B] group-hover:text-[#4F46E5] transition-colors truncate">
                  {course.title}
                </h3>
                <p className="text-[#64748B] truncate">
                  {getSubjectName(course.subject_id)}
                  {course.chapter && ` · ${course.chapter}`}
                </p>
                {course.summary && (
                  <p className="text-sm text-[#94A3B8] mt-1 line-clamp-1">{course.summary}</p>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-4 shrink-0">
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FDF4FF] text-[#A855F7] font-medium text-sm">
                  <HelpCircle className="w-4 h-4" />
                  {course.question_count}
                </span>
                <span className="flex items-center gap-1 text-sm text-[#94A3B8]">
                  <Clock className="w-4 h-4" />
                  {new Date(course.updated_at).toLocaleDateString('fr-FR')}
                </span>
              </div>

              {course.tags?.length > 0 && (
                <div className="hidden lg:flex gap-2 shrink-0">
                  {course.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="badge badge-primary">{tag}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state text-center py-16 px-6">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#06B6D4] to-[#3B82F6] flex items-center justify-center shadow-2xl shadow-cyan-500/30">
            <FileText className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-[#1E293B] mb-3">
            {searchQuery || filterSubject ? 'Aucun résultat' : 'Aucun cours'}
          </h3>
          <p className="text-[#64748B] mb-6 text-lg max-w-md mx-auto">
            {searchQuery || filterSubject 
              ? 'Essayez de modifier vos filtres'
              : 'Ajoutez votre premier cours pour commencer !'}
          </p>
          {!searchQuery && !filterSubject && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => openModal('upload')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#4F46E5] text-[#4F46E5] rounded-xl font-semibold hover:bg-[#4F46E5] hover:text-white transition-all"
              >
                <Upload className="w-5 h-5" />
                Importer un PDF
              </button>
              <button
                onClick={() => openModal('create')}
                className="btn-gradient inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Créer un cours
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-fadeInUp max-h-[90vh] overflow-y-auto" data-testid="course-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {modalMode === 'upload' ? '📄 Importer un cours' : '✍️ Nouveau cours'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[#F1F5F9] rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-[#64748B]" />
              </button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-[#FEE2E2] border border-[#EF4444] text-[#EF4444] rounded-xl text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                  Matière *
                </label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] transition-colors bg-white"
                  required
                  data-testid="course-subject-select"
                >
                  <option value="">Sélectionner une matière</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {subjects.length === 0 && (
                  <p className="text-sm text-[#F59E0B] mt-2">
                    ⚠️ Créez d'abord une matière dans l'onglet "Matières"
                  </p>
                )}
              </div>

              {modalMode === 'upload' ? (
                <div>
                  <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                    Fichier (PDF, MD, TXT) *
                  </label>
                  <div className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-8 text-center hover:border-[#4F46E5] transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.md,.txt"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="hidden"
                      id="file-upload"
                      data-testid="file-input"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-[#1E293B] font-semibold text-lg">
                        {file ? file.name : 'Cliquez pour sélectionner'}
                      </p>
                      <p className="text-sm text-[#64748B] mt-2">PDF, Markdown ou texte</p>
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                      Titre du cours *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Insuffisance cardiaque"
                      className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] transition-colors"
                      required
                      data-testid="course-title-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                      Chapitre (optionnel)
                    </label>
                    <input
                      type="text"
                      value={formData.chapter}
                      onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                      placeholder="Ex: Chapitre 3"
                      className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] transition-colors"
                      data-testid="course-chapter-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                      Contenu du cours *
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Collez ou écrivez le contenu de votre cours ici..."
                      rows={8}
                      className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] transition-colors resize-none"
                      required
                      data-testid="course-content-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                      Tags (séparés par des virgules)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="cardiologie, ECG, arythmie"
                      className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] transition-colors"
                      data-testid="course-tags-input"
                    />
                  </div>
                </>
              )}

              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-[#F0FDF4] to-[#DCFCE7] border border-[#10B981] rounded-xl">
                <Zap className="w-6 h-6 text-[#10B981] shrink-0 mt-0.5" />
                <p className="text-sm text-[#059669]">
                  <strong>IA automatique :</strong> Le contenu sera analysé pour extraire les notions clés et générer des questions de révision !
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-[#E2E8F0] text-[#64748B] rounded-xl hover:bg-[#F1F5F9] transition-colors font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || (modalMode === 'upload' && !file) || !formData.subject_id}
                  className="flex-1 btn-gradient flex items-center justify-center gap-2 disabled:opacity-50"
                  data-testid="course-submit-btn"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      {modalMode === 'upload' ? 'Importer' : 'Créer'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
