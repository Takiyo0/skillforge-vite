import {useNavigate, useLocation} from 'react-router-dom';
import {
    LayoutDashboard, BookOpen, Award, MessageSquare,
    LogOut, Settings, Map, Star, Users, FlaskConical, Trophy
} from 'lucide-react';
import logo from '@skillforge/vite/assets/logo.svg';

interface NavItem {
    id: string;
    icon: typeof LayoutDashboard;
    label: string;
    path: string;
}

interface SidebarProps {
    role: 'student' | 'instructor' | 'admin';
    isDarkMode: boolean;
    onLogout: () => void;
}

export function Sidebar({role, onLogout}: SidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const isAdminArea = location.pathname.startsWith('/admin');

    const navItems: Record<string, NavItem[]> = {
        student: [
            {id: 'dashboard', icon: LayoutDashboard, label: 'Home Base', path: '/student/dashboard'},
            {id: 'browse_courses', icon: BookOpen, label: 'Browse Courses', path: '/student/browse-courses'},
            {id: 'learning_paths', icon: BookOpen, label: 'Learning Paths', path: '/student/learning-paths'},
            {id: 'leaderboard', icon: Trophy, label: 'Leaderboard', path: '/student/leaderboard'},
            {id: 'certificates', icon: Award, label: 'Trophy Room', path: '/student/certificates'},
            {id: 'forum', icon: MessageSquare, label: 'Forums', path: '/student/forum'},
            {id: 'code_sandbox', icon: FlaskConical, label: 'Code Sandbox', path: '/student/code-sandbox'},
            {id: 'settings', icon: Settings, label: 'Settings', path: '/student/settings'},
        ],
        instructor: [
            {id: 'dashboard', icon: LayoutDashboard, label: 'Command Center', path: '/instructor/dashboard'},
            {id: 'course_manager', icon: BookOpen, label: 'Manage Quests', path: '/instructor/quests'},
            {id: 'forum', icon: MessageSquare, label: 'Forums', path: '/student/forum'},
        ],
        admin: [
            {id: 'courses', icon: BookOpen, label: 'Courses', path: '/admin/courses'},
            {id: 'learning-paths', icon: Map, label: 'Learning Paths', path: '/admin/learning-paths'},
            {id: 'badges', icon: Star, label: 'Badges', path: '/admin/badges'},
            {id: 'users', icon: Users, label: 'Users', path: '/admin/users'},
        ]
    };

    const items =
        isAdminArea && role === 'instructor'
            ? navItems.admin.slice(0, 1)
            : navItems[role] || [];

    const handleNavigation = (path: string) => {
        navigate(path);
    };

    return (
        <div
            className="w-72 h-full rounded-[2rem] glass-shell flex flex-col transition-colors relative z-20 overflow-hidden">
            {/* Logo */}
            <div className="p-8 flex items-center space-x-3">
                <img src={logo} alt="SkillForge logo" className="w-12 h-12 object-contain shrink-0"/>
                <span
                    className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-300 dark:to-cyan-300">SkillForge</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
                <p className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Navigation</p>
                {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleNavigation(item.path)}
                            className={`glass-chip w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl font-bold transition-all ${isActive
                                ? 'bg-blue-500/18 text-blue-700 dark:text-blue-200 shadow-lg shadow-blue-500/20'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/60'
                            }`}
                        >
                            <Icon size={20}/>
                            <span className="text-sm uppercase tracking-wider">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 space-y-3 border-t border-white/10">
                <button
                    onClick={onLogout}
                    className="glass-chip w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-red-500/10 transition-colors font-bold text-sm"
                >
                    <LogOut size={18}/>
                    <span className="uppercase tracking-wider">Logout</span>
                </button>
            </div>
        </div>
    );
}
