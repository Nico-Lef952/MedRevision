import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { coursesApi, subjectsApi, formatApiError } from '../lib/api';
import {
  Plus,
  FileText,
  Upload,
  Search,
  Filter,
  Clock,
  HelpCircle,
  X,
  Check,
  Sparkles
} from 'lucide-react';

export default function CoursesPage() {
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'upload'
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
    return subject?.color || '#3B82F6';
  };

  const getSubjectName = (subjectId) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || 'Unknown';
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-[#E2E8F0] rounded" />
        <div className="h-12 bg-[#E2E8F0] rounded-lg" />
        <div className="grid grid-cols-1 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-[#E2E8F0] rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="courses-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Cours
          </h1>
          <p className="text-[#64748B] mt-1">
            {courses.length} cours au total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openModal('upload')}
            className="flex items-center gap-2 border border-[#E2E8F0] text-[#334155] px-4 py-2 rounded-lg font-medium hover:bg-[#F1F5F9] transition-colors"
            data-testid="upload-course-btn"
          >
            <Upload className="w-5 h-5" />
            Importer
          </button>
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-2 bg-[#0F172A] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#1E293B] transition-colors"
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un cours..."
            className="w-full pl-10 pr-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none"
            data-testid="search-input"
          />
        </div>
        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none bg-white"
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
        <div className="space-y-3">
          {courses.map((course, idx) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="flex items-center gap-4 p-4 bg-white border border-[#E2E8F0] rounded-xl hover:shadow-md transition-shadow"
              data-testid={`course-${idx}`}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${getSubjectColor(course.subject_id)}20` }}
              >
                <FileText className="w-6 h-6" style={{ color: getSubjectColor(course.subject_id) }} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[#0F172A] truncate">{course.title}</h3>
                <p className="text-sm text-[#64748B] truncate">
                  {getSubjectName(course.subject_id)}
                  {course.chapter && ` · ${course.chapter}`}
                </p>
                {course.summary && (
                  <p className="text-sm text-[#64748B] mt-1 line-clamp-1">{course.summary}</p>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-4 text-sm text-[#64748B] shrink-0">
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-4 h-4" />
                  {course.question_count}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(course.updated_at).toLocaleDateString('fr-FR')}
                </span>
              </div>

              {course.tags?.length > 0 && (
                <div className="hidden lg:flex gap-2 shrink-0">
                  {course.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="badge badge-accent">{tag}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E2E8F0]">
          <FileText className="w-16 h-16 mx-auto text-[#E2E8F0] mb-4" />
          <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Aucun cours</h3>
          <p className="text-[#64748B] mb-4">
            {searchQuery || filterSubject ? 'Aucun résultat pour cette recherche' : 'Ajoutez votre premier cours'}
          </p>
          {!searchQuery && !filterSubject && (
            <button
              onClick={() => openModal('create')}
              className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#1D4ED8] transition-colors"
            >
              <Plus className="w-5 h-5" />
              Créer un cours
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg p-6 animate-fadeIn max-h-[90vh] overflow-y-auto" data-testid="course-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {modalMode === 'upload' ? 'Importer un cours' : 'Nouveau cours'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[#F1F5F9] rounded-lg"
              >
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[#FFE4E6] text-[#E11D48] rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Matière *
                </label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none bg-white"
                  required
                  data-testid="course-subject-select"
                >
                  <option value="">Sélectionner une matière</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {modalMode === 'upload' ? (
                <div>
                  <label className="block text-sm font-medium text-[#334155] mb-2">
                    Fichier (PDF, MD, TXT) *
                  </label>
                  <div className="border-2 border-dashed border-[#E2E8F0] rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept=".pdf,.md,.txt"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="hidden"
                      id="file-upload"
                      data-testid="file-input"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer"
                    >
                      <Upload className="w-10 h-10 mx-auto text-[#64748B] mb-2" />
                      <p className="text-[#334155] font-medium">
                        {file ? file.name : 'Cliquez pour sélectionner'}
                      </p>
                      <p className="text-sm text-[#64748B] mt-1">PDF, Markdown ou texte</p>
                    </label>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Titre du cours *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ex: Insuffisance cardiaque"
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none"
                      required
                      data-testid="course-title-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Chapitre
                    </label>
                    <input
                      type="text"
                      value={formData.chapter}
                      onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                      placeholder="Ex: Chapitre 3"
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none"
                      data-testid="course-chapter-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Contenu du cours *
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Collez ou écrivez le contenu de votre cours ici..."
                      rows={8}
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none resize-none"
                      required
                      data-testid="course-content-input"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#334155] mb-2">
                      Tags (séparés par des virgules)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="cardiologie, ECG, arythmie"
                      className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none"
                      data-testid="course-tags-input"
                    />
                  </div>
                </>
              )}

              <div className="bg-[#F0FDF4] border border-[#059669] rounded-lg p-3 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-[#059669] shrink-0 mt-0.5" />
                <p className="text-sm text-[#059669]">
                  L'IA analysera automatiquement le contenu pour extraire les notions clés et générer des questions.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#F1F5F9] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting || (modalMode === 'upload' && !file)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0F172A] text-white px-4 py-2 rounded-lg hover:bg-[#1E293B] transition-colors disabled:opacity-50"
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
