import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Clock, BookOpen, ChevronRight, Send, X } from 'lucide-react';
import { apiClient } from '@skillforge/vite/lib/api';
import { getAvatarUrl } from '@skillforge/vite/lib/s3';

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
	course: {
		id: string;
		name: string;
	};
	replyCount: number;
	createdAt: string;
	updatedAt: string;
	lastActivityAt: string;
}

interface Course {
	id: string;
	title: string;
}

export function UserForumsPage() {
	const navigate = useNavigate();
	const [posts, setPosts] = useState<ForumPost[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(0);
	const [courses, setCourses] = useState<Course[]>([]);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [selectedCourseId, setSelectedCourseId] = useState('');
	const [newPostTitle, setNewPostTitle] = useState('');
	const [newPostContent, setNewPostContent] = useState('');
	const [submittingPost, setSubmittingPost] = useState(false);

	useEffect(() => {
		fetchCourses();
		fetchData();
	}, [page]);

	const fetchCourses = async () => {
		try {
			const response = await apiClient.listEnrolledCourses();
			setCourses(response.data || []);
		} catch (err) {
			console.error('Failed to load courses:', err);
		}
	};

	const fetchData = async () => {
		try {
			setLoading(true);
			setError(null);

			// Get user's forums
			const response = await apiClient.getUserForums({ page, limit: 20 });
			setPosts(response.data || []);
			setTotalPages(response.pagination?.totalPages || 0);
		} catch (err) {
			const apiError = err as any;
			setError(apiError.message || 'Failed to load forums');
			console.error('Forums load error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleCreatePost = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedCourseId || !newPostTitle.trim() || !newPostContent.trim()) {
			setError('Please fill in all fields');
			return;
		}

		try {
			setSubmittingPost(true);
			const response = await apiClient.createForumPost({
				courseId: selectedCourseId,
				title: newPostTitle,
				content: newPostContent,
			});

			if (response) {
				// Navigate to the new post
				navigate(`/student/courses/${selectedCourseId}/forums/${response.id}`);
				setShowCreateForm(false);
				setNewPostTitle('');
				setNewPostContent('');
				setSelectedCourseId('');
			}
		} catch (err) {
			const apiError = err as any;
			setError(apiError.message || 'Failed to create forum post');
			console.error('Create post error:', err);
		} finally {
			setSubmittingPost(false);
		}
	};

	const filteredPosts = posts.filter(
		(post) =>
			post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			post.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
			post.course?.name.toLowerCase().includes(searchTerm.toLowerCase())
	);

	if (loading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-blue-500/30 animate-pulse mb-4"></div>
					<p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Loading forums...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="max-w-6xl mx-auto p-8 space-y-8">
				{/* Header */}
				<div className="flex items-center space-x-4">
					<div className="w-12 h-12 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
						<MessageSquare size={24} />
					</div>
					<div>
						<h1 className="text-4xl font-black text-slate-900 dark:text-white">Your Forums</h1>
						<p className="text-slate-600 dark:text-slate-400 text-sm">Posts and discussions you've created or replied to</p>
					</div>
				</div>

				{error && (
					<div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-600 dark:text-red-400">
						{error}
					</div>
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
									setSelectedCourseId('');
									setError(null);
								}}
                                className="p-1 hover:bg-white/10 rounded"
							>
								<X size={18} />
							</button>
						</div>

						<form onSubmit={handleCreatePost} className="space-y-4">
							{/* Course Select */}
							<div>
								<label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
									Select Course
								</label>
								<select
									value={selectedCourseId}
									onChange={(e) => setSelectedCourseId(e.target.value)}
									required
									className="glass-control w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="">Choose a course...</option>
									{courses.map((course) => (
										<option key={course.id} value={course.id}>
											{course.title}
										</option>
									))}
								</select>
							</div>

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
								<label className="bg block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
										setSelectedCourseId('');
										setError(null);
									}}
									className="glass-button-secondary px-6 py-2 rounded-lg font-medium transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={submittingPost || !selectedCourseId || !newPostTitle.trim() || !newPostContent.trim()}
									className="inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
								>
									<Send size={16} />
									{submittingPost ? 'Creating...' : 'Create Post'}
								</button>
							</div>
						</form>
					</div>
				)}

				{/* Search */}
				<div className="flex gap-3">
					<div className="flex-1 relative">
						<Search size={18} className="absolute left-3 top-3 text-slate-400" />
						<input
							type="text"
							placeholder="Search by title, content, or course..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="glass-control w-full pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>

				{/* Posts List */}
				{filteredPosts.length === 0 ? (
					<div className="text-center py-16">
						<MessageSquare size={48} className="mx-auto text-slate-400 dark:text-slate-600 mb-4" />
						<p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
							{searchTerm ? 'No forums match your search' : 'You haven\'t participated in any forums yet'}
						</p>
						<p className="text-slate-500 dark:text-slate-500 text-sm mt-2">
							Start by creating a post or replying to discussions in your courses
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{filteredPosts.map((post) => (
							<div
								key={post.id}
								onClick={() => navigate(`/student/courses/${post.courseId}/forums/${post.id}`)}
								className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-blue-400/20 p-6 hover:border-blue-400/40 cursor-pointer transition-all hover:shadow-lg shadow-xl shadow-blue-950/5"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										{/* Course Context & Badges */}
										<div className="flex items-center gap-2 mb-3">
											<div className="flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-blue-500/10 px-3 py-1 rounded-lg">
												<BookOpen size={12} />
												{post.course?.name || 'Unknown Course'}
											</div>
											{post.isPinned && (
												<span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
													📌 Pinned
												</span>
											)}
											{post.status === 'locked' && (
												<span className="text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
													🔒 Locked
												</span>
											)}
											{post.status === 'hidden' && (
												<span className="text-xs font-bold bg-blue-500/10 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-full">
													👁️ Hidden
												</span>
											)}
										</div>

										{/* Title */}
										<h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
											{post.title}
										</h3>

										{/* Content Preview */}
										<p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-4">
											{post.body}
										</p>

										{/* Footer Info */}
										<div className="flex items-center justify-between flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
											<div className="flex items-center gap-3">
												{/* Author */}
												<div className="flex items-center gap-2">
													<img
														src={getAvatarUrl(post.author.avatarS3Key, post.author.id)}
														alt={post.author.displayName}
														className="w-6 h-6 rounded-full"
													/>
													<span className="font-medium">{post.author.displayName}</span>
												</div>

												{/* Date */}
												<div className="flex items-center gap-1">
													<Clock size={12} />
													{new Date(post.lastActivityAt).toLocaleDateString()}
												</div>

												{/* Reply Count */}
												{post.replyCount > 0 && (
													<div className="flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded">
														<MessageSquare size={12} />
														{post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
													</div>
												)}
											</div>
										</div>
									</div>

									{/* Chevron */}
									<ChevronRight size={20} className="text-slate-400 flex-shrink-0 mt-1" />
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
							className="glass-button-secondary px-4 py-2 rounded-lg font-medium text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							Previous
						</button>
						<span className="text-slate-600 dark:text-slate-400 font-medium">
							Page {page} of {totalPages}
						</span>
						<button
							onClick={() => setPage(Math.min(totalPages, page + 1))}
							disabled={page === totalPages}
							className="glass-button-secondary px-4 py-2 rounded-lg font-medium text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							Next
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
