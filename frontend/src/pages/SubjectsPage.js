import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subjectsApi, formatApiError } from '../lib/api';
import {
  Plus,
  BookOpen,
  FileText,
  HelpCircle,
  Edit2,
  Trash2,
  X,
  Check,
  Palette
} from 'lucide-react';

const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F43F5E', '#F59E0B', '#10B981', '#06B6D4'];
const ICONS = ['book', 'heart', 'brain', 'pill', 'bone', 'eye', 'lungs', 'stethoscope'];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: COLORS[0], icon: 'book' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSubjects = async () => {
    try {
      const res = await subjectsApi.getAll();
      setSubjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openModal = (subject = null) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        name: subject.name,
        description: subject.description || '',
        color: subject.color || COLORS[0],
        icon: subject.icon || 'book'
      });
    } else {
      setEditingSubject(null);
      setFormData({ name: '', description: '', color: COLORS[0], icon: 'book' });
    }
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSubject(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingSubject) {
        await subjectsApi.update(editingSubject.id, formData);
      } else {
        await subjectsApi.create(formData);
      }
      closeModal();
      fetchSubjects();
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir archiver cette matière ?')) return;
    
    try {
      await subjectsApi.delete(id);
      fetchSubjects();
    } catch (err) {
      alert(formatApiError(err));
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 bg-[#E2E8F0] rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-40 bg-[#E2E8F0] rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="subjects-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Matières
          </h1>
          <p className="text-[#64748B] mt-1">
            Organisez vos cours par matière
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-[#0F172A] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#1E293B] transition-colors"
          data-testid="create-subject-btn"
        >
          <Plus className="w-5 h-5" />
          Nouvelle matière
        </button>
      </div>

      {/* Subjects Grid */}
      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject, idx) => (
            <div
              key={subject.id}
              className="subject-card bg-white border border-[#E2E8F0] rounded-lg p-6 card-hover"
              style={{ borderLeftColor: subject.color }}
              data-testid={`subject-${idx}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${subject.color}20` }}
                >
                  <BookOpen className="w-6 h-6" style={{ color: subject.color }} />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openModal(subject)}
                    className="p-2 text-[#64748B] hover:text-[#2563EB] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                    data-testid={`edit-subject-${idx}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="p-2 text-[#64748B] hover:text-[#E11D48] hover:bg-[#FFE4E6] rounded-lg transition-colors"
                    data-testid={`delete-subject-${idx}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Link to={`/subjects/${subject.id}`}>
                <h3 className="text-lg font-semibold text-[#0F172A] mb-1 hover:text-[#2563EB]">
                  {subject.name}
                </h3>
              </Link>
              
              {subject.description && (
                <p className="text-sm text-[#64748B] mb-4 line-clamp-2">
                  {subject.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm text-[#64748B]">
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {subject.course_count} cours
                </span>
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-4 h-4" />
                  {subject.question_count} questions
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-[#E2E8F0]">
          <BookOpen className="w-16 h-16 mx-auto text-[#E2E8F0] mb-4" />
          <h3 className="text-xl font-semibold text-[#0F172A] mb-2">Aucune matière</h3>
          <p className="text-[#64748B] mb-4">Créez votre première matière pour commencer</p>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#1D4ED8] transition-colors"
          >
            <Plus className="w-5 h-5" />
            Créer une matière
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 animate-fadeIn" data-testid="subject-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {editingSubject ? 'Modifier la matière' : 'Nouvelle matière'}
              </h2>
              <button
                onClick={closeModal}
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
                  Nom de la matière *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cardiologie"
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none"
                  required
                  data-testid="subject-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la matière..."
                  rows={3}
                  className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none resize-none"
                  data-testid="subject-description-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#334155] mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Couleur
                </label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-[#0F172A] scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      data-testid={`color-${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-[#E2E8F0] text-[#64748B] rounded-lg hover:bg-[#F1F5F9] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0F172A] text-white px-4 py-2 rounded-lg hover:bg-[#1E293B] transition-colors disabled:opacity-50"
                  data-testid="subject-submit-btn"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      {editingSubject ? 'Modifier' : 'Créer'}
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
