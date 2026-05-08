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
  Palette,
  Sparkles
} from 'lucide-react';

const COLORS = [
  '#4F46E5', // Indigo
  '#7C3AED', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
];

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
      setFormData({ name: '', description: '', color: COLORS[Math.floor(Math.random() * COLORS.length)], icon: 'book' });
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
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette matière ?')) return;
    
    try {
      await subjectsApi.delete(id);
      fetchSubjects();
    } catch (err) {
      alert(formatApiError(err));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 skeleton rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="subjects-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Matières
          </h1>
          <p className="text-[#64748B] mt-2 text-lg">
            Organisez vos cours par matière 📚
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="btn-gradient flex items-center gap-2"
          data-testid="create-subject-btn"
        >
          <Plus className="w-5 h-5" />
          Nouvelle matière
        </button>
      </div>

      {/* Subjects Grid */}
      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject, idx) => (
            <div
              key={subject.id}
              className="subject-card bg-white border border-[#E2E8F0] p-6 hover:shadow-xl transition-all group"
              style={{ '--subject-color': subject.color }}
              data-testid={`subject-${idx}`}
            >
              <div 
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ background: `linear-gradient(90deg, ${subject.color}, ${subject.color}80)` }}
              />
              
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}CC)` }}
                >
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openModal(subject)}
                    className="p-2 text-[#64748B] hover:text-[#4F46E5] hover:bg-[#F0F4FF] rounded-xl transition-all"
                    data-testid={`edit-subject-${idx}`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(subject.id)}
                    className="p-2 text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded-xl transition-all"
                    data-testid={`delete-subject-${idx}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <Link to={`/courses?subject_id=${subject.id}`}>
                <h3 className="text-xl font-bold text-[#1E293B] mb-2 hover:text-[#4F46E5] transition-colors">
                  {subject.name}
                </h3>
              </Link>
              
              {subject.description && (
                <p className="text-[#64748B] mb-4 line-clamp-2 text-sm">
                  {subject.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F0F4FF] text-[#4F46E5] font-medium">
                  <FileText className="w-4 h-4" />
                  {subject.course_count} cours
                </span>
                <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FDF4FF] text-[#A855F7] font-medium">
                  <HelpCircle className="w-4 h-4" />
                  {subject.question_count} questions
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state text-center py-16 px-6">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#4F46E5] to-[#EC4899] flex items-center justify-center shadow-2xl shadow-purple-500/30">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-[#1E293B] mb-3">Aucune matière</h3>
          <p className="text-[#64748B] mb-6 text-lg max-w-md mx-auto">
            Créez votre première matière pour organiser vos cours et commencer à réviser !
          </p>
          <button
            onClick={() => openModal()}
            className="btn-gradient inline-flex items-center gap-2 text-lg px-8 py-4"
          >
            <Sparkles className="w-6 h-6" />
            Créer ma première matière
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-fadeInUp" data-testid="subject-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {editingSubject ? '✏️ Modifier la matière' : '✨ Nouvelle matière'}
              </h2>
              <button
                onClick={closeModal}
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
                  Nom de la matière *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cardiologie, Neurologie..."
                  className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] transition-colors"
                  required
                  data-testid="subject-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Décrivez cette matière..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] transition-colors resize-none"
                  data-testid="subject-description-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1E293B] mb-3">
                  <Palette className="w-4 h-4 inline mr-2" />
                  Couleur
                </label>
                <div className="flex gap-3 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded-xl transition-all shadow-lg ${
                        formData.color === color ? 'ring-4 ring-offset-2 ring-[#4F46E5] scale-110' : 'hover:scale-105'
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
                  className="flex-1 px-6 py-3 border-2 border-[#E2E8F0] text-[#64748B] rounded-xl hover:bg-[#F1F5F9] transition-colors font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-gradient flex items-center justify-center gap-2"
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
