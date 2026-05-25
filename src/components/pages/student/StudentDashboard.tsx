import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Play, Star, Target} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import {getCourseThumbUrl} from '@skillforge/vite/lib/s3';
import type {Course, Streak, User, XpSummary} from '@skillforge/vite/lib/types';
import {StateCard} from '@skillforge/vite/components/ui/controls';
import {useUserSession} from '@skillforge/vite/contexts/UserSessionContext';
import {UserProfileLink} from '@skillforge/vite/components/ui/UserProfileLink';
import BannerImage from "@skillforge/vite/assets/img_4.png";

export function StudentDashboard() {
    const navigate = useNavigate();
    const {getProfile, getStreak, getEnrolledCourses} = useUserSession();
    const [user, setUser] = useState<User | null>(null);
    const [xpSummary, setXpSummary] = useState<XpSummary | null>(null);
    const [streak, setStreak] = useState<Streak | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Use Promise.allSettled to handle partial failures
                const results = await Promise.allSettled([
                    getProfile(),
                    apiClient.getXpSummary(),
                    getStreak(),
                    getEnrolledCourses(),
                ]);

                // Handle each result individually with fallbacks
                if (results[0].status === 'fulfilled') {
                    setUser(results[0].value);
                }
                if (results[1].status === 'fulfilled') {
                    setXpSummary(results[1].value);
                }
                if (results[2].status === 'fulfilled') {
                    setStreak(results[2].value);
                }
                if (results[3].status === 'fulfilled') {
                    setCourses(results[3].value || []);
                }

                // Set error only if all requests failed
                const allFailed = results.every(r => r.status === 'rejected');
                if (allFailed) {
                    setError('Failed to load dashboard');
                }
            } catch (err) {
                const apiError = err as any;
                setError(apiError.message || 'Failed to load dashboard');
                console.error('Dashboard load error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [getEnrolledCourses, getProfile, getStreak]);

    const handleImageError = (courseId: string) => {
        setBrokenImages((prev) => new Set([...prev, courseId]));
    };

    const handleEnterCourse = (courseId: string) => {
        navigate(`/student/courses/${courseId}`);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <StateCard title="Loading dashboard..." description="Gathering your progress and enrolled courses."/>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <StateCard title="Unable to load dashboard" description={error}
                           className="border-red-500/20 bg-red-500/10 max-w-md"/>
            </div>
        );
    }

    const activeCourses = courses.filter(c => (Number(c.progressPercent) || 0) < 100);
    const completedCourses = courses.filter(c => (Number(c.progressPercent) || 0) === 100);

    return (
        <div className="flex-1 overflow-y-auto">
            <div
                className="pt-4 sm:pt-6 md:pt-8 lg:pt-8 max-w-full md:max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 space-y-4 sm:space-y-6 md:space-y-8">
                <section
                    className="relative min-h-[360px] overflow-hidden rounded-2xl border border-blue-200/60 bg-slate-950 p-4 shadow-xl shadow-blue-950/20 sm:p-6 md:p-8 dark:border-blue-500/20">
                    <div
                        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(125,211,252,0.34),transparent_30%),radial-gradient(circle_at_78%_42%,rgba(59,130,246,0.2),transparent_32%),linear-gradient(135deg,rgba(37,99,235,0.96)_0%,rgba(14,116,144,0.86)_46%,rgba(15,23,42,0.98)_100%)]"/>
                    <div className="absolute -bottom-24 right-0 h-72 w-1/2 rounded-full bg-cyan-300/12 blur-3xl"/>

                    <img src={BannerImage} alt={"Banner Image"}
                         className="absolute left-0 lg:left-1/2 top-0 h-full w-full lg:w-1/2 object-cover overflow-visible"/>
                    <div
                        className="absolute inset-0 bg-slate-950/82 lg:bg-transparent lg:bg-[linear-gradient(90deg,rgba(2,6,23,0.92)_0%,rgba(2,6,23,0.6)_40%,rgba(2,6,23,0.2)_62%,rgba(2,6,23,0)_100%)]"/>

                    <div className="relative flex min-h-[312px] items-center">
                        <div className="w-full max-w-2xl lg:w-1/2">
                            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100/90">Home Base</p>
                            <h1 className="mt-3 text-3xl font-black leading-[0.95] tracking-tight text-white sm:text-4xl md:text-5xl">
                                Good to see you
                                {user?.displayName ? (
                                    <>
                                        ,{' '}
                                        <UserProfileLink userId={user.id} className="hover:underline">
                                            {user.displayName}
                                        </UserProfileLink>
                                    </>
                                ) : ''}
                                .
                            </h1>
                            <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-blue-100/86 sm:text-base">
                                Pick up where you left off and keep your progress moving.
                            </p>

                            <div
                                className="mt-6 rounded-2xl border border-white/15 bg-slate-950/28 p-4 backdrop-blur-sm sm:p-5">
                                <div
                                    className="flex items-center justify-between text-xs sm:text-sm font-bold text-blue-100 mb-2">
                                    <span>Level Progress</span>
                                    <span>{xpSummary?.xpIntoCurrentLevel || 0} / {xpSummary ? (xpSummary.xpForNextLevel + xpSummary.xpForCurrentLevel) : 0} XP</span>
                                </div>
                                <div className="w-full h-2.5 rounded-full bg-slate-950/50 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-amber-300 to-orange-400"
                                        style={{width: `${xpSummary?.progressPercent || 0}%`}}
                                    />
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <div className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-100/70">Level</p>
                                    <p className="mt-1 text-xl font-black text-white">{xpSummary?.level || 1}</p>
                                </div>
                                <div className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-100/70">Total
                                        XP</p>
                                    <p className="mt-1 text-xl font-black text-white">{xpSummary?.totalXp || 0}</p>
                                </div>
                                <div className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-100/70">Streak</p>
                                    <p className="mt-1 text-xl font-black text-white">{streak?.currentStreakDays || 0}d</p>
                                </div>
                                <div className="rounded-2xl border border-white/12 bg-white/10 p-3 backdrop-blur-sm">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-100/70">Best</p>
                                    <p className="mt-1 text-xl font-black text-white">{streak?.longestStreakDays || 0}d</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Courses Section */}
                <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white py-2 sm:py-3 md:py-4 mb-4 sm:mb-5 md:mb-6 flex items-center">
                        <Target size={24} className="mr-3 text-blue-500"/> Active Courses ({activeCourses.length})
                    </h2>

                    {activeCourses.length === 0 ? (
                        <StateCard title="No courses enrolled yet"
                                   description="Browse the catalog to start a learning path."/>
                    ) : (
                        <div className="flex flex-wrap gap-4 sm:gap-5 md:gap-6">
                            {activeCourses.map(course => {
                                const isViolet = (Number(course.progressPercent) || 0) > 50;

                                return (
                                    <div
                                        key={course.id}
                                        className={`rounded-2xl min-w-58 flex-1 max-w-64 sm:rounded-2xl md:rounded-2xl shadow-lg border transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group relative overflow-hidden glass-shell`}
                                    >
                                        {/* Thumbnail Image */}
                                        <div className={`h-40 sm:h-44 md:h-48 overflow-hidden relative ${
                                            !((course as any).thumbnailS3Key) || brokenImages.has(course.id)
                                                ? 'bg-gradient-to-br from-blue-400 to-cyan-400'
                                                : 'bg-blue-500/15'
                                        }`}>
                                            {((course as any).thumbnailS3Key) && !brokenImages.has(course.id) ? (
                                                <img
                                                    src={getCourseThumbUrl((course as any).thumbnailS3Key)}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={() => handleImageError(course.id)}
                                                />
                                            ) : (
                                                <div
                                                    className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl opacity-70 group-hover:scale-110 transition-transform">
                                                    📚
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Content */}
                                        <div className="p-3 sm:p-4 md:p-6 relative z-10">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-3 sm:mb-4">
                                                <div className="flex-1 pr-2">
													<span
                                                        className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-black uppercase tracking-widest rounded-2xl mb-1 sm:mb-2 ${isViolet ? 'bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' : 'bg-blue-500/15 text-slate-800 dark:text-slate-300'}`}>
                                                        {course.level || 'Beginner'}
													</span>
                                                    <h3 className={`font-black text-sm sm:text-base md:text-lg mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${isViolet ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                                                        {course.title}
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                                                        By{' '}
                                                        <UserProfileLink
                                                            userId={course.creator?.id}
                                                            className="hover:underline"
                                                            stopPropagation
                                                        >
                                                            {course.creator.displayName}
                                                        </UserProfileLink>
                                                    </p>
                                                </div>
                                                <span className="text-2xl sm:text-3xl flex-shrink-0">📚</span>
                                            </div>

                                            {/* Progress */}
                                            <div className="mt-4 sm:mt-5 md:mt-6">
                                                <div className="flex justify-between text-xs font-bold mb-2">
                                                    <span
                                                        className="text-slate-700 dark:text-slate-300 uppercase tracking-wider">Progress</span>
                                                    <span
                                                        className={isViolet ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}>{Number(course.progressPercent) || '0'}%</span>
                                                </div>
                                                <div
                                                    className={`w-full rounded-full h-2.5 ${isViolet ? 'bg-blue-200 dark:bg-blue-900/30' : 'bg-slate-200 dark:bg-slate-600'}`}>
                                                    <div
                                                        className={`h-2.5 rounded-full transition-all ${isViolet ? 'bg-blue-600' : 'bg-slate-600'}`}
                                                        style={{width: `${Number(course.progressPercent) || '0'}%`}}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Button */}
                                            <button
                                                onClick={() => handleEnterCourse(course.id)}
                                                className={`mt-3 sm:mt-4 w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 group/btn
													${isViolet
                                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-600 dark:hover:bg-slate-500 shadow-lg'
                                                }`}
                                            >
                                                <span>Continue</span>
                                                <Play size={14} fill="currentColor"/>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/*/* Completed Courses Section */}
                {completedCourses.length > 0 && (
                    <div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white py-2 sm:py-3 md:py-4 mb-4 sm:mb-5 md:mb-6 flex items-center">
                            <Star size={24} className="mr-3 text-green-500"/> Completed Courses
                            ({completedCourses.length})
                        </h2>

                        <div className="flex flex-wrap gap-4 sm:gap-5 md:gap-6">
                            {completedCourses.map(course => {
                                return (
                                    <div
                                        key={course.id}
                                        className="rounded-2xl min-w-58 flex-1 max-w-64 sm:rounded-2xl md:rounded-2xl shadow-lg border transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group relative overflow-hidden glass-shell"
                                    >
                                        {/* Thumbnail Image */}
                                        <div className={`h-40 sm:h-44 md:h-48 overflow-hidden relative ${
                                            !((course as any).thumbnailS3Key) || brokenImages.has(course.id)
                                                ? 'bg-gradient-to-br from-green-400 to-emerald-400'
                                                : 'bg-blue-500/15'
                                        }`}>
                                            {((course as any).thumbnailS3Key) && !brokenImages.has(course.id) ? (
                                                <img
                                                    src={getCourseThumbUrl((course as any).thumbnailS3Key)}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={() => handleImageError(course.id)}
                                                />
                                            ) : (
                                                <div
                                                    className="absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl opacity-70 group-hover:scale-110 transition-transform">
                                                    ✓
                                                </div>
                                            )}
                                        </div>

                                        {/* Card Content */}
                                        <div className="p-3 sm:p-4 md:p-6 relative z-10">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-3 sm:mb-4">
                                                <div className="flex-1 pr-2">
													<span
                                                        className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-black uppercase tracking-widest rounded-2xl mb-1 sm:mb-2 bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-300">
														{course.level || 'Beginner'}
													</span>
                                                    <h3 className="font-black text-sm sm:text-base md:text-lg text-slate-900 dark:text-white mb-1 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                        {course.title}
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">
                                                        By{' '}
                                                        <UserProfileLink
                                                            userId={course.creator?.id}
                                                            className="hover:underline"
                                                            stopPropagation
                                                        >
                                                            {course.creator.displayName}
                                                        </UserProfileLink>
                                                    </p>
                                                </div>
                                                <span className="text-2xl sm:text-3xl flex-shrink-0">✓</span>
                                            </div>

                                            {/* Completion Info */}
                                            <div className="mt-4 sm:mt-5 md:mt-6">
                                                <div className="flex justify-between text-xs font-bold mb-2">
                                                    <span
                                                        className="text-slate-700 dark:text-slate-300 uppercase tracking-wider">Completed</span>
                                                    <span className="text-green-700 dark:text-green-300">100%</span>
                                                </div>
                                                <div
                                                    className="w-full rounded-full h-2.5 bg-green-200 dark:bg-green-900/30">
                                                    <div className="h-2.5 rounded-full bg-green-600 transition-all"
                                                         style={{width: '100%'}}></div>
                                                </div>
                                            </div>

                                            {/* Button */}
                                            <button
                                                onClick={() => handleEnterCourse(course.id)}
                                                className="mt-3 sm:mt-4 w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl sm:rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30"
                                            >
                                                <span>Review</span>
                                                <Play size={14} fill="currentColor"/>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}



