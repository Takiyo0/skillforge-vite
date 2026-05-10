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

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		}
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isOpen]);

	const handleLogout = () => {
		onLogout();
		navigate('/login');
	};

	return (
		<div className="relative" ref={menuRef}>
			{/* Trigger Button - Touch-friendly, responsive */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				aria-label="Open user menu"
				className="flex items-center justify-center gap-2 sm:gap-3 rounded-full glass-panel p-2 sm:p-3 transition-all duration-200 hover:bg-white/20 active:scale-95 min-h-[44px] min-w-[44px]"
			>
				<img
					src={getAvatarUrl(user.avatarS3Key, user.id)}
					alt={user.displayName}
					className="size-8 sm:size-10 md:size-12 rounded-full ring-2 ring-white/20 object-cover flex-shrink-0"
				/>
				<div className="text-left hidden sm:block min-w-0">
					<p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{user.displayName}</p>
					<p className="text-xs text-blue-600 dark:text-blue-300">Level {user.level}</p>
				</div>
			</button>

			{/* Mobile Overlay - Only visible on mobile when menu is open */}
			{isOpen && (
				<div
					className="fixed inset-0 z-40 bg-black/30 sm:hidden"
					onClick={() => setIsOpen(false)}
					aria-hidden="true"
				/>
			)}

			{/* Dropdown Menu - Responsive width and positioning */}
			{isOpen && (
				<div
					className="absolute right-0 sm:right-0 md:right-0 top-[calc(100%+0.75rem)] w-screen sm:w-80 md:w-96 max-w-[calc(100vw-1rem)] sm:max-w-none mx-2 sm:mx-0 glass-menu rounded-2xl z-50 overflow-hidden origin-top-right transition-all duration-200 animate-in fade-in slide-in-from-top-2"
					role="menu"
					aria-label="User menu"
				>
					{/* User Info Section */}
					<div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-white/10">
						<div className="flex items-center gap-3">
							<img
								src={getAvatarUrl(user.avatarS3Key, user.id)}
								alt={user.displayName}
								className="size-10 sm:size-12 md:size-14 rounded-full ring-2 ring-white/20 object-cover flex-shrink-0"
							/>
							<div className="min-w-0 flex-1">
								<p className="font-bold text-slate-900 dark:text-white truncate text-sm sm:text-base">{user.displayName}</p>
								<p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
								<div className="flex items-center gap-1 mt-1 text-xs">
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
							className="w-full flex items-center gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-3 min-h-[44px] hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors text-slate-700 dark:text-slate-300 text-sm sm:text-base"
							role="menuitem"
						>
							<UserIcon className="size-4 sm:size-5 flex-shrink-0" />
							<span className="font-medium">Profile</span>
						</button>

						<button
							onClick={() => {
								navigate('/student/certificates');
								setIsOpen(false);
							}}
							className="w-full flex items-center gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-3 min-h-[44px] hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors text-slate-700 dark:text-slate-300 text-sm sm:text-base"
							role="menuitem"
						>
							<Award className="size-4 sm:size-5 flex-shrink-0" />
							<span className="font-medium">Trophy Room</span>
						</button>

						<button
							onClick={() => {
								navigate('/student/settings');
								setIsOpen(false);
							}}
							className="w-full flex items-center gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-3 min-h-[44px] hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors text-slate-700 dark:text-slate-300 text-sm sm:text-base"
							role="menuitem"
						>
							<Settings className="size-4 sm:size-5 flex-shrink-0" />
							<span className="font-medium">Settings</span>
						</button>

						{canAccessAdmin(user) && (
							<button
								onClick={() => {
									navigate(isOnAdminRoute ? '/student/dashboard' : '/admin/courses');
									setIsOpen(false);
								}}
								className="w-full flex items-center gap-3 px-3 sm:px-4 md:px-6 py-2 sm:py-3 min-h-[44px] hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors text-slate-700 dark:text-slate-300 text-sm sm:text-base"
								role="menuitem"
							>
								<Shield className="size-4 sm:size-5 flex-shrink-0" />
								<span className="font-medium">{isOnAdminRoute ? 'Return as User' : 'Admin Dashboard'}</span>
							</button>
						)}
					</div>

					{/* Logout Button */}
					<div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-white/10">
						<button
							onClick={handleLogout}
							className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-3 sm:px-4 py-2 sm:py-3 font-bold text-white transition-all duration-200 hover:bg-red-700 active:scale-95 min-h-[44px]"
							role="menuitem"
						>
							<LogOut className="size-4 sm:size-5 flex-shrink-0" />
							<span className="text-sm sm:text-base">Logout</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
