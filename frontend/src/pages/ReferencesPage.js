import React, { useState, useEffect } from 'react';
import { Library, Upload, Trash2, FileText, Tag, Search, BookOpen, AlertCircle, X, Plus } from 'lucide-react';
import { referencesApi, formatApiError } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const FILE_ICON = {
  pdf: '📄',
  docx: '📝',
  markdown: '📋',
  text: '📃'
};

export default function ReferencesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [refs, setRefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ file: null, title: '', subject_hint: '', keywords: '' });

  const fetchRefs = async () => {
    try {
      const res = await referencesApi.list();
      setRefs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRefs(); }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setForm({ ...form, file: f, title: form.title || f.name.replace(/\.[^/.]+$/, '') });
    }
  };

  const handleUpload = async () => {
    if (!form.file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', form.file);
      await referencesApi.upload(fd, {
        title: form.title,
        subject_hint: form.subject_hint,
        keywords: form.keywords
      });
      setShowUpload(false);
      setForm({ file: null, title: '', subject_hint: '', keywords: '' });
      fetchRefs();
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Supprimer le référentiel "${title}" ?`)) return;
    try {
      await referencesApi.delete(id);
      fetchRefs();
    } catch (err) {
      alert(formatApiError(err));
    }
  };

  const filtered = refs.filter(r =>
    !search ||
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.subject_hint?.toLowerCase().includes(search.toLowerCase()) ||
    r.keywords?.some(k => k.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6" data-testid="references-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Référentiels
          </h1>
          <p className="text-[#64748B] mt-2 text-lg">
            Base de connaissances médicale auxiliaire · Enrichit les questions générées par l'IA
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowUpload(true)}
            className="btn-gradient inline-flex items-center gap-2"
            data-testid="upload-ref-btn"
          >
            <Upload className="w-5 h-5" />
            Ajouter un référentiel
          </button>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-gradient-to-r from-[#EFF6FF] to-[#EEF2FF] border border-[#C7D2FE] rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center shrink-0">
            <Library className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm text-[#1E293B]">
            <p className="font-semibold mb-1">Comment ça marche ?</p>
            <p className="text-[#475569]">
              Lors de la génération de questions sur vos cours, l'IA reçoit en contexte auxiliaire les <strong>référentiels les plus pertinents</strong> (par mots-clés et matière).
              Les questions <strong>restent toujours dans le cadre du cours</strong> — les référentiels servent uniquement à <strong>préciser et enrichir</strong> les explications.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher dans les référentiels..."
          className="w-full pl-12 pr-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] outline-none transition-colors"
          data-testid="ref-search"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 skeleton rounded-2xl" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(ref => (
            <div
              key={ref.id}
              className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-lg hover:border-[#4F46E5]/30 transition-all"
              data-testid={`ref-card-${ref.id}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center text-2xl shadow-md shrink-0">
                  {FILE_ICON[ref.file_type] || '📚'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1E293B] truncate">{ref.title}</h3>
                  <p className="text-sm text-[#64748B] truncate mt-0.5">{ref.filename}</p>
                  {ref.subject_hint && (
                    <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-1 bg-[#F0F4FF] text-[#4F46E5] rounded-lg font-medium">
                      <BookOpen className="w-3 h-3" />
                      {ref.subject_hint}
                    </span>
                  )}
                  {ref.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ref.keywords.slice(0, 5).map((k, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-[#F1F5F9] text-[#64748B] rounded">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-[#94A3B8] mt-2">
                    {Math.round((ref.content_length || 0) / 1000)}k caractères · {new Date(ref.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(ref.id, ref.title)}
                    className="p-2 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded-xl transition-colors shrink-0"
                    data-testid={`delete-ref-${ref.id}`}
                    title="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state text-center py-16 px-6 bg-white rounded-2xl border border-[#E2E8F0]">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center">
            <Library className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[#1E293B] mb-2">Aucun référentiel</h3>
          <p className="text-[#64748B] mb-4">
            {isAdmin ? "Ajoutez vos premiers référentiels (collège, traités, recommandations HAS...)" : "Aucun référentiel n'a encore été ajouté."}
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowUpload(true)}
              className="btn-gradient inline-flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Ajouter le premier
            </button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-[#1E293B]">Nouveau référentiel</h2>
              <button onClick={() => setShowUpload(false)} className="p-2 hover:bg-[#F1F5F9] rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-2">Fichier (PDF / DOCX / MD / TXT)</label>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.md,.markdown,.txt"
                  onChange={handleFileChange}
                  className="w-full text-sm text-[#64748B] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#4F46E5] file:text-white file:font-semibold hover:file:bg-[#4338CA]"
                  data-testid="ref-file-input"
                />
                {form.file && (
                  <p className="mt-2 text-sm text-[#22C55E]">✓ {form.file.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-2">Titre</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Collège de Cardiologie 2024"
                  className="w-full px-4 py-2.5 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] outline-none"
                  data-testid="ref-title-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-2">Matière (indication)</label>
                <input
                  type="text"
                  value={form.subject_hint}
                  onChange={(e) => setForm({ ...form, subject_hint: e.target.value })}
                  placeholder="Ex: Cardiologie, Pneumologie..."
                  className="w-full px-4 py-2.5 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] outline-none"
                  data-testid="ref-subject-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#334155] mb-2">Mots-clés (séparés par virgules)</label>
                <input
                  type="text"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  placeholder="Ex: insuffisance cardiaque, ECG, BNP"
                  className="w-full px-4 py-2.5 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] outline-none"
                  data-testid="ref-keywords-input"
                />
                <p className="text-xs text-[#94A3B8] mt-1">Aide l'IA à retrouver ce référentiel quand un cours mentionne ces termes.</p>
              </div>

              <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-3 rounded-lg">
                <p className="text-xs text-[#92400E] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Les référentiels enrichissent les explications de l'IA mais ne créent <strong>jamais</strong> de questions hors-cours.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 text-[#64748B] hover:bg-[#F1F5F9] rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={handleUpload}
                disabled={!form.file || uploading}
                className="px-6 py-2 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                data-testid="confirm-upload-btn"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Uploader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
