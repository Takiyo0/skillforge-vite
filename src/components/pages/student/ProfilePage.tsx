import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, BookOpen, Award } from 'lucide-react';
import { apiClient } from '@skillforge/vite/lib/api';
import type { User, UserProfile } from '@skillforge/vite/lib/types';
import { getAvatarUrl, getSeededColor, getBadgeIcon } from '@skillforge/vite/lib/s3';
import { Tooltip } from '@skillforge/vite/components/ui/Tooltip';

function getActivityHeatmapData(recentEvents: any[]) {
	const eventsByDate: Record<string, number> = {};
	
	recentEvents.forEach(event => {
		const date = new Date(event.createdAt).toISOString().split('T')[0];
		eventsByDate[date] = (eventsByDate[date] || 0) + 1;
	});
	
	const today = new Date();
	const heatmapDays = Array.from({ length: 26 * 7 }).map((_, i) => {
		const date = new Date(today);
		date.setDate(date.getDate() - i);
		return date.toISOString().split('T')[0];
	}).reverse();
	
	return heatmapDays.map(date => {
		const count = eventsByDate[date] || 0;
		const intensity = Math.min(5, count === 0 ? 0 : Math.ceil(count / 2));
		return { date, intensity };
	});
}

export function ProfilePage() {
	const { userId } = useParams<{ userId: string }>();
	const navigate = useNavigate();
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [user, setUser] = useState<User | null>(null);
	const [isOwnProfile, setIsOwnProfile] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				
				// Try to get current user (may fail if not authenticated)
				let currentUser: User | null = null;
				try {
					currentUser = await apiClient.getProfile();
				} catch {
					// Not authenticated - that's okay for public profiles
					currentUser = null;
				}
				
				// If no userId provided and no current user, redirect to login
				if (!userId && !currentUser) {
					setError('Please log in to view your profile');
					setLoading(false);
					return;
				}

				const targetUserId = userId || currentUser?.id;
				if (!targetUserId) {
					setError('User not found');
					setLoading(false);
					return;
				}

				const isOwnProfile = currentUser ? targetUserId === currentUser.id : false;
				setIsOwnProfile(isOwnProfile);

				const userProfile = await apiClient.getUserProfile(targetUserId);
				setProfile(userProfile);

				if (isOwnProfile && currentUser) {
					setUser(currentUser);
				}
			} catch (err) {
				const apiError = err as any;
				setError(apiError.message || 'Failed to load profile');
				console.error('Profile load error:', err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [userId]);

	if (loading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-500/30 animate-pulse mb-4"></div>
					<p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md">
					<p className="text-red-600 dark:text-red-400 font-bold mb-2">Error</p>
					<p className="text-red-500 dark:text-red-300 text-sm mb-4">{error}</p>
					<button
						onClick={() => navigate(-1)}
						className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold text-sm"
					>
						Go Back
					</button>
				</div>
			</div>
		);
	}

	if (!profile) {
		return null;
	}

	const heatmapData = getActivityHeatmapData(profile.recentActivity);
	const currentlyLearningCourses = profile.enrolledCourses.filter(
		c => Number(c.progress.progressPercent) < 100
	);
	const completedCourses = profile.enrolledCourses.filter(
		c => Number(c.progress.progressPercent) === 100
	);

	return (
		<div className="flex-1 flex flex-col overflow-auto">
			<div className="max-w-6xl mx-auto px-8 pb-8 w-full">
				{/* Banner and Profile Header */}
				<div className="relative mb-8">
					{/* Banner */}
					<div
						className="h-40 rounded-t-2xl shadow-lg"
						style={{ backgroundColor: getSeededColor(profile.id) }}
					></div>

					{/* Profile Card */}
					<div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-b-2xl shadow-xl shadow-blue-950/5 p-8 border border-white/20 dark:border-blue-400/20 border-t-4 border-blue-500/60">
						<div className="flex flex-col lg:flex-row gap-8">
							{/* Avatar and Basic Info */}
							<div className="flex flex-col items-center md:items-start md:flex-row md:gap-6">
								{/* Avatar */}
								<div className="flex-shrink-0">
									<img
										src={getAvatarUrl(profile.avatarS3Key, profile.id)}
										alt={profile.displayName}
										className="w-40 h-40 rounded-2xl shadow-lg ring-4 ring-blue-100 dark:ring-blue-900"
									/>
								</div>

								{/* User Info */}
								<div className="flex-1 text-center md:text-left">
									<h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-1">
										{profile.displayName}
									</h1>
									{isOwnProfile && user?.email && (
										<p className="text-sm md:text-base text-slate-600 dark:text-slate-400 mb-4">
											{user.email}
										</p>
									)}
									{profile.bio && (
										<p className="text-slate-700 dark:text-slate-300 max-w-sm">
											{profile.bio}
										</p>
									)}
									{!profile.bio && (
										<p className="text-slate-500 dark:text-slate-500 italic text-sm">
											No bio yet
										</p>
									)}
								</div>
							</div>

							{/* Stats Grid */}
							<div className="flex-1 grid grid-cols-3 gap-4 h-min">
								{/* Level */}
								<div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
									<div className="flex flex-col items-center">
										<p className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400">
											{profile.level}
										</p>
										<p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mt-1">
											Level
										</p>
									</div>
								</div>

								{/* Total XP */}
								<div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700">
									<div className="flex flex-col items-center">
										<p className="text-2xl md:text-3xl font-black text-amber-600 dark:text-amber-400">
											{profile.totalXp.toLocaleString()}
										</p>
										<p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mt-1">
											Total XP
										</p>
									</div>
								</div>

								{/* Streak */}
								<div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
									<div className="flex flex-col items-center">
										<p className="text-2xl md:text-3xl font-black text-orange-600 dark:text-orange-400">
											{profile.currentStreak}
										</p>
										<p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mt-1">
											Streak
										</p>
										<p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
											🔥 Days
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Activity Heatmap */}
				{profile.recentActivity.length > 0 && (
					<div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-blue-400/20 rounded-2xl p-6 mb-8 shadow-xl shadow-blue-950/5">
						<h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Activity</h2>
						<div className="flex flex-wrap gap-1">
							{heatmapData.map((day, idx) => (
								<Tooltip key={idx} content={`${day.date}: ${day.intensity} events`}>
									<div
										className={`w-3 h-3 rounded-sm transition-all ${
											day.intensity === 0
												? 'bg-blue-500/15'
												: day.intensity === 1
												? 'bg-blue-200 dark:bg-blue-800'
												: day.intensity === 2
												? 'bg-blue-400 dark:bg-blue-600'
												: day.intensity === 3
												? 'bg-blue-600 dark:bg-blue-500'
												: day.intensity === 4
												? 'bg-blue-700 dark:bg-blue-400'
												: 'bg-blue-900 dark:bg-blue-300'
										}`}
									/>
								</Tooltip>
							))}
						</div>
						<p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
							GitHub-style activity heatmap (last 6 months)
						</p>
					</div>
				)}

				{/* Badges */}
				{profile.badges.length > 0 && (
					<div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-blue-400/20 rounded-2xl p-6 mb-8 shadow-xl shadow-blue-950/5">
						<div className="flex items-center space-x-2 mb-6">
							<Trophy size={24} className="text-amber-500" />
							<h2 className="text-xl font-black text-slate-900 dark:text-white">
								Badges ({profile.badges.length})
							</h2>
						</div>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							{profile.badges.map((badge) => (
								<div
									key={badge.badgeId}
									className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 text-center hover:shadow-lg transition-shadow"
								>
									<div className="text-4xl mb-3 flex justify-center">
										{getBadgeIcon(badge.iconS3Key, badge.badgeId)}
									</div>
									<p className="font-bold text-slate-900 dark:text-white text-sm mb-1">
										{badge.name}
									</p>
									<p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
										{badge.description}
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-500">
										{new Date(badge.awardedAt).toLocaleDateString()}
									</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Currently Learning Courses */}
				{currentlyLearningCourses.length > 0 && (
					<div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-blue-400/20 rounded-2xl p-6 mb-8 shadow-xl shadow-blue-950/5">
						<div className="flex items-center space-x-2 mb-6">
							<BookOpen size={24} className="text-blue-500" />
							<h2 className="text-xl font-black text-slate-900 dark:text-white">
								Currently Learning ({currentlyLearningCourses.length})
							</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{currentlyLearningCourses.map((course) => (
								<div
									key={course.courseId}
									className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-blue-400/20 rounded-xl p-4 hover:shadow-lg hover:shadow-blue-500/10 transition-shadow cursor-pointer"
									onClick={() => navigate(`/student/courses/${course.courseId}`)}
								>
									<h3 className="font-bold text-slate-900 dark:text-white mb-2">
										{course.courseTitle}
									</h3>
									<p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
										{course.courseLevel}
									</p>
									<div className="mb-3">
										<div className="flex justify-between text-xs font-bold mb-1">
											<span className="text-slate-600 dark:text-slate-400">Progress</span>
											<span className="text-blue-600 dark:text-blue-400">
												{course.progress.progressPercent}%
											</span>
										</div>
										<div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
											<div
												className="bg-blue-600 h-2 rounded-full"
												style={{ width: `${course.progress.progressPercent}%` }}
											></div>
										</div>
									</div>
									<p className="text-xs text-slate-500 dark:text-slate-500">
										{course.progress.completedUnits} / {course.progress.totalUnits} units
									</p>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Completed Courses */}
				{completedCourses.length > 0 && (
					<div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-blue-400/20 rounded-2xl p-6 mb-8 shadow-xl shadow-blue-950/5">
						<div className="flex items-center space-x-2 mb-6">
							<Award size={24} className="text-green-500" />
							<h2 className="text-xl font-black text-slate-900 dark:text-white">
								Completed ({completedCourses.length})
							</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{completedCourses.map((course) => (
								<div
									key={course.courseId}
									className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer border border-green-200 dark:border-green-700"
									onClick={() => navigate(`/student/courses/${course.courseId}`)}
								>
									<h3 className="font-bold text-slate-900 dark:text-white mb-2">
										{course.courseTitle}
									</h3>
									<p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
										{course.courseLevel}
									</p>
									<div className="flex items-center space-x-2">
										<span className="inline-block bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
											✓ Completed
										</span>
										<p className="text-xs text-slate-500 dark:text-slate-500">
											{course.progress.totalUnits} units
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Certificates */}
				{profile.certificates.length > 0 && (
					<div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-blue-400/20 rounded-2xl p-6 mb-8 shadow-xl shadow-blue-950/5">
						<div className="flex items-center space-x-2 mb-6">
							<Trophy size={24} className="text-yellow-500" />
							<h2 className="text-xl font-black text-slate-900 dark:text-white">
								Certificates ({profile.certificates.length})
							</h2>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{profile.certificates.map((cert) => (
								<div
									key={cert.certificateId}
									className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-xl p-4 hover:shadow-lg transition-shadow cursor-pointer border border-yellow-200 dark:border-yellow-700"
									onClick={() => navigate(`/student/certificates/${cert.certificateId}`)}
								>
									<p className="font-bold text-slate-900 dark:text-white mb-2">
										{cert.courseName}
									</p>
									<p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
										{cert.certificateCode}
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-500">
										{new Date(cert.issuedAt).toLocaleDateString()}
									</p>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
