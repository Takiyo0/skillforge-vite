import {useParams, useNavigate} from 'react-router-dom';
import {ArrowLeft, MessageSquare, Search, Clock, Plus, Send, X} from 'lucide-react';
import {useEffect, useState} from 'react';
import {apiClient} from '@skillforge/vite/lib/api';
import {getAvatarUrl} from '@skillforge/vite/lib/s3';
import {UserProfileLink} from '@skillforge/vite/components/ui/UserProfileLink';

interface ForumPost {
    id: string;
    title: string;
    body: string;
    status: string;
    isPinned: boolean;
    author: {
        id: string;
        displayName: string;
        avatarS3Key?: string;
    };
    replyCount: number;
    createdAt: string;
    lastActivityAt: string;
}

export function CourseForumsPage() {
    const {courseId} = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const [courseName, setCourseName] = useState<string>('');
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [submittingPost, setSubmittingPost] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!courseId) return;
            try {
                setLoading(true);
                const [courseData, forumsData] = await Promise.all([
                    apiClient.getCourseDetail(courseId),
                    apiClient.getForumPosts(courseId, {page, limit: 20}),
                ]);
                setCourseName(courseData.title);
                setPosts(forumsData.data || []);
                setTotalPages(forumsData.pagination?.totalPages || 0);
            } catch (err) {
                console.error('Failed to load course forums:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [courseId, page]);

    const filteredPosts = posts.filter(
        (post) =>
            post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.body.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPostTitle.trim() || !newPostContent.trim()) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setSubmittingPost(true);
            const response = await apiClient.createForumPost({
                courseId: courseId!,
                title: newPostTitle,
                content: newPostContent,
            });

            if (response) {
                // Refresh the posts list
                await new Promise(resolve => setTimeout(resolve, 500));
                setPage(1);
                setShowCreateForm(false);
                setNewPostTitle('');
                setNewPostContent('');
                setError(null);
                // Refresh data
                const forumsData = await apiClient.getForumPosts(courseId!, {page: 1, limit: 20});
                setPosts(forumsData.data || []);
            }
        } catch (err) {
            const apiError = err as any;
            setError(apiError.message || 'Failed to create forum post');
            console.error('Create post error:', err);
        } finally {
            setSubmittingPost(false);
        }
    };

    if (!courseId) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6">
                    <p className="text-red-300 font-medium">Course not found</p>
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
                        onClick={() => navigate(`/student/courses/${courseId}`)}
                        className="glass-chip p-2 rounded-2xl transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400"/>
                    </button>
                    <div className="flex items-center space-x-4 flex-1">
                        <div
                            className="w-12 h-12 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                            <MessageSquare size={24}/>
                        </div>
                        <div>
                            {loading ? (
                                <>
                                    <div
                                        className="h-8 w-48 bg-blue-500/20 rounded animate-pulse mb-2"/>
                                    <div className="h-4 w-64 bg-blue-500/15 rounded animate-pulse"/>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">{courseName} Forums</h1>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm">Discuss and collaborate
                                        with classmates</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Create New Forum Form */}
                {!showCreateForm && (
                    <button
                        onClick={() => setShowCreateForm(true)}
                                className="glass-button inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-colors"
                    >
                        <Plus size={18} />
                        Create New Post
                    </button>
                )}

                {showCreateForm && (
                    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-blue-200/40 dark:border-blue-400/20 p-6 space-y-4 shadow-xl shadow-blue-950/5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New Forum Post</h2>
                            <button
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setNewPostTitle('');
                                    setNewPostContent('');
                                    setError(null);
                                }}
                                className="glass-chip p-1 rounded"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePost} className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Post Title
                                </label>
                                <input
                                    type="text"
                                    value={newPostTitle}
                                    onChange={(e) => setNewPostTitle(e.target.value)}
                                    placeholder="What's your question or topic?"
                                    required
                                    maxLength={200}
                                    className="glass-control w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                />
                                <div className="text-xs text-slate-500 mt-1">
                                    {newPostTitle.length} / 200
                                </div>
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Post Content
                                </label>
                                <textarea
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder="Provide details about your question or topic..."
                                    required
                                    rows={5}
                                    className="glass-control w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white resize-none"
                                />
                            </div>

                            {/* Submit */}
                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setNewPostTitle('');
                                        setNewPostContent('');
                                        setError(null);
                                    }}
                                    className="glass-button-secondary px-6 py-2 rounded-2xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingPost || !newPostTitle.trim() || !newPostContent.trim()}
                                    className="glass-button inline-flex items-center gap-2 px-6 py-2 rounded-2xl font-medium disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Send size={16} />
                                    {submittingPost ? 'Creating...' : 'Create Post'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {!loading && (
                    <>
                        {/* Search */}
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-3 text-slate-400"/>
                            <input
                                type="text"
                                placeholder="Search forums..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="glass-control w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Threads List */}
                        {filteredPosts.length === 0 ? (
                            <div className="text-center py-16">
                                <MessageSquare size={48} className="mx-auto text-slate-400 dark:text-slate-600 mb-4"/>
                                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                                    {searchTerm ? 'No forums match your search' : 'No forums yet'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredPosts.map((post) => (
                                    <div
                                        key={post.id}
                                        onClick={() => navigate(`/student/courses/${courseId}/forums/${post.id}`)}
                                        className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-blue-400/20 p-6 hover:border-blue-400/40 cursor-pointer transition-all hover:shadow-lg shadow-xl shadow-blue-950/5"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                {/* Status Badges */}
                                                {post.isPinned || ['locked', 'hidden'].find(x => x === post.status) &&
                                                    <div className="flex items-center gap-2 mb-3">
                                                        {post.isPinned && (
                                                            <span
                                                                className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
															📌 Pinned
														</span>
                                                        )}
                                                        {post.status === 'locked' && (
                                                            <span
                                                                className="text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
															🔒 Locked
														</span>
                                                        )}
                                                        {post.status === 'hidden' && (
                                                            <span
                                                                className="text-xs font-bold bg-blue-500/10 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full">
															👁️ Hidden
														</span>
                                                        )}
                                                    </div>}

                                                {/* Title */}
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
                                                    {post.title}
                                                </h3>

                                                {/* Preview */}
                                                <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-4">
                                                    {post.body}
                                                </p>

                                                {/* Footer */}
                                                <div
                                                    className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                                                    {/* Author */}
                                                    <div className="flex items-center gap-2">
                                                        <UserProfileLink
                                                            userId={post.author?.id}
                                                            className="inline-flex items-center gap-2 font-medium hover:underline"
                                                            stopPropagation
                                                        >
                                                            <img
                                                                src={getAvatarUrl(post.author.avatarS3Key, post.author.id)}
                                                                alt={post.author.displayName}
                                                                className="w-6 h-6 rounded-full"
                                                            />
                                                            <span className="font-medium">{post.author.displayName}</span>
                                                        </UserProfileLink>
                                                    </div>

                                                    {/* Date */}
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12}/>
                                                        {new Date(post.lastActivityAt).toLocaleDateString()}
                                                    </div>

                                                    {/* Reply Count */}
                                                    {post.replyCount > 0 && (
                                                        <div
                                                            className="flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded">
                                                            <MessageSquare size={12}/>
                                                            {post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <button
                                    onClick={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                    className="glass-button-secondary px-4 py-2 rounded-2xl font-medium text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
									Page {page} of {totalPages}
								</span>
                                <button
                                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                    className="glass-button-secondary px-4 py-2 rounded-2xl font-medium text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
