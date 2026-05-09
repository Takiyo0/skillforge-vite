import {useState, useEffect} from 'react';
import {MessageSquare, Search, Clock, User, X} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import type {User as UserType} from '@skillforge/vite/lib/types';
import {getAvatarUrl} from "../../../lib/s3.ts";

interface ForumPost {
    id: string;
    courseId: string;
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
    updatedAt: string;
    lastActivityAt: string;
}

export function ForumPage() {
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'my-posts' | 'my-replies'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);

    useEffect(() => {
        fetchData();
    }, [filter]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get current user first
            const user = await apiClient.getProfile();
            setCurrentUser(user);

            // For now, we'll fetch posts from all courses
            // A better approach would be an endpoint to get user's related posts
            setPosts([]);
        } catch (err) {
            const apiError = err as any;
            setError(apiError.message || 'Failed to load forum posts');
            console.error('Forum load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPosts = posts.filter(post => {
        const matchesSearch =
            post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.body.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === 'my-posts') {
            return matchesSearch && post.author.id === currentUser?.id;
        }

        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div
                        className="inline-block w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-blue-500/30 animate-pulse mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Loading forum...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div
                            className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-2xl flex items-center justify-center">
                            <MessageSquare size={24}/>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Discussion Forum</h1>
                            <p className="text-slate-600 dark:text-slate-400 text-sm">Connect with fellow students</p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div
                        className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Search and Filter */}
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search size={18} className="absolute left-3 top-3 text-slate-400"/>
                            <input
                                type="text"
                                placeholder="Search posts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="glass-control w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                filter === 'all'
                                    ? 'bg-blue-600 text-white'
                                    : 'glass-chip text-slate-900 dark:text-white hover:bg-white/20'
                            }`}
                        >
                            All Posts
                        </button>
                        <button
                            onClick={() => setFilter('my-posts')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                filter === 'my-posts'
                                    ? 'bg-blue-600 text-white'
                                    : 'glass-chip text-slate-900 dark:text-white hover:bg-white/20'
                            }`}
                        >
                            My Posts
                        </button>
                        <button
                            onClick={() => setFilter('my-replies')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                filter === 'my-replies'
                                    ? 'bg-blue-600 text-white'
                                    : 'glass-chip text-slate-900 dark:text-white hover:bg-white/20'
                            }`}
                        >
                            My Replies
                        </button>
                    </div>
                </div>

                {/* Posts List */}
                {filteredPosts.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare size={48} className="mx-auto text-slate-400 mb-4"/>
                        <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                            {searchTerm ? 'No posts found' : 'No posts yet'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredPosts.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => setSelectedPost(post)}
                                className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-blue-400/20 p-6 hover:border-blue-400/40 cursor-pointer transition-colors shadow-xl shadow-blue-950/5"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {post.isPinned && (
                                                <span
                                                    className="text-xs font-bold uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
													📌 Pinned
												</span>
                                            )}
                                            {post.status === 'locked' && (
                                                <span
                                                    className="text-xs font-bold uppercase bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
													🔒 Locked
												</span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                            {post.title}
                                        </h3>
                                        <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                                            {post.body}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <div
                                        className="flex items-center space-x-4 text-sm text-slate-600 dark:text-slate-400">
                                        <div className="flex items-center gap-1">
                                            <User size={14}/>
                                            {post.author.displayName}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock size={14}/>
                                            {new Date(post.createdAt).toLocaleDateString()}
                                        </div>
                                        {post.replyCount !== undefined && (
                                            <div className="flex items-center gap-1">
                                                <MessageSquare size={14}/>
                                                {post.replyCount} replies
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Selected Post Detail Modal */}
                {selectedPost && (
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div
                            className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-blue-400/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl shadow-blue-950/10">
                            <div className="p-8 space-y-6">
                                {/* Post Header */}
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            {selectedPost.isPinned && (
                                                <span
                                                    className="text-xs font-bold uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
													📌 Pinned
												</span>
                                            )}
                                            {selectedPost.status === 'locked' && (
                                                <span
                                                    className="text-xs font-bold uppercase bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
													🔒 Locked
												</span>
                                            )}
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                                            {selectedPost.title}
                                        </h2>
                                        <div
                                            className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-2">
                                                {selectedPost.author?.avatarS3Key ? (
                                                    <img
                                                        src={getAvatarUrl(selectedPost.author.avatarS3Key, selectedPost.author.id)}
                                                        alt={selectedPost.author.displayName}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                                                        {selectedPost.author?.displayName.charAt(0)}
                                                    </div>
                                                )}
                                                <span>{selectedPost.author?.displayName}</span>
                                            </div>
                                            <span>{new Date(selectedPost.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedPost(null)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        <X size={24}/>
                                    </button>
                                </div>

                                {/* Post Content */}
                                <div className="prose dark:prose-invert prose-sm max-w-none">
                                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                                        {selectedPost.body}
                                    </p>
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => setSelectedPost(null)}
                                    className="glass-button-secondary w-full py-3 rounded-xl font-bold text-slate-900 dark:text-white transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
