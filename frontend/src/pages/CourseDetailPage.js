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
  X,
  FileText,
  Download,
  Eye,
  FileType
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
  const [viewMode, setViewMode] = useState('original'); // 'original' or 'text'
  const [docxHtml, setDocxHtml] = useState(null);
  const [docxLoading, setDocxLoading] = useState(false);

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
      
      // Set default view mode based on file type
      if (res.data.original_file) {
        setViewMode('original');
      } else {
        setViewMode('text');
      }
      
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

  // Fetch DOCX as formatted HTML when needed
  useEffect(() => {
    if (
      course?.original_file?.file_type === 'docx' &&
      viewMode === 'original' &&
      !editing &&
      docxHtml === null &&
      !docxLoading
    ) {
      setDocxLoading(true);
      coursesApi.getFileHtml(id)
        .then(res => setDocxHtml(res.data))
        .catch(err => {
          console.error('DOCX HTML fetch failed', err);
          setDocxHtml('');
        })
        .finally(() => setDocxLoading(false));
    }
  }, [course, viewMode, editing, id, docxHtml, docxLoading]);

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

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'markdown': return '📋';
      default: return '📃';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 skeleton rounded-lg" />
        <div className="h-96 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!course) return null;

  const analysis = course.analysis || {};
  const originalFile = course.original_file;

  return (
    <div className="space-y-6" data-testid="course-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="mt-1 p-2 hover:bg-[#F0F4FF] rounded-xl transition-colors"
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
                className="text-3xl font-bold text-[#1E293B] border-b-2 border-[#4F46E5] outline-none bg-transparent"
                data-testid="edit-title"
              />
            ) : (
              <h1 className="text-3xl font-bold text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {course.title}
              </h1>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <span
                className="px-3 py-1.5 rounded-lg font-medium text-sm"
                style={{ backgroundColor: `${subject?.color}20`, color: subject?.color }}
              >
                {subject?.name}
              </span>
              {course.chapter && <span className="text-[#64748B]">· {course.chapter}</span>}
              <span className="flex items-center gap-1 text-sm text-[#94A3B8]">
                <Clock className="w-4 h-4" />
                {new Date(course.updated_at).toLocaleDateString('fr-FR')}
              </span>
              {originalFile && (
                <span className="flex items-center gap-1 text-sm px-2 py-1 bg-[#F0F4FF] rounded-lg text-[#4F46E5]">
                  {getFileIcon(originalFile.file_type)} {originalFile.filename}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="p-2.5 text-[#64748B] hover:bg-[#F1F5F9] rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-[#10B981] text-white px-4 py-2.5 rounded-xl hover:bg-[#059669] font-medium"
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
                className="flex items-center gap-2 px-3 py-2.5 text-[#64748B] hover:bg-[#F0F4FF] rounded-xl transition-colors"
                title="Régénérer les questions"
                data-testid="regenerate-btn"
              >
                <RefreshCw className={`w-5 h-5 ${regenerating ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setEditing(true)}
                className="p-2.5 text-[#64748B] hover:bg-[#F0F4FF] rounded-xl"
                data-testid="edit-btn"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2.5 text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded-xl"
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
          {/* View Mode Tabs */}
          {originalFile && !editing && (
            <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-xl w-fit">
              <button
                onClick={() => setViewMode('original')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'original'
                    ? 'bg-white text-[#4F46E5] shadow-sm'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <Eye className="w-4 h-4" />
                Document original
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  viewMode === 'text'
                    ? 'bg-white text-[#4F46E5] shadow-sm'
                    : 'text-[#64748B] hover:text-[#1E293B]'
                }`}
              >
                <FileText className="w-4 h-4" />
                Texte extrait
              </button>
            </div>
          )}

          {/* Course Content */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            {editing ? (
              <div className="p-6">
                <h2 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#4F46E5]" />
                  Modifier le contenu
                </h2>
                <textarea
                  value={editData.content}
                  onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  rows={20}
                  className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] outline-none resize-y font-mono text-sm"
                  data-testid="edit-content"
                />
              </div>
            ) : viewMode === 'original' && originalFile ? (
              <div>
                <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(originalFile.file_type)}</span>
                    <div>
                      <p className="font-semibold text-[#1E293B]">{originalFile.filename}</p>
                      <p className="text-sm text-[#64748B]">
                        {originalFile.file_type === 'pdf' ? 'Document PDF' :
                         originalFile.file_type === 'docx' ? 'Document Word' :
                         originalFile.file_type === 'markdown' ? 'Fichier Markdown' : 'Fichier texte'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={coursesApi.getFileUrl(id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white rounded-xl hover:bg-[#4338CA] font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </a>
                </div>
                
                {originalFile.file_type === 'pdf' ? (
                  <iframe
                    src={coursesApi.getFileUrl(id)}
                    className="w-full h-[700px] border-0"
                    title="PDF Viewer"
                  />
                ) : originalFile.file_type === 'docx' ? (
                  docxLoading || docxHtml === null ? (
                    <div className="flex items-center justify-center h-[700px] bg-[#F8FAFC]">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-3 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-[#64748B]">Chargement du document...</p>
                      </div>
                    </div>
                  ) : docxHtml ? (
                    <iframe
                      srcDoc={docxHtml}
                      className="w-full h-[800px] border-0 bg-[#f3f3f3]"
                      title="Word Document Viewer"
                      data-testid="docx-viewer"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="p-6">
                      <div className="bg-[#FEF2F2] rounded-xl p-6 border border-[#FEE2E2] text-center">
                        <p className="text-[#EF4444] mb-4">Impossible d'afficher le document Word</p>
                        <a
                          href={coursesApi.getFileUrl(id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white rounded-xl hover:bg-[#4338CA] font-medium"
                        >
                          <Download className="w-5 h-5" />
                          Télécharger le fichier
                        </a>
                      </div>
                    </div>
                  )
                ) : originalFile.file_type === 'markdown' ? (
                  <div className="p-6 prose-course">
                    <ReactMarkdown>{course.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="bg-[#F8FAFC] rounded-xl p-6 border border-[#E2E8F0]">
                      <p className="text-[#64748B] text-center mb-4">
                        Aperçu non disponible pour ce type de fichier
                      </p>
                      <a
                        href={coursesApi.getFileUrl(id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#4F46E5] text-white rounded-xl hover:bg-[#4338CA] font-medium mx-auto w-fit"
                      >
                        <Download className="w-5 h-5" />
                        Ouvrir avec l'application par défaut
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6">
                <h2 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#4F46E5]" />
                  Contenu du cours
                </h2>
                <div className="prose-course">
                  <ReactMarkdown>{course.content}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {(course.tags?.length > 0 || editing) && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#8B5CF6]" />
                Tags
              </h2>
              {editing ? (
                <input
                  type="text"
                  value={editData.tags}
                  onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                  placeholder="Séparez les tags par des virgules"
                  className="w-full px-4 py-3 border-2 border-[#E2E8F0] rounded-xl focus:border-[#4F46E5] outline-none"
                  data-testid="edit-tags"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {course.tags?.map((tag, i) => (
                    <span key={i} className="badge badge-primary">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Analysis */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F59E0B]" />
              Analyse IA
            </h2>
            
            {analysis.summary ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-[#64748B] mb-2">📝 Résumé</h4>
                  <p className="text-sm text-[#334155] bg-[#F8FAFC] p-3 rounded-xl">{analysis.summary}</p>
                </div>

                {analysis.concepts?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-[#64748B] mb-2">💡 Notions clés</h4>
                    <div className="flex flex-wrap gap-1">
                      {analysis.concepts.slice(0, 10).map((c, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-[#F0F4FF] rounded-lg text-[#4F46E5] font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.definitions?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-[#64748B] mb-2">📖 Définitions</h4>
                    <div className="space-y-2">
                      {analysis.definitions.slice(0, 3).map((d, i) => (
                        <div key={i} className="text-sm bg-[#F8FAFC] p-3 rounded-xl">
                          <span className="font-semibold text-[#4F46E5]">{d.term}:</span>
                          <span className="text-[#64748B] ml-1">{d.definition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-10 h-10 border-3 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-[#64748B]">Analyse en cours...</p>
              </div>
            )}
          </div>

          {/* Questions Count */}
          <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <HelpCircle className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{course.question_count}</p>
                  <p className="text-white/80 text-sm">Questions générées</p>
                </div>
              </div>
            </div>
            <Link
              to={`/quiz?course_id=${id}`}
              className="block w-full bg-white text-[#4F46E5] text-center py-3 rounded-xl font-semibold mt-4 hover:bg-white/90 transition-colors"
            >
              Lancer un quiz →
            </Link>
          </div>

          {/* Cross References */}
          {course.cross_references?.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
              <h2 className="text-lg font-bold text-[#1E293B] mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-[#06B6D4]" />
                Cours liés
              </h2>
              <div className="space-y-3">
                {course.cross_references.map((ref, i) => (
                  <Link
                    key={i}
                    to={`/courses/${ref.course_id}`}
                    className="block p-3 rounded-xl hover:bg-[#F0F4FF] transition-colors border border-[#E2E8F0]"
                  >
                    <p className="font-semibold text-[#1E293B]">{ref.title}</p>
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
