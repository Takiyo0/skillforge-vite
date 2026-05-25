import { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Menu, X, LayoutDashboard, BookOpen, Award, MessageSquare,
	LogOut, Settings, Map, Star, Users, FlaskConical, Trophy
} from 'lucide-react';
import logo from '@skillforge/vite/assets/logo.svg';

interface NavItem {
	id: string;
	icon: typeof LayoutDashboard;
	label: string;
	path: string;
}

interface MobileNavProps {
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onLogout: () => void;
	role: 'student' | 'instructor' | 'admin';
}

export function MobileNav({
	isOpen,
	onOpenChange,
	onLogout,
	role,
}: MobileNavProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const isAdminArea = location.pathname.startsWith('/admin');
	const drawerRef = useRef<HTMLDivElement>(null);

	const navItems: Record<string, NavItem[]> = {
		student: [
			{ id: 'dashboard', icon: LayoutDashboard, label: 'Home Base', path: '/student/dashboard' },
			{ id: 'browse_courses', icon: BookOpen, label: 'Browse Courses', path: '/student/browse-courses' },
			{ id: 'learning_paths', icon: BookOpen, label: 'Learning Paths', path: '/student/learning-paths' },
			{ id: 'leaderboard', icon: Trophy, label: 'Leaderboard', path: '/student/leaderboard' },
			{ id: 'certificates', icon: Award, label: 'Trophy Room', path: '/student/certificates' },
			{ id: 'forum', icon: MessageSquare, label: 'Forums', path: '/student/forum' },
			{ id: 'code_sandbox', icon: FlaskConical, label: 'Code Sandbox', path: '/student/code-sandbox' },
			{ id: 'settings', icon: Settings, label: 'Settings', path: '/student/settings' },
		],
		instructor: [
			{ id: 'dashboard', icon: LayoutDashboard, label: 'Command Center', path: '/instructor/dashboard' },
			{ id: 'course_manager', icon: BookOpen, label: 'Manage Quests', path: '/instructor/quests' },
			{ id: 'forum', icon: MessageSquare, label: 'Forums', path: '/student/forum' },
		],
		admin: [
			{ id: 'courses', icon: BookOpen, label: 'Courses', path: '/admin/courses' },
			{ id: 'learning-paths', icon: Map, label: 'Learning Paths', path: '/admin/learning-paths' },
			{ id: 'badges', icon: Star, label: 'Badges', path: '/admin/badges' },
			{ id: 'users', icon: Users, label: 'Users', path: '/admin/users' },
		]
	};

	const items =
		isAdminArea && role === 'instructor'
			? navItems.admin.slice(0, 1)
			: navItems[role] || [];

	const handleNavigation = (path: string) => {
		navigate(path);
		onOpenChange(false);
	};

	const handleLogout = () => {
		onLogout();
		onOpenChange(false);
	};

	// Close drawer when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
				onOpenChange(false);
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [isOpen, onOpenChange]);

	// Close drawer on escape key
	useEffect(() => {
		function handleEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				onOpenChange(false);
			}
		}

		if (isOpen) {
			document.addEventListener('keydown', handleEscape);
			return () => document.removeEventListener('keydown', handleEscape);
		}
	}, [isOpen, onOpenChange]);

	return (
		<>
			{/* Hamburger Menu Button - Only visible on mobile */}
			<button
				onClick={() => onOpenChange(!isOpen)}
				className="lg:hidden fixed top-4 left-4 z-40 h-11 w-11 flex items-center justify-center rounded-2xl glass-chip hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
				aria-label="Toggle navigation menu"
				aria-expanded={isOpen}
			>
				<motion.div
					animate={{ rotate: isOpen ? 90 : 0 }}
					transition={{ duration: 0.2, ease: 'easeInOut' }}
				>
					{isOpen ? (
						<X size={24} className="text-slate-700 dark:text-slate-300" />
					) : (
						<Menu size={24} className="text-slate-700 dark:text-slate-300" />
					)}
				</motion.div>
			</button>

			{/* Overlay Background */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="sm:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
						onClick={() => onOpenChange(false)}
					/>
				)}
			</AnimatePresence>

			{/* Mobile Navigation Drawer */}
			<AnimatePresence>
				{isOpen && (
					<motion.div
						ref={drawerRef}
						initial={{ x: -320, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: -320, opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						className="sm:hidden fixed left-0 top-0 h-screen w-72 z-40 rounded-[2rem] glass-shell flex flex-col transition-colors overflow-hidden"
					>
						{/* Logo Section */}
						<div className="p-6 flex items-center space-x-3">
							<img src={logo} alt="SkillForge logo" className="w-10 h-10 object-contain shrink-0" />
							<span className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-300 dark:to-cyan-300">
								SkillForge
							</span>
						</div>

						{/* Navigation */}
						<nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
							<p className="px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
								Navigation
							</p>
							{items.map((item) => {
								const Icon = item.icon;
								const isActive = location.pathname === item.path;
								return (
									<motion.button
										key={item.id}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={() => handleNavigation(item.path)}
										className={`glass-chip w-full flex items-center space-x-4 px-4 py-3.5 rounded-2xl font-bold transition-all ${
											isActive
												? 'bg-blue-500/18 text-blue-700 dark:text-blue-200 shadow-lg shadow-blue-500/20'
												: 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/60'
										}`}
									>
										<Icon size={20} />
										<span className="text-sm uppercase tracking-wider">{item.label}</span>
									</motion.button>
								);
							})}
						</nav>

						{/* Footer - Logout */}
						<div className="p-4 space-y-3 border-t border-white/10">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={handleLogout}
								className="glass-chip w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-red-500/10 transition-colors font-bold text-sm"
							>
								<LogOut size={18} />
								<span className="uppercase tracking-wider">Logout</span>
							</motion.button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
