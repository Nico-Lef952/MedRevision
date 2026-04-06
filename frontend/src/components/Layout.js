import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  X
} from 'lucide-react';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { path: '/subjects', icon: BookOpen, label: 'Matières' },
  { path: '/courses', icon: FileText, label: 'Cours' },
  { path: '/quiz', icon: HelpCircle, label: 'Quiz' },
  { path: '/flashcards', icon: Brain, label: 'Flashcards' },
  { path: '/stats', icon: BarChart3, label: 'Statistiques' },
  { path: '/knowledge-graph', icon: Network, label: 'Carte des savoirs' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E2E8F0] z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            MedRevision
          </span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-[#F1F5F9] rounded-lg"
          data-testid="mobile-menu-btn"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-white border-r border-[#E2E8F0] z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-[#E2E8F0]">
          <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[#0F172A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              MedRevision
            </h1>
            <p className="text-xs text-[#64748B]">Révision médicale</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#2563EB] rounded-full flex items-center justify-center text-white font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[#0F172A] truncate">{user?.name || 'Utilisateur'}</p>
              <p className="text-xs text-[#64748B] truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-[#64748B] hover:text-[#E11D48] hover:bg-[#FFE4E6] rounded-lg transition-colors"
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
