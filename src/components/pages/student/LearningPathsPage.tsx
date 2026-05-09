import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import { apiClient } from '@skillforge/vite/lib/api';
import { getSeededColor } from '@skillforge/vite/lib/s3';
import type { LearningPath } from '@skillforge/vite/lib/types';

export function LearningPathsPage() {
	const navigate = useNavigate();
	const [allPaths, setAllPaths] = useState<LearningPath[]>([]);
	const [userPath, setUserPath] = useState<LearningPath | null>(null);
	const [loading, setLoading] = useState(true);
	const [hasUserPath, setHasUserPath] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				const [pathsData, userPathData] = await Promise.all([
					apiClient.getLearningPaths(),
					apiClient.getUserLearningPath(),
				]);

				setAllPaths(pathsData.data || []);

				// Check if user has a learning path
				if ('id' in userPathData && userPathData.id) {
					setUserPath(userPathData as LearningPath);
					setHasUserPath(true);
				}
			} catch (error) {
				console.error('Failed to fetch learning paths:', error);
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	if (loading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-blue-500/30 animate-spin mb-4">
						S
					</div>
					<p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Loading learning paths...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="max-w-6xl mx-auto p-8 space-y-12">
				{/* Header */}
				<div className="flex items-center space-x-4 mb-8">
					<div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center">
						<MapPin size={24} />
					</div>
					<h1 className="text-3xl font-black text-slate-900 dark:text-white">Learning Paths</h1>
				</div>

				{/* User's Current Path */}
				{hasUserPath && userPath && (
					<div>
						<div className="mb-6 flex items-center space-x-2">
							<Sparkles size={24} className="text-amber-500" />
							<h2 className="text-2xl font-black text-slate-900 dark:text-white">Your Learning Path</h2>
						</div>

						<div
							className="rounded-3xl p-8 border-2 shadow-lg overflow-hidden relative"
							style={{
								background: `linear-gradient(to bottom right, ${getSeededColor(userPath.id)}15, ${getSeededColor(userPath.id)}05)`,
								borderColor: `${getSeededColor(userPath.id)}50`,
							}}
						>
							{/* Decorative blob */}
							<div
								className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none"
								style={{ backgroundColor: getSeededColor(userPath.id) }}
							/>

							<div className="relative z-10">
								<div className="mb-6">
									<h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
										{userPath.title}
									</h3>
									<p className="text-lg text-slate-600 dark:text-slate-300 mb-4">
										{userPath.description}
									</p>

									{/* Criteria tags */}
									<div className="flex flex-wrap gap-2 mb-6">
										{userPath.criteria?.languages?.map((lang) => (
											<span
												key={lang}
												className="px-3 py-1 text-xs font-bold uppercase rounded-full"
												style={{
													backgroundColor: `${getSeededColor(userPath.id)}30`,
													color: getSeededColor(userPath.id),
												}}
											>
												{lang}
											</span>
										))}
										{userPath.criteria?.wantToLearn?.map((topic) => (
											<span
												key={topic}
												className="px-3 py-1 text-xs font-bold uppercase rounded-full"
												style={{
													backgroundColor: `${getSeededColor(userPath.id)}30`,
													color: getSeededColor(userPath.id),
												}}
											>
												{topic}
											</span>
										))}
									</div>
								</div>

								{/* Courses in path */}
								<div>
									<h4 className="text-sm font-black uppercase text-slate-600 dark:text-slate-400 mb-4 tracking-widest">
										{userPath.courses?.length || 0} Courses in Path
									</h4>
									<div className="space-y-3">
										{userPath.courses?.map((course, idx) => (
											<div
												key={course.courseId}
												className="flex items-start space-x-4 p-4 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-blue-400/20 hover:border-blue-300/50 transition-colors shadow-lg shadow-blue-950/5"
											>
												<div
													className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-black text-white"
													style={{ backgroundColor: getSeededColor(course.courseId) }}
												>
													{idx + 1}
												</div>
												<div className="flex-1 min-w-0">
													<p className="font-black text-slate-900 dark:text-white">
														{course.courseName}
													</p>
													<p className="text-sm text-slate-600 dark:text-slate-400 truncate">
														{course.courseDescription}
													</p>
													<div className="flex items-center space-x-2 mt-2">
														<span className="glass-chip text-xs font-bold uppercase px-2 py-1 rounded text-slate-700 dark:text-slate-300">
															{course.courseLevel}
														</span>
														<span className="text-xs text-slate-500 dark:text-slate-500">
															{course.courseLanguage}
														</span>
													</div>
												</div>
												<button
													onClick={() => navigate(`/student/courses/${course.courseId}`)}
													className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase rounded-lg transition-colors whitespace-nowrap"
												>
													Go
												</button>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* All Available Paths */}
				<div>
					<h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center space-x-2">
						<MapPin size={24} className="text-blue-500" />
						<span>All Learning Paths</span>
					</h2>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{allPaths.map((path) => (
							<div
								key={path.id}
								className="rounded-2xl p-6 border-2 hover:shadow-lg transition-all cursor-pointer group bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-blue-400/20 shadow-lg shadow-blue-950/5"
								style={{
									background: `linear-gradient(to bottom right, ${getSeededColor(path.id)}10, ${getSeededColor(path.id)}05)`,
									borderColor: `${getSeededColor(path.id)}40`,
								}}
							>
								<div className="flex items-start justify-between mb-4">
									<div className="flex-1">
										<h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
											{path.title}
										</h3>
										<p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
											{path.description}
										</p>
									</div>
									<ArrowRight
										size={24}
										className="flex-shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors ml-4"
									/>
								</div>

								{/* Criteria tags */}
								<div className="flex flex-wrap gap-2 mb-4">
									{path.criteria?.languages?.slice(0, 2).map((lang) => (
										<span
											key={lang}
											className="px-2 py-1 text-xs font-bold uppercase rounded-full"
											style={{
												backgroundColor: `${getSeededColor(path.id)}30`,
												color: getSeededColor(path.id),
											}}
										>
											{lang}
										</span>
									))}
									{path.criteria?.wantToLearn?.slice(0, 2).map((topic) => (
										<span
											key={topic}
											className="px-2 py-1 text-xs font-bold uppercase rounded-full"
											style={{
												backgroundColor: `${getSeededColor(path.id)}30`,
												color: getSeededColor(path.id),
											}}
										>
											{topic}
										</span>
									))}
									{(path.criteria?.languages?.length || 0) + (path.criteria?.wantToLearn?.length || 0) > 4 && (
										<span className="px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400">
											+{(path.criteria?.languages?.length || 0) + (path.criteria?.wantToLearn?.length || 0) - 4} more
										</span>
									)}
								</div>

								{/* Course preview */}
								<div className="space-y-2 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-xl p-3 border border-white/20 dark:border-blue-400/20 shadow-lg shadow-blue-950/5">
									<div className="flex items-center space-x-2 text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
										<BookOpen size={14} />
										<span>{path.courses?.length || 0} Courses</span>
									</div>
									<div className="space-y-1">
										{path.courses?.slice(0, 3).map((course) => (
											<p key={course.courseId} className="text-sm text-slate-700 dark:text-slate-300 truncate">
												{course.position}. {course.courseName}
											</p>
										))}
										{(path.courses?.length || 0) > 3 && (
											<p className="text-xs text-slate-600 dark:text-slate-400 italic">
												+{(path.courses?.length || 0) - 3} more courses
											</p>
										)}
									</div>
								</div>
							</div>
						))}
					</div>

					{allPaths.length === 0 && (
						<div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-dashed border-blue-200/40 dark:border-blue-400/20 rounded-2xl p-12 text-center shadow-xl shadow-blue-950/5">
							<MapPin size={48} className="mx-auto mb-4 text-slate-400" />
							<p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
								No learning paths available yet
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
