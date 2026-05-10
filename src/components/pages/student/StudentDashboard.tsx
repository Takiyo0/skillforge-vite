import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {Play, Target, Flame, Star, Zap} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import {getCourseThumbUrl} from '@skillforge/vite/lib/s3';
import type {User, XpSummary, Streak, Course} from '@skillforge/vite/lib/types';
import {StateCard} from '@skillforge/vite/components/ui/controls';

export function StudentDashboard() {
    const navigate = useNavigate();
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
                    apiClient.getProfile(),
                    apiClient.getXpSummary(),
                    apiClient.getStreak(),
                    apiClient.listEnrolledCourses(),
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
                    setCourses(results[3].value.data || []);
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
    }, []);

    const handleImageError = (courseId: string) => {
        setBrokenImages((prev) => new Set([...prev, courseId]));
    };

    const handleEnterCourse = (courseId: string) => {
        navigate(`/student/courses/${courseId}`);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <StateCard title="Loading dashboard..." description="Gathering your progress and enrolled courses." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <StateCard title="Unable to load dashboard" description={error} className="border-red-500/20 bg-red-500/10 max-w-md" />
            </div>
        );
    }

    const activeCourses = courses.filter(c => (Number(c.progressPercent) || 0) < 100);
    const completedCourses = courses.filter(c => (Number(c.progressPercent) || 0) === 100);

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="pt-4 sm:pt-6 md:pt-8 lg:pt-8 max-w-full md:max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 space-y-4 sm:space-y-6 md:space-y-8">
                {/* Hero Section */}
                <div
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-700 dark:to-cyan-700 rounded-2xl sm:rounded-3xl md:rounded-[3rem] p-4 sm:p-6 md:p-8 lg:p-12 text-white relative overflow-hidden shadow-xl">
                    <div
                        className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div
                        className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 md:gap-8">
                        <div className="w-full md:flex-1">
                            <div className="flex items-center space-x-2 mb-2 sm:mb-3 md:mb-4">
                                <Star size={16} className="text-amber-300" fill="currentColor"/>
                                <span className="text-sm sm:text-base">Adventurer</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-2 tracking-tight">Ready for your next
                                quest, {user?.displayName}?</h1>
                            <p className="text-blue-100 text-sm sm:text-base md:text-lg opacity-90 font-medium">Select a campaign below and
                                continue leveling up.</p>
                        </div>

                        <div
                            className="bg-slate-900/40 backdrop-blur-md p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border border-white/10 w-full md:w-96 shrink-0">
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                {/* Level Card */}
                                <div>
                                    <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">Level</p>
                                    <p className="text-2xl sm:text-3xl font-black text-white mb-2">{xpSummary?.level || 1}</p>
                                    <div className="text-xs sm:text-sm font-bold text-amber-400">
                                        {xpSummary?.xpIntoCurrentLevel || 0} / {xpSummary?.xpNeededForNextLevel || 0}
                                        <span className="text-blue-200 text-xs ml-1">XP</span>
                                    </div>
                                    <div
                                        className="w-full bg-slate-950/50 rounded-full h-2 p-0.5 border border-white/10 mt-2">
                                        <div
                                            className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full"
                                            style={{width: `${xpSummary?.progressPercent || 0}%`}}
                                        ></div>
                                    </div>
                                </div>

                                {/* Streak Card */}
                                <div>
                                    <div className="flex items-center space-x-2 mb-2">
                                        <Flame size={14} className="text-orange-500"/>
                                        <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">Streak</p>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-black text-orange-400 mb-2">{streak?.currentStreakDays || 0}</p>
                                    <p className="text-xs text-slate-300">
                                        Best: {streak?.longestStreakDays || 0} days
                                    </p>
                                    <div className="mt-3 text-xs text-blue-200">
                                        <Zap size={12} className="inline mr-1"/>
                                        {xpSummary?.totalXp || 0} total XP
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Courses Section */}
                <div>
                    <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white py-2 sm:py-3 md:py-4 mb-4 sm:mb-5 md:mb-6 flex items-center">
                        <Target size={24} className="mr-3 text-blue-500"/> Active Courses ({activeCourses.length})
                    </h2>

                    {activeCourses.length === 0 ? (
                        <StateCard title="No courses enrolled yet" description="Browse the catalog to start a learning path." />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                            {activeCourses.map(course => {
                                const isViolet = (Number(course.progressPercent) || 0) > 50;

                                return (
                                    <div
                                        key={course.id}
                                        className={`rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group relative overflow-hidden glass-shell`}
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
                                                        className={`inline-block px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-black uppercase tracking-widest rounded-lg mb-1 sm:mb-2 ${isViolet ? 'bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' : 'bg-blue-500/15 text-slate-800 dark:text-slate-300'}`}>
                                                        {course.level || 'Beginner'}
													</span>
                                                    <h3 className={`font-black text-sm sm:text-base md:text-lg mb-1 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${isViolet ? 'text-slate-900 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                                                        {course.title}
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">By {course.creator.displayName}</p>
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
                                                className={`mt-3 sm:mt-4 w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 group/btn
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
                            <Star size={24} className="mr-3 text-green-500"/> Completed Courses ({completedCourses.length})
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                            {completedCourses.map(course => {
                                return (
                                    <div
                                        key={course.id}
                                        className="rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg border transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer group relative overflow-hidden glass-shell"
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
                                                        className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-black uppercase tracking-widest rounded-lg mb-1 sm:mb-2 bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-300">
														{course.level || 'Beginner'}
													</span>
                                                    <h3 className="font-black text-sm sm:text-base md:text-lg text-slate-900 dark:text-white mb-1 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                        {course.title}
                                                    </h3>
                                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">By {course.creator.displayName}</p>
                                                </div>
                                                <span className="text-2xl sm:text-3xl flex-shrink-0">✓</span>
                                            </div>

                                            {/* Completion Info */}
                                            <div className="mt-4 sm:mt-5 md:mt-6">
                                                <div className="flex justify-between text-xs font-bold mb-2">
                                                    <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider">Completed</span>
                                                    <span className="text-green-700 dark:text-green-300">100%</span>
                                                </div>
                                                <div className="w-full rounded-full h-2.5 bg-green-200 dark:bg-green-900/30">
                                                    <div className="h-2.5 rounded-full bg-green-600 transition-all" style={{width: '100%'}}></div>
                                                </div>
                                            </div>

                                            {/* Button */}
                                            <button
                                                onClick={() => handleEnterCourse(course.id)}
                                                className="mt-3 sm:mt-4 w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/30"
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






