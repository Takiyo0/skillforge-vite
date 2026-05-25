import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ArrowRight, BookOpen, CheckCircle, LogOut, MapPin, Sparkles} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import {getCourseThumbUrl, getSeededColor} from '@skillforge/vite/lib/s3';
import type {LearningPath, LearningPathCourse} from '@skillforge/vite/lib/types';
import BannerImage from "@skillforge/vite/assets/img_2.png";

type PathCourse = LearningPathCourse;

function getPathCourseId(course: PathCourse): string {
    return course.courseId || course.id || '';
}

function getPathCourseTitle(course: PathCourse): string {
    return course.courseName || course.title || 'Untitled course';
}

function getPathCourseDescription(course: PathCourse): string {
    return course.courseDescription || course.description || 'No description available yet.';
}

function getPathCourseLevel(course: PathCourse): string {
    return course.courseLevel || course.level || 'beginner';
}

function getPathCourseLanguage(course: PathCourse): string {
    return course.courseLanguage || course.language || 'unknown';
}

function getPathCourseThumb(course: PathCourse): string | null {
    return course.courseThumbnail || course.thumbnailS3Key || null;
}

function getPathCourseProgress(course: PathCourse): number {
    if (typeof course.progressPercent === 'number') {
        return Math.max(0, Math.min(100, Math.round(course.progressPercent)));
    }

    return course.completed ? 100 : 0;
}

function isPathCourseCompleted(course: PathCourse): boolean {
    return Boolean(course.completed) || getPathCourseProgress(course) >= 100;
}

export function LearningPathsPage() {
    const navigate = useNavigate();
    const [allPaths, setAllPaths] = useState<LearningPath[]>([]);
    const [userPath, setUserPath] = useState<LearningPath | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasUserPath, setHasUserPath] = useState(false);
    const [actionPathId, setActionPathId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                const userPathData = await apiClient.getUserLearningPath();
                if (userPathData && typeof userPathData === 'object' && 'id' in userPathData && userPathData.id) {
                    setUserPath(userPathData as LearningPath);
                    setHasUserPath(true);
                } else {
                    setUserPath(null);
                    setHasUserPath(false);
                }

                const pathsData = await apiClient.getLearningPaths();
                setAllPaths(pathsData.data || []);
            } catch (error) {
                console.error('Failed to fetch learning paths:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const visiblePaths = useMemo(
        () => allPaths.filter((path) => path.id !== userPath?.id),
        [allPaths, userPath?.id]
    );

    const currentPathStats = useMemo(() => {
        if (!userPath?.courses?.length) {
            return {
                completedCount: 0,
                totalCount: 0,
                progressPercent: 0,
            };
        }

        const completedCount = userPath.courses.filter(isPathCourseCompleted).length;
        const totalCount = userPath.courses.length;
        const progressPercent = Math.round(
            userPath.courses.reduce((sum, course) => sum + getPathCourseProgress(course), 0) / totalCount
        );

        return {
            completedCount,
            totalCount,
            progressPercent,
        };
    }, [userPath]);

    const handleJoinPath = async (path: LearningPath) => {
        try {
            setActionPathId(path.id);
            await apiClient.joinLearningPath(path.id);

            const refreshedUserPath = await apiClient.getUserLearningPath();
            if (refreshedUserPath && typeof refreshedUserPath === 'object' && 'id' in refreshedUserPath && refreshedUserPath.id) {
                setUserPath(refreshedUserPath as LearningPath);
                setHasUserPath(true);
            }
        } catch (error) {
            console.error('Failed to join learning path:', error);
        } finally {
            setActionPathId(null);
        }
    };

    const handleLeavePath = async () => {
        if (!userPath) {
            return;
        }

        try {
            setActionPathId(userPath.id);
            await apiClient.leaveLearningPath(userPath.id);
            setUserPath(null);
            setHasUserPath(false);
        } catch (error) {
            console.error('Failed to leave learning path:', error);
        } finally {
            setActionPathId(null);
        }
    };

    const renderCourseBanner = (course: PathCourse, fallbackSeed: string) => {
        const thumbUrl = getPathCourseThumb(course);
        const bannerSeed = getSeededColor(fallbackSeed);
        const bannerAccent = getSeededColor(getPathCourseId(course) || getPathCourseTitle(course));

        if (thumbUrl) {
            return (
                <img
                    src={getCourseThumbUrl(thumbUrl)}
                    alt={getPathCourseTitle(course)}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            );
        }

        return (
            <div
                className="relative h-full w-full overflow-hidden"
                style={{
                    background: `radial-gradient(circle at top right, ${bannerAccent}88, transparent 38%), linear-gradient(135deg, ${bannerSeed}, ${bannerAccent})`,
                }}
            >
                <div
                    className="absolute inset-0 opacity-30"
                    style={{
                        backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)',
                        backgroundSize: '18px 18px',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10"/>
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10"/>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div
                        className="inline-block w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-blue-500/30 animate-spin mb-4">
                        S
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Loading learning paths...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
                <div
                    className="relative overflow-hidden flex flex-col gap-4 rounded-2xl border border-blue-200/40 dark:border-blue-400/20 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-5 sm:p-6 shadow-xl shadow-blue-950/5">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                            <MapPin size={24}/>
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                Learning Paths
                            </h1>
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                                Learning paths to help you stay on track.
                            </p>
                        </div>
                        <img src={BannerImage} alt={"mascott"} className={"absolute -right-6 -top-12 w-96 -z-1 hidden xl:block"}/>
                    </div>

                    {hasUserPath && userPath ? (
                        <div className="flex flex-wrap items-center gap-3">
							<span
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
								<Sparkles size={14}/>
								Current path active
							</span>
                            <span
                                className="inline-flex items-center rounded-full bg-slate-900/5 dark:bg-white/10 px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">
								{currentPathStats.completedCount}/{currentPathStats.totalCount} courses completed
							</span>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center gap-3">
							<span
                                className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
								No learning path assigned yet
							</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
								Join one of the paths below to unlock the structured route.
							</span>
                        </div>
                    )}
                </div>

                {hasUserPath && userPath && (
                    <section className="space-y-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-amber-500 mb-2">
                                    <Sparkles size={18}/>
                                    <span
                                        className="text-xs font-black uppercase tracking-[0.3em]">Your current path</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                    {userPath.title}
                                </h2>
                                <p className="mt-2 max-w-3xl text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-7">
                                    {userPath.description}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleLeavePath}
                                disabled={actionPathId === userPath.id}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                            >
                                <LogOut size={16}/>
                                {actionPathId === userPath.id ? 'Leaving...' : 'Leave path'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
                            <div
                                className="rounded-2xl border border-white/20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 sm:p-7 text-white shadow-2xl shadow-slate-950/20 overflow-hidden relative">
                                <div
                                    className="absolute inset-0 opacity-35 pointer-events-none"
                                    style={{
                                        background: `radial-gradient(circle at top right, ${getSeededColor(userPath.id)}88, transparent 42%), radial-gradient(circle at bottom left, rgba(255,255,255,0.08), transparent 35%)`,
                                    }}
                                />

                                <div className="relative z-10 flex flex-col gap-6">
                                    <div className="flex flex-wrap gap-2">
                                        {userPath.criteria?.languages?.map((lang) => (
                                            <span
                                                key={lang}
                                                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-white/80"
                                            >
												{lang}
											</span>
                                        ))}
                                        {userPath.criteria?.wantToLearn?.map((topic) => (
                                            <span
                                                key={topic}
                                                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-white/80"
                                            >
												{topic}
											</span>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div
                                            className="rounded-2xl bg-white/10 p-4 backdrop-blur-xl border border-white/10">
                                            <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Courses</p>
                                            <p className="text-2xl font-black">{currentPathStats.totalCount}</p>
                                        </div>
                                        <div
                                            className="rounded-2xl bg-white/10 p-4 backdrop-blur-xl border border-white/10">
                                            <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Completed</p>
                                            <p className="text-2xl font-black">{currentPathStats.completedCount}</p>
                                        </div>
                                        <div
                                            className="rounded-2xl bg-white/10 p-4 backdrop-blur-xl border border-white/10">
                                            <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-1">Progress</p>
                                            <p className="text-2xl font-black">{currentPathStats.progressPercent}%</p>
                                        </div>
                                    </div>

                                    <div>
                                        <div
                                            className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
                                            <span>Overall completion</span>
                                            <span>{currentPathStats.progressPercent}%</span>
                                        </div>
                                        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-500"
                                                style={{width: `${currentPathStats.progressPercent}%`}}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="rounded-2xl border border-blue-200/30 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 sm:p-7 shadow-xl shadow-blue-950/5">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">
                                    Path details
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl bg-slate-950/5 dark:bg-white/5 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                            Status
                                        </p>
                                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-300">
                                            Active
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-950/5 dark:bg-white/5 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                            Type
                                        </p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">
                                            Structured path
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-950/5 dark:bg-white/5 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                            Criteria
                                        </p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white">
                                            {(userPath.criteria?.languages?.length || 0) + (userPath.criteria?.wantToLearn?.length || 0)} tags
                                        </p>
                                    </div>
                                    <div className="rounded-2xl bg-slate-950/5 dark:bg-white/5 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                                            Path ID
                                        </p>
                                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                                            {userPath.id.slice(0, 8)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                            {userPath.courses?.map((course, idx) => {
                                const courseId = getPathCourseId(course) || `${userPath.id}-${idx}`;
                                const progress = getPathCourseProgress(course);
                                const completed = isPathCourseCompleted(course);

                                return (
                                    <article
                                        key={courseId}
                                        className="group overflow-hidden rounded-2xl border border-white/20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg shadow-blue-950/5 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-950/10"
                                    >
                                        <div className="relative h-44 sm:h-52 overflow-hidden">
                                            {renderCourseBanner(course, userPath.id)}
                                            <div
                                                className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent"/>
                                            <div
                                                className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-xs font-black uppercase tracking-wider text-white backdrop-blur-xl">
                                                #{course.position}
                                            </div>
                                            <div className="absolute right-4 top-4">
                                                {completed ? (
                                                    <span
                                                        className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg">
														<CheckCircle size={14}/>
														Done
													</span>
                                                ) : (
                                                    <span
                                                        className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-white backdrop-blur-xl">
														{progress}%
													</span>
                                                )}
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                                                <h3 className="text-xl sm:text-2xl font-black text-white">
                                                    {getPathCourseTitle(course)}
                                                </h3>
                                                <p className="mt-2 text-sm text-white/75 line-clamp-2">
                                                    {getPathCourseDescription(course)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="p-4 sm:p-5">
                                            <div className="flex flex-wrap gap-2">
												<span
                                                    className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300">
													{getPathCourseLevel(course)}
												</span>
                                                <span
                                                    className="rounded-full bg-slate-950/5 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-600 dark:bg-white/5 dark:text-slate-300">
													{getPathCourseLanguage(course)}
												</span>
                                                {completed && (
                                                    <span
                                                        className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
														Completed
													</span>
                                                )}
                                            </div>

                                            <div className="mt-4">
                                                <div
                                                    className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                                    <span>Progress</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div
                                                    className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${completed ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}
                                                        style={{width: `${progress}%`}}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => navigate(`/student/courses/${courseId}`)}
                                                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                                            >
                                                {completed ? 'Review course' : 'Continue'}
                                                <ArrowRight size={16}/>
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                )}

                <section className="space-y-5">
                    <div className="flex items-center gap-3">
                        <MapPin size={22} className="text-blue-500"/>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">All Learning Paths</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {hasUserPath
                                    ? 'These remain available for browsing. Leave your current path first if you want to join another one.'
                                    : 'Pick a path that matches your goals and start immediately.'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {visiblePaths.map((path) => {
                            const pathColor = getSeededColor(path.id);

                            return (
                                <div
                                    key={path.id}
                                    className="rounded-2xl border border-white/20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 sm:p-6 shadow-lg shadow-blue-950/5 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-950/10"
                                    style={{
                                        background: `linear-gradient(to bottom right, ${pathColor}14, ${pathColor}06)`,
                                        borderColor: `${pathColor}40`,
                                    }}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                                {path.title}
                                            </h3>
                                            <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-7 line-clamp-2">
                                                {path.description}
                                            </p>
                                        </div>

                                        {!hasUserPath && (
                                            <button
                                                type="button"
                                                onClick={() => handleJoinPath(path)}
                                                disabled={actionPathId === path.id}
                                                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                                            >
                                                {actionPathId === path.id ? 'Joining...' : 'Join'}
                                                <ArrowRight size={16}/>
                                            </button>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {path.criteria?.languages?.slice(0, 2).map((lang) => (
                                            <span
                                                key={lang}
                                                className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: `${pathColor}25`,
                                                    color: pathColor,
                                                }}
                                            >
												{lang}
											</span>
                                        ))}
                                        {path.criteria?.wantToLearn?.slice(0, 2).map((topic) => (
                                            <span
                                                key={topic}
                                                className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: `${pathColor}25`,
                                                    color: pathColor,
                                                }}
                                            >
												{topic}
											</span>
                                        ))}
                                        {(path.criteria?.languages?.length || 0) + (path.criteria?.wantToLearn?.length || 0) > 4 && (
                                            <span
                                                className="rounded-full bg-slate-950/5 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
												+{(path.criteria?.languages?.length || 0) + (path.criteria?.wantToLearn?.length || 0) - 4} more
											</span>
                                        )}
                                    </div>

                                    <div
                                        className="mt-5 rounded-2xl border border-white/20 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl p-4 shadow-lg shadow-blue-950/5">
                                        <div
                                            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                            <BookOpen size={14}/>
                                            <span>{path.courses?.length || 0} Courses</span>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {path.courses?.slice(0, 3).map((course) => (
                                                <div key={getPathCourseId(course) || course.position}
                                                     className="flex items-center gap-3">
                                                    <div
                                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black text-white"
                                                        style={{backgroundColor: getSeededColor(getPathCourseId(course) || course.courseName)}}
                                                    >
                                                        {course.position}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                                            {getPathCourseTitle(course)}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                            {getPathCourseLevel(course)} {getPathCourseLanguage(course) ? `• ${getPathCourseLanguage(course)}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(path.courses?.length || 0) > 3 && (
                                                <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                                                    +{(path.courses?.length || 0) - 3} more courses
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {visiblePaths.length === 0 && (
                        <div
                            className="rounded-2xl border border-dashed border-blue-200/40 dark:border-blue-400/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-12 text-center shadow-xl shadow-blue-950/5">
                            <MapPin size={48} className="mx-auto mb-4 text-slate-400"/>
                            <p className="text-lg font-medium text-slate-600 dark:text-slate-400">
                                No learning paths available yet
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
