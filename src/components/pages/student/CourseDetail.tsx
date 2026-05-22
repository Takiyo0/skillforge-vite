import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, BookOpen, Lock, CheckCircle, Play, MessageSquare } from 'lucide-react';
import { apiClient } from '@skillforge/vite/lib/api';
import type { Course, CourseUnitsResponse, CourseProgress } from '@skillforge/vite/lib/types';
import {UserProfileLink} from '@skillforge/vite/components/ui/UserProfileLink';

export function CourseDetail() {
	const { courseId } = useParams<{ courseId: string }>();
	const navigate = useNavigate();
	const [course, setCourse] = useState<Course | null>(null);
	const [units, setUnits] = useState<CourseUnitsResponse | null>(null);
	const [progress, setProgress] = useState<CourseProgress | null>(null);
	const [loading, setLoading] = useState(true);
	const [enrolling, setEnrolling] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isEnrolled, setIsEnrolled] = useState(false);
	const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			if (!courseId) return;

			try {
				setLoading(true);
				// Fetch course details and units in parallel
				const [courseData, unitsData] = await Promise.all([
					apiClient.getCourseDetail(courseId),
					apiClient.getCourseUnits(courseId),
				]);
				setCourse(courseData);
				setUnits(unitsData);

				// Try to fetch progress (will fail if not enrolled)
				try {
					const progressData = await apiClient.getCourseProgress(courseId);
					setProgress(progressData);
					setIsEnrolled(true);
				} catch {
					setIsEnrolled(false);
					setProgress(null);
				}
			} catch (err) {
				const apiError = err as any;
				setError(apiError.message || 'Failed to load course');
				console.error('Course detail error:', err);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [courseId]);

	const handleEnroll = async () => {
		if (!courseId) return;

		try {
			setEnrolling(true);
			await apiClient.enrollCourse(courseId);

			// Refresh progress data
			const progressData = await apiClient.getCourseProgress(courseId);
			setProgress(progressData);
			setIsEnrolled(true);
		} catch (err) {
			const apiError = err as any;
			setError(apiError.message || 'Failed to enroll in course');
		} finally {
			setEnrolling(false);
		}
	};

	if (loading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-3xl shadow-lg animate-pulse mb-4"></div>
					<p className="text-slate-600 dark:text-slate-400">Loading course...</p>
				</div>
			</div>
		);
	}

	if (error || !course) {
		return (
			<div className="flex-1 flex items-center justify-center p-4">
				<div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 sm:p-6 max-w-md w-full">
					<p className="text-red-300 font-medium text-sm sm:text-base">{error || 'Course not found'}</p>
					<button
						onClick={() => navigate('/student/browse-courses')}
						className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 sm:py-2.5 rounded-lg font-bold text-sm transition-colors"
					>
						Back to Courses
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="p-3 sm:p-6 md:p-8 max-w-full md:max-w-5xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
				{/* Header with Course Info */}
				<div className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-700 dark:to-cyan-700 rounded-2xl sm:rounded-3xl md:rounded-[3rem] p-4 sm:p-8 md:p-12 text-white relative overflow-hidden shadow-xl">
					<div className="absolute top-0 right-0 w-64 sm:w-80 md:w-96 h-64 sm:h-80 md:h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

					<div className="relative z-10 flex flex-col flex-wrap md:flex-row justify-between items-start gap-4 sm:gap-6 md:gap-8">
						<div className="flex-1 w-full">
							<div className="inline-block px-3 py-1 text-xs font-black uppercase tracking-widest rounded-lg bg-white/20 mb-3 sm:mb-4 backdrop-blur-sm">
								{course.level}
							</div>
							<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-2 tracking-tight">{course.title}</h1>
							<p className="text-blue-100 text-sm sm:text-base md:text-lg font-medium mb-3 sm:mb-4">{course.subtitle}</p>
							<p className="text-blue-100 text-xs sm:text-sm md:text-base font-medium mb-4 sm:mb-6 line-clamp-3 sm:line-clamp-none">{course.description}</p>
							<button
								onClick={() => navigate(`/student/courses/${courseId}/forums`)}
								className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 border border-white/30 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-colors hover:shadow-md min-h-[44px] sm:min-h-auto"
							>
								<MessageSquare size={16} />
								Forums
							</button>

							<div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6 mt-4 sm:mt-6">
								<div>
									<p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Instructor</p>
									<p className="text-lg sm:text-xl font-black">
										<UserProfileLink userId={course.creator?.id} className="hover:underline">
											{course.creator.displayName}
										</UserProfileLink>
									</p>
								</div>
								<div>
									<p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Language</p>
									<p className="text-lg sm:text-xl font-black">{course.language}</p>
								</div>
							</div>
						</div>

						{/* Enrollment Status & Button - Sidebar on Desktop, Stack on Mobile */}
						<div className="bg-slate-900/40 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 w-full md:w-64 shrink-0">
							{isEnrolled && progress ? (
								<>
									<p className="text-blue-200 text-xs sm:text-sm font-bold uppercase tracking-wider mb-2">Enrollment Status</p>
									<p className="text-xl sm:text-2xl font-black mb-4 text-green-300">✓ Enrolled</p>
									<>
										<p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">Progress</p>
										<div className="w-full bg-slate-950/50 rounded-full h-2 sm:h-3 p-0.5 border border-white/10 mb-3">
											<div
												className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full transition-all duration-300"
												style={{ width: `${progress.progressPercent}%` }}
											/>
										</div>
										<p className="text-xs sm:text-sm font-bold text-blue-100">{progress.progressPercent}% Complete</p>
										<p className="text-xs text-blue-200 mt-1">
											{progress.completedUnits} of {progress.totalUnits} units
										</p>
									</>
									{Number(progress.progressPercent) < 100 && (
										<button
											onClick={() => {
												// Find the first in_progress or available unit
												const nextUnit = progress.unitProgress.find(
													u => u.status === 'in_progress' || (u.status === 'available' && progress.unitProgress.findIndex(up => up.status === 'in_progress') === -1)
												);
												
												if (nextUnit) {
													navigate(`/student/courses/${courseId}/units/${nextUnit.unitId}`);
												} else {
													// Fallback to learning path if no unit found
													navigate('/student/learning-path');
												}
											}}
											className="w-full mt-4 sm:mt-6 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-black text-xs sm:text-sm transition-colors flex items-center justify-center space-x-2 min-h-[44px]"
										>
											<Play size={16} fill="white" />
											<span>Continue Learning</span>
										</button>
									)}
								</>
							) : (
								<>
									<p className="text-blue-200 text-xs sm:text-sm font-bold uppercase tracking-wider mb-3 sm:mb-4">Start Learning</p>
									<button
										onClick={handleEnroll}
										disabled={enrolling}
										className="w-full bg-white hover:bg-slate-100 disabled:bg-slate-500 text-blue-600 disabled:text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg font-black text-xs sm:text-sm transition-colors min-h-[44px]"
									>
										{enrolling ? 'Enrolling...' : 'Enroll Now'}
									</button>
									<p className="text-xs text-blue-200 mt-3 text-center">
										Free course • Instant access
									</p>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Error Message */}
				{error && (
					<div className="bg-red-900/20 border border-red-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4">
						<p className="text-red-300 text-xs sm:text-sm font-medium">{error}</p>
					</div>
				)}

				{/* Units Section */}
				<div>
					<h2 className="text-xl sm:text-2xl md:text-2xl font-black text-slate-900 dark:text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
						<BookOpen className="text-blue-500 shrink-0" size={24} />
						<span>Course Content ({units?.units.length || 0} units)</span>
					</h2>

					<div className="space-y-2 sm:space-y-3">
						{units?.units.map((unit, index) => {
							// Find matching progress data for this unit
							const progressUnit = progress?.unitProgress.find(u => u.unitId === unit.id);
							const status = progressUnit?.status || (isEnrolled ? 'available' : 'locked');
							const isLocked = status === 'locked';
							const isExpanded = expandedUnit === unit.id;
							const completionPercent = progressUnit?.lastScorePercent ? Math.round(progressUnit.lastScorePercent) : 0;

							return (
								<div
									key={unit.id}
									className={`border border-white/20 dark:border-white/10 rounded-lg sm:rounded-xl overflow-hidden transition-all bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-xl shadow-blue-950/5 ${
										isExpanded
											? 'border-blue-400 dark:border-blue-500 bg-blue-50/70 dark:bg-slate-900/70'
											: 'border-white/20 dark:border-white/10 bg-white/70 dark:bg-slate-900/70'
									}`}
								>
									{/* Unit Header */}
									<button
										onClick={() => !isLocked && setExpandedUnit(isExpanded ? null : unit.id)}
										disabled={isLocked}
										className={`w-full p-3 sm:p-4 md:p-6 flex items-center justify-between gap-2 sm:gap-3 transition-colors min-h-[44px] ${
											isLocked
												? 'cursor-not-allowed opacity-60'
												: 'hover:bg-slate-50 dark:hover:bg-slate-800'
										}`}
									>
										<div className="flex items-center space-x-2 sm:space-x-3 text-left flex-1 min-w-0">
											<div className="flex items-center justify-center w-8 sm:w-10 h-8 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black shrink-0">
												{status === 'completed' ? (
													<CheckCircle size={20} />
												) : (
													index + 1
												)}
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-center space-x-2 mb-1">
													<h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">
														{unit.title}
													</h3>
													{isLocked && (
														<Lock size={16} className="text-slate-400 shrink-0" />
													)}
												</div>
												<p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
													{unit.type.replace(/_/g, ' ')} • {unit.estimatedMinutes} min
												</p>
											</div>
										</div>

										{/* Status Badge & Chevron */}
										<div className="flex items-center space-x-2 sm:space-x-3 ml-2 shrink-0">
											{!isLocked && isEnrolled && (
												<div className="text-right hidden sm:block">
													<p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Progress</p>
													<p className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400">{completionPercent}%</p>
												</div>
											)}
											{!isLocked && (
												<ChevronDown
													size={20}
													className={`text-slate-400 transition-transform shrink-0 ${
														isExpanded ? 'transform rotate-180' : ''
													}`}
												/>
											)}
										</div>
									</button>

									{/* Unit Details - Expanded */}
									{isExpanded && !isLocked && (
										<div className="border-t border-blue-200/50 dark:border-blue-400/20 p-3 sm:p-4 md:p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl space-y-3 sm:space-y-4">
											<p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm md:text-base">
												{unit.summary}
											</p>

											{isEnrolled && progressUnit && (
												<>
													<div className="flex items-center justify-between p-3 sm:p-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-lg border border-white/20 dark:border-white/10">
														<div className="flex-1 min-w-0">
															<p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
																Your Progress
															</p>
															<div className="w-full bg-blue-500/15 rounded-full h-1.5 sm:h-2">
																<div
																	className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full transition-all duration-300"
																	style={{ width: `${completionPercent}%` }}
																/>
															</div>
														</div>
														<span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 ml-3 whitespace-nowrap">
															{completionPercent}%
														</span>
													</div>

													<button 
														onClick={() => navigate(`/student/courses/${courseId}/units/${unit.id}`)}
														className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-colors flex items-center justify-center space-x-2 min-h-[44px]">
														<Play size={16} fill="white" />
														<span>{completionPercent === 100 ? 'Review' : (progressUnit?.status === 'available' ? 'Start Unit' : 'Continue Unit')}</span>
													</button>
												</>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>

				{/* Back Button */}
				<div className="pt-3 sm:pt-4">
					<button
						onClick={() => navigate('/student/browse-courses')}
						className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-xs sm:text-sm transition-colors inline-flex items-center gap-1 min-h-[44px]"
					>
						← Back to Courses
					</button>
				</div>

			</div>
		</div>
	);
}
