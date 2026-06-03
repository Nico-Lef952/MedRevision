import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  HelpCircle,
  Brain,
  BarChart3,
  Network,
  LogOut,
  Menu,
  X,
  Sparkles,
  Trophy,
  Zap,
  Library
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de bord', color: '#4F46E5' },
  { path: '/subjects', icon: BookOpen, label: 'Matières', color: '#8B5CF6' },
  { path: '/courses', icon: FileText, label: 'Cours', color: '#06B6D4' },
  { path: '/quiz', icon: HelpCircle, label: 'Quiz', color: '#F59E0B' },
  { path: '/ancrage', icon: Zap, label: 'Ancrage', color: '#EC4899' },
  { path: '/exam', icon: Trophy, label: 'Examen blanc', color: '#DC2626' },
  { path: '/flashcards', icon: Brain, label: 'Flashcards', color: '#A855F7' },
  { path: '/references', icon: Library, label: 'Référentiels', color: '#0EA5E9' },
  { path: '/stats', icon: BarChart3, label: 'Statistiques', color: '#10B981' },
  { path: '/knowledge-graph', icon: Network, label: 'Carte des savoirs', color: '#EF4444' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#FAFBFF]">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-lg border-b border-[#E2E8F0] z-40 flex items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          data-testid="mobile-logo-link"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-[#1E293B] text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
            MedRevision
          </span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-[#F0F4FF] rounded-xl transition-colors"
          data-testid="mobile-menu-btn"
        >
          {sidebarOpen ? <X className="w-6 h-6 text-[#4F46E5]" /> : <Menu className="w-6 h-6 text-[#4F46E5]" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-72 bg-white border-r border-[#E2E8F0] z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <Link
          to="/"
          onClick={() => setSidebarOpen(false)}
          className="h-20 flex items-center gap-3 px-6 border-b border-[#E2E8F0] hover:bg-[#FAFBFF] transition-colors"
          data-testid="sidebar-logo-link"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl text-[#1E293B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              MedRevision
            </h1>
            <p className="text-xs text-[#64748B]">Révision intelligente</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px - 140px)' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${item.color}15` }}
              >
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
              </div>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#E2E8F0] bg-gradient-to-t from-white to-transparent">
          <div className="flex items-center gap-3 mb-4 p-3 bg-[#F0F4FF] rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#EC4899] flex items-center justify-center text-white font-bold text-lg">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#1E293B] truncate">{user?.name || 'Utilisateur'}</p>
              <p className="text-xs text-[#64748B] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[#EF4444] hover:bg-[#FEE2E2] rounded-xl transition-all font-medium"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
