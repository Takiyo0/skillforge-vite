import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {BookOpen, Zap} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import {getCourseThumbUrl} from '@skillforge/vite/lib/s3';
import type {Course, CourseLevel} from '@skillforge/vite/lib/types';
import {GlassButton, SearchField, StateCard} from '@skillforge/vite/components/ui/controls';
import {UserProfileLink} from '@skillforge/vite/components/ui/UserProfileLink';

export function BrowseCourses() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [levelFilter, setLevelFilter] = useState<CourseLevel | 'all'>('all');
    const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                setLoading(true);
                const result = await apiClient.listCourses({
                    search: searchQuery || undefined,
                    level: levelFilter === 'all' ? undefined : levelFilter,
                    limit: 50,
                });
                console.log(result)
                setCourses(result.data || []);
            } catch (err) {
                const apiError = err as Error;
                setError(apiError.message || 'Failed to load courses');
                console.error('Courses load error:', err);
            } finally {
                setError(null);
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(fetchCourses, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchQuery, levelFilter]);

    const handleImageError = (courseId: string) => {
        setBrokenImages((prev) => new Set([...prev, courseId]));
    };

    // const getLevelColor = (level: CourseLevel) => {
    //     switch (level) {
    //         case 'beginner':
    //             return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    //         case 'intermediate':
    //             return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    //         case 'advanced':
    //             return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    //         default:
    //             return 'bg-blue-500/15 text-slate-700 dark:text-slate-300';
    //     }
    // };
    //
    // const getLevelIcon = (level: CourseLevel) => {
    //     switch (level) {
    //         case 'beginner':
    //             return '🌱';
    //         case 'intermediate':
    //             return '⚡';
    //         case 'advanced':
    //             return '🚀';
    //         default:
    //             return '📚';
    //     }
    // };

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 dark:from-blue-700 dark:to-cyan-700 rounded-[3rem] p-12 text-white relative overflow-hidden shadow-xl">
                    <div
                        className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

                    <div className="relative z-10">
                        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">Browse Courses</h1>
                        <p className="text-blue-100 text-lg font-medium">Explore all available courses and start
                            learning today</p>
                    </div>
                </div>

                {/* Search and Filter Section */}
                <div className="space-y-4">
                    {/* Search Bar */}
                    <SearchField
                        type="text"
                        placeholder="Search courses by title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {/* Level Filter */}
                    <div className="flex gap-3 flex-wrap">
                        {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
                            <button
                                key={level}
                                onClick={() => setLevelFilter(level)}
                                className={`glass-chip px-4 py-2 rounded-full font-bold uppercase tracking-wider text-xs transition-all ${
                                    levelFilter === level
                                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-200'
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/70'
                                }`}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <StateCard
                        title="Loading courses..."
                        description="Fetching the latest catalog and filters."
                        className="py-12"
                    />
                )}

                {/* Error State */}
                {error && !loading && (
                    <StateCard
                        title="Unable to load courses"
                        description={error}
                        className="border-red-500/20 bg-red-500/10 text-left"
                    />
                )}

                {/* Courses Grid */}
                {!loading && !error && (
                    <>
                        {courses.length === 0 ? (
                            <StateCard
                                icon={<BookOpen size={24}/>}
                                title="No courses found"
                                description="Try adjusting your search or filters."
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courses.map((course) => (
                                    <div
                                        key={course.id}
                                        onClick={() => navigate(`/student/courses/${course.id}`)}
                                        className="glass-panel rounded-2xl overflow-hidden transition-all hover:scale-[1.02] cursor-pointer group relative"
                                    >
                                        {/* Enrollment Badge */}
                                        {course.enrolled && (
                                            <div
                                                className="absolute top-4 right-4 z-10 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1 shadow-lg">
                                                <span>✓</span>
                                                <span>Enrolled</span>
                                            </div>
                                        )}

                                        {/* Cover Image / Thumbnail */}
                                        <div className={`h-40 relative overflow-hidden ${
                                            ((course as any).thumbnailS3Key) && !brokenImages.has(course.id)
                                                ? 'bg-blue-500/15'
                                                : 'bg-gradient-to-br from-blue-400 to-cyan-400'
                                        }`}>
                                            {((course as any).thumbnailS3Key) && !brokenImages.has(course.id) ? (
                                                <img
                                                    src={getCourseThumbUrl((course as any).thumbnailS3Key)}
                                                    alt={course.title}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                    onError={() => handleImageError(course.id)}
                                                />
                                            ) : (
                                                <div
                                                    className="absolute inset-0 flex items-center justify-center text-5xl opacity-50 group-hover:scale-110 transition-transform">
                                                    📚
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 space-y-4">

                                            {/* Title */}
                                            <h3 className="font-black text-slate-900 dark:text-white text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                                {course.title}
                                            </h3>

                                            {/* Description */}
                                            <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">
                                                {course.description}
                                            </p>

                                            {/* Instructor */}
                                            <p className="text-slate-500 dark:text-slate-500 text-sm font-medium">
                                                By{' '}
                                                <UserProfileLink
                                                    userId={course.creator?.id}
                                                    className="font-bold text-slate-700 dark:text-slate-300 hover:underline"
                                                >
                                                    {course.creator.displayName}
                                                </UserProfileLink>
                                            </p>

                                            {/* Stats */}
                                            <div
                                                className="flex items-center space-x-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                                <div
                                                    className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                                                    <Zap size={16} className="text-orange-500"/>
                                                    <span
                                                        className="text-sm font-medium">{course.priceCents === 0 ? 'Free' : `$${(course.priceCents / 100).toFixed(2)}`}</span>
                                                </div>
                                            </div>

                                            {/* CTA Button */}
                                            <GlassButton className="w-full mt-2">
                                                View Course
                                            </GlassButton>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
