import {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {ArrowLeft, MessageSquare} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import {ForumThreadView} from "@skillforge/vite/components/forum/ForumThreadView";

export function ForumThreadPage() {
    const {courseId, forumId} = useParams<{ courseId: string; forumId: string }>();
    const navigate = useNavigate();
    const [courseName, setCourseName] = useState<string>('');
    const [postTitle, setPostTitle] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!courseId || !forumId) return;
            try {
                setLoading(true);
                const course = await apiClient.getCourseDetail(courseId);
                setCourseName(course.title);

                // Fetch the post to get its title for display
                const response = await apiClient.getForumPosts(courseId, {page: 1, limit: 100});
                const post = response.data?.find((p: any) => p.id === forumId);
                if (post) {
                    setPostTitle(post.title);
                }
            } catch (err) {
                console.error('Failed to load forum data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [courseId, forumId]);

    if (!courseId || !forumId) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-300 font-medium">Invalid forum thread</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-8 space-y-8">
                {/* Header with Back Button */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate(`/student/courses/${courseId}/forums`)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400"/>
                    </button>
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                        <div
                            className="w-12 h-12 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <MessageSquare size={24}/>
                        </div>
                        <div className="min-w-0">
                            {loading ? (
                                <>
                                    <div className="h-4 w-64 bg-blue-500/20 rounded animate-pulse mb-2"/>
                                    <div className="h-3 w-48 bg-blue-500/15 rounded animate-pulse"/>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{courseName}</p>
                                    <h1 className="text-2xl font-black text-slate-900 dark:text-white truncate">{postTitle || 'Thread'}</h1>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Single thread view - fully expanded, no accordion */}
                {!loading && <ForumThreadView forumId={forumId}/>}
            </div>
        </div>
    );
}
