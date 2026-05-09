import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User as UserIcon, Settings, Award, Shield } from 'lucide-react';
import type { User } from '@skillforge/vite/lib/types';
import { canAccessAdmin } from '@skillforge/vite/lib/roles';
import { getAvatarUrl } from '@skillforge/vite/lib/s3';

interface UserMenuProps {
	user: User;
	onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const isOnAdminRoute = location.pathname.startsWith('/admin');

	// Close menu when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const handleLogout = () => {
		onLogout();
		navigate('/login');
	};

	return (
		<div className="relative" ref={menuRef}>
			{/* Trigger Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center space-x-3 rounded-full glass-panel px-3 py-2.5 transition-colors hover:bg-white/20"
			>
				<img
					src={getAvatarUrl(user.avatarS3Key, user.id)}
					alt={user.displayName}
					className="w-12 h-12 rounded-full ring-2 ring-white/20 object-cover"
				/>
				<div className="text-left hidden sm:block">
					<p className="text-sm font-bold text-slate-900 dark:text-white">{user.displayName}</p>
					<p className="text-xs text-blue-600 dark:text-blue-300">Level {user.level}</p>
				</div>
			</button>

			{/* Dropdown Menu */}
			{isOpen && (
				<div className="absolute right-0 mt-3 w-72 glass-menu rounded-[1.75rem] z-50 overflow-hidden">
					{/* User Info Section */}
					<div className="px-4 py-4 border-b border-white/10">
						<div className="flex items-center space-x-3">
							<img
								src={getAvatarUrl(user.avatarS3Key, user.id)}
								alt={user.displayName}
								className="w-12 h-12 rounded-full ring-2 ring-white/20 object-cover"
							/>
							<div>
								<p className="font-bold text-slate-900 dark:text-white">{user.displayName}</p>
								<p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
								<div className="flex items-center space-x-1 mt-1 text-xs">
									<span className="text-amber-600 dark:text-amber-400 font-bold">{user.totalXp} XP</span>
									<span className="text-slate-400">•</span>
									<span className="text-blue-600 dark:text-blue-300 font-bold">Level {user.level}</span>
								</div>
							</div>
						</div>
					</div>

					{/* Menu Items */}
					<div className="py-2">
						<button
							onClick={() => {
								navigate(`/student/profile/${user.id}`);
								setIsOpen(false);
							}}
							className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-blue-500/10 transition-colors text-slate-700 dark:text-slate-300"
						>
							<UserIcon size={18} />
							<span className="font-medium">Profile</span>
						</button>

					<button
						onClick={() => {
							navigate('/student/certificates');
							setIsOpen(false);
						}}
						className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-blue-500/10 transition-colors text-slate-700 dark:text-slate-300"
					>
						<Award size={18} />
						<span className="font-medium">
							Trophy Room
						</span>
					</button>

						<button
							onClick={() => {
								navigate('/student/settings');
								setIsOpen(false);
							}}
							className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-blue-500/10 transition-colors text-slate-700 dark:text-slate-300"
						>
							<Settings size={18} />
							<span className="font-medium">Settings</span>
						</button>

					{canAccessAdmin(user) && (
						<button
							onClick={() => {
								navigate(isOnAdminRoute ? '/student/dashboard' : '/admin/courses');
								setIsOpen(false);
							}}
							className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-blue-500/10 transition-colors text-slate-700 dark:text-slate-300"
						>
							<Shield size={18} />
							<span className="font-medium">{isOnAdminRoute ? 'Return as User' : 'Admin Dashboard'}</span>
						</button>
					)}
					</div>

					{/* Logout Button */}
			<div className="px-4 py-3 border-t border-white/10">
				<button
					onClick={handleLogout}
					className="w-full flex items-center justify-center space-x-2 rounded-2xl bg-red-600 px-4 py-2 font-bold text-white transition-colors hover:bg-red-700"
				>
							<LogOut size={18} />
							<span>Logout</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
