import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	MessageSquare,
	Plus,
	Send,
	ChevronDown,
	ChevronRight,
	MoreHorizontal,
	Trash2,
	Lock,
	Unlock,
	Eye,
	EyeOff,
	X,
	CornerDownRight,
	Clock3,
	Pin,
} from 'lucide-react';
import { apiClient } from '@skillforge/vite/lib/api';
import type { User as UserType } from '@skillforge/vite/lib/types';
import { isAdmin, isInstructor } from '@skillforge/vite/lib/roles';
import { getAvatarUrl } from '@skillforge/vite/lib/s3';

interface ForumAuthor {
	id: string;
	displayName: string;
	avatarS3Key?: string;
}

interface ForumPost {
	id: string;
	courseId: string;
	title: string;
	body: string;
	status: 'visible' | 'hidden' | 'locked' | 'deleted' | string;
	isPinned: boolean;
	author: ForumAuthor;
	replyCount: number;
	createdAt: string;
	updatedAt: string;
	lastActivityAt: string;
}

interface ForumReply {
	id: string;
	postId: string;
	parentReplyId: string | null;
	body: string;
	status: 'visible' | 'hidden' | 'locked' | 'deleted' | string;
	author: ForumAuthor;
	childReplies: ForumReply[];
	createdAt: string;
	updatedAt: string;
}

interface CourseForumSectionProps {
	courseId: string;
	courseName?: string;
	initialPostId?: string | null;
}

const ITEMS_PER_PAGE = 12;

export function CourseForumSection({
	courseId,
	courseName,
	initialPostId = null,
}: CourseForumSectionProps) {
	const [posts, setPosts] = useState<ForumPost[]>([]);
	const [repliesByPost, setRepliesByPost] = useState<Record<string, ForumReply[]>>({});
	const [loadingPosts, setLoadingPosts] = useState(true);
	const [loadingRepliesForPost, setLoadingRepliesForPost] = useState<string | null>(null);
	const [submittingPost, setSubmittingPost] = useState(false);
	const [submittingReplyForPost, setSubmittingReplyForPost] = useState<string | null>(null);
	const [moderationLoading, setModerationLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [searchTerm, setSearchTerm] = useState('');
	const [activeMenu, setActiveMenu] = useState<string | null>(null);
	const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
	const [showNewPostForm, setShowNewPostForm] = useState(false);
	const [newPostTitle, setNewPostTitle] = useState('');
	const [newPostContent, setNewPostContent] = useState('');
	const [replyDraftByPost, setReplyDraftByPost] = useState<Record<string, string>>({});
	const [replyTargetByPost, setReplyTargetByPost] = useState<Record<string, ForumReply | null>>({});
	const [currentUser, setCurrentUser] = useState<UserType | null>(null);
	const [resolvedCourseName, setResolvedCourseName] = useState(courseName || '');
	const [isUserModerator, setIsUserModerator] = useState(false);

	const loadPosts = useCallback(
		async (targetPage: number, preserveExpanded = false) => {
			setLoadingPosts(true);
			try {
				const response = await apiClient.getForumPosts(courseId, {
					page: targetPage,
					limit: ITEMS_PER_PAGE,
				});
				setPosts(response.data || []);
				setTotalPages((response as any).pages || response.pagination?.totalPages || 1);
				if (!preserveExpanded) {
					setExpandedPostId(null);
				}
			} catch (err) {
				const apiError = err as { message?: string };
				setError(apiError.message || 'Failed to load forum threads');
			} finally {
				setLoadingPosts(false);
			}
		},
		[courseId],
	);

	const loadReplies = useCallback(async (postId: string) => {
		setLoadingRepliesForPost(postId);
		try {
			const response = await apiClient.getForumReplies(postId, { page: 1, limit: 100 });
			setRepliesByPost((prev) => ({
				...prev,
				[postId]: response.data || [],
			}));
		} catch (err) {
			const apiError = err as { message?: string };
			setError(apiError.message || 'Failed to load replies');
		} finally {
			setLoadingRepliesForPost(null);
		}
	}, []);

	const bootstrap = useCallback(async () => {
		setError(null);
		try {
			const [profile, courseDetail] = await Promise.all([
				apiClient.getProfile(),
				apiClient.getCourseDetail(courseId),
			]);
			setCurrentUser(profile);
			setResolvedCourseName(courseName || courseDetail.title || 'Course');

			const isCourseOwner = profile.id === courseDetail?.creator?.id;
			setIsUserModerator(isAdmin(profile) || (isInstructor(profile) && isCourseOwner));
		} catch (err) {
			const apiError = err as { message?: string };
			setError(apiError.message || 'Failed to load forum context');
		}
	}, [courseId, courseName]);

	useEffect(() => {
		void bootstrap();
		void loadPosts(page);
	}, [bootstrap, loadPosts, page]);

	useEffect(() => {
		if (!initialPostId || posts.length === 0) return;
		const found = posts.find((post) => post.id === initialPostId);
		if (!found) return;
		setExpandedPostId(initialPostId);
		void loadReplies(initialPostId);
	}, [initialPostId, posts, loadReplies]);

	const filteredPosts = useMemo(() => {
		const keyword = searchTerm.trim().toLowerCase();
		if (!keyword) return posts;
		return posts.filter((post) => {
			return (
				post.title.toLowerCase().includes(keyword) ||
				post.body.toLowerCase().includes(keyword) ||
				post.author.displayName.toLowerCase().includes(keyword)
			);
		});
	}, [posts, searchTerm]);

	const handleCreatePost = async () => {
		const title = newPostTitle.trim();
		const content = newPostContent.trim();
		if (!title || !content) {
			setError('Thread title and content are required.');
			return;
		}

		setSubmittingPost(true);
		setError(null);
		try {
			const created = await apiClient.createForumPost({
				courseId,
				title,
				content,
			});
			setShowNewPostForm(false);
			setNewPostTitle('');
			setNewPostContent('');
			await loadPosts(1);
			setPage(1);
			if (created?.id) {
				setExpandedPostId(created.id);
				await loadReplies(created.id);
			}
		} catch (err) {
			const apiError = err as { message?: string };
			setError(apiError.message || 'Failed to create thread');
		} finally {
			setSubmittingPost(false);
		}
	};

	const handleCreateReply = async (postId: string) => {
		const content = (replyDraftByPost[postId] || '').trim();
		if (!content) return;

		const parentReplyId = replyTargetByPost[postId]?.id;
		setSubmittingReplyForPost(postId);
		setError(null);
		try {
			await apiClient.createForumReply({
				postId,
				content,
				parentReplyId: parentReplyId || undefined,
			} as any);
			setReplyDraftByPost((prev) => ({ ...prev, [postId]: '' }));
			setReplyTargetByPost((prev) => ({ ...prev, [postId]: null }));
			await loadReplies(postId);
			await loadPosts(page, true);
		} catch (err) {
			const apiError = err as { message?: string };
			setError(apiError.message || 'Failed to submit reply');
		} finally {
			setSubmittingReplyForPost(null);
		}
	};

	const handleDeletePost = async (postId: string) => {
		if (!window.confirm('Delete this thread permanently?')) return;
		setModerationLoading(postId);
		setError(null);
		try {
			await apiClient.deleteForumPost(postId);
			await loadPosts(page);
		} catch (err) {
			const apiError = err as { message?: string };
			setError(apiError.message || 'Failed to delete thread');
		} finally {
			setModerationLoading(null);
			setActiveMenu(null);
		}
	};

	const handleDeleteReply = async (postId: string, replyId: string) => {
		if (!window.confirm('Delete this reply permanently?')) return;
		setModerationLoading(replyId);
		setError(null);
		try {
			await apiClient.deleteForumReply(replyId);
			await loadReplies(postId);
			await loadPosts(page, true);
		} catch (err) {
			const apiError = err as { message?: string };
			setError(apiError.message || 'Failed to delete reply');
		} finally {
			setModerationLoading(null);
			setActiveMenu(null);
		}
	};

	const handlePostStatus = async (
		postId: string,
		status: 'hidden' | 'visible' | 'locked',
		confirmText: string,
	) => {
		if (!window.confirm(confirmText)) return;
		setModerationLoading(postId);
		setError(null);
		try {
			await apiClient.updateForumPostStatus(postId, status);
			await loadPosts(page, true);
		} catch (err) {
			const apiError = err as { message?: string };
			setError(apiError.message || 'Failed to update thread status');
		} finally {
			setModerationLoading(null);
			setActiveMenu(null);
		}
	};

	const handleReplyStatus = async (
		postId: string,
		replyId: string,
		status: 'hidden' | 'visible',
		confirmText: string,
	) => {
		if (!window.confirm(confirmText)) return;
		setModerationLoading(replyId);
		setError(null);
		try {
			await apiClient.updateForumReplyStatus(replyId, status);
			await loadReplies(postId);
			await loadPosts(page, true);
		} catch (err) {
			const apiError = err as { message?: string };
			setError(apiError.message || 'Failed to update reply status');
		} finally {
			setModerationLoading(null);
			setActiveMenu(null);
		}
	};

	const openThread = async (postId: string) => {
		if (expandedPostId === postId) {
			setExpandedPostId(null);
			return;
		}
		setExpandedPostId(postId);
		if (!repliesByPost[postId]) {
			await loadReplies(postId);
		}
	};

	const renderReply = (postId: string, reply: ForumReply, depth = 0) => {
		const isAuthor = currentUser?.id === reply.author?.id;
		const canDelete = isUserModerator || isAuthor;
		const showAsHidden = reply.status === 'hidden';

		return (
			<div
				key={reply.id}
				className={`glass-panel rounded-xl p-4 ${depth > 0 ? 'ml-6 mt-3' : ''}`}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-3 min-w-0">
						<img
							src={getAvatarUrl(reply.author?.avatarS3Key, reply.author?.id)}
							alt={reply.author?.displayName || 'User'}
							className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700"
						/>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<p className="font-bold text-sm text-slate-900 dark:text-white">
									{reply.author?.displayName || 'Unknown User'}
								</p>
								<span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
									<Clock3 size={12} />
									{new Date(reply.createdAt).toLocaleString()}
								</span>
								{showAsHidden && (
									<span className="text-xs font-bold bg-blue-500/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
										<EyeOff size={12} />
										Hidden
									</span>
								)}
							</div>
							<p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-2">
								{reply.body}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-1">
						<button
							onClick={() => {
								setReplyTargetByPost((prev) => ({ ...prev, [postId]: reply }));
								setReplyDraftByPost((prev) => ({
									...prev,
									[postId]: `@${reply.author?.displayName || 'user'} `,
								}));
							}}
							className="px-2 py-1 text-xs rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 inline-flex items-center gap-1"
						>
							<CornerDownRight size={12} />
							Reply
						</button>
						{(isUserModerator || canDelete) && (
							<div className="relative">
								<button
									onClick={() => setActiveMenu(activeMenu === reply.id ? null : reply.id)}
									className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
									disabled={moderationLoading === reply.id}
								>
									<MoreHorizontal size={14} />
								</button>
								{activeMenu === reply.id && (
									<div className="absolute right-0 mt-1 w-40 glass-panel rounded-lg z-20">
										{isUserModerator && (
											<button
												onClick={() =>
													handleReplyStatus(
														postId,
														reply.id,
														reply.status === 'hidden' ? 'visible' : 'hidden',
														reply.status === 'hidden' ? 'Unhide this reply?' : 'Hide this reply?',
													)
												}
												className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
											>
												{reply.status === 'hidden' ? <Eye size={14} /> : <EyeOff size={14} />}
												{reply.status === 'hidden' ? 'Unhide' : 'Hide'}
											</button>
										)}
										{canDelete && (
											<button
												onClick={() => handleDeleteReply(postId, reply.id)}
												className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center gap-2"
											>
												<Trash2 size={14} />
												Delete
											</button>
										)}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
				{reply.childReplies?.map((child) => renderReply(postId, child, depth + 1))}
			</div>
		);
	};

	return (
		<div className="space-y-5">
			<div className="glass-panel rounded-2xl p-5">
				<div className="flex items-center justify-between gap-3 flex-wrap">
					<div>
						<h2 className="text-xl font-black text-slate-900 dark:text-white">Forums · {resolvedCourseName}</h2>
						<p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
							Ask questions, share progress, and discuss this course with thread-based conversations.
						</p>
					</div>
					<button
						onClick={() => setShowNewPostForm((prev) => !prev)}
						className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
					>
						<Plus size={16} />
						New Thread
					</button>
				</div>

				<div className="mt-4">
					<input
						type="text"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Search threads by title, content, or author..."
						className="glass-control w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
			</div>

			{error && (
				<div className="rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 flex items-start justify-between gap-3">
					<p className="text-sm">{error}</p>
					<button onClick={() => setError(null)} className="mt-0.5">
						<X size={16} />
					</button>
				</div>
			)}

			{showNewPostForm && (
				<div className="glass-panel rounded-2xl p-5 space-y-3">
					<input
						type="text"
						value={newPostTitle}
						onChange={(event) => setNewPostTitle(event.target.value)}
						placeholder="Thread title"
						className="glass-control w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<textarea
						value={newPostContent}
						onChange={(event) => setNewPostContent(event.target.value)}
						placeholder="Describe your question or discussion..."
						className="glass-control w-full px-4 py-3 min-h-[140px] rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<div className="flex items-center gap-2">
						<button
							onClick={handleCreatePost}
							disabled={submittingPost}
							className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50"
						>
							{submittingPost ? 'Posting...' : 'Post Thread'}
						</button>
						<button
							onClick={() => {
								setShowNewPostForm(false);
								setNewPostTitle('');
								setNewPostContent('');
							}}
							className="glass-button-secondary px-4 py-2 rounded-lg text-slate-900 dark:text-white text-sm font-bold"
						>
							Cancel
						</button>
					</div>
				</div>
			)}

			{loadingPosts ? (
				<div className="glass-panel rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400">
					Loading threads...
				</div>
			) : filteredPosts.length === 0 ? (
				<div className="glass-panel rounded-2xl p-8 text-center">
					<MessageSquare size={32} className="mx-auto text-slate-400 mb-3" />
					<p className="text-slate-700 dark:text-slate-300 font-semibold">
						{searchTerm ? 'No threads match your search.' : 'No threads yet.'}
					</p>
					<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Start the first conversation for this course.</p>
				</div>
			) : (
				<div className="space-y-4">
					{filteredPosts.map((post) => {
						const isAuthor = currentUser?.id === post.author?.id;
						const canDelete = isAuthor || isUserModerator;
						const postReplies = repliesByPost[post.id] || [];
						const isExpanded = expandedPostId === post.id;
						const isLocked = post.status === 'locked';
						const isHidden = post.status === 'hidden';

						return (
							<div key={post.id} className="glass-panel rounded-2xl overflow-hidden">
								<div className="px-5 py-4">
									<div className="flex items-start justify-between gap-4">
										<button
											onClick={() => void openThread(post.id)}
											className="flex-1 text-left"
										>
											<div className="flex items-center gap-2 flex-wrap mb-2">
												{post.isPinned && (
													<span className="inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
														<Pin size={12} />
														Pinned
													</span>
												)}
												{isLocked && (
													<span className="inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
														<Lock size={12} />
														Locked
													</span>
												)}
												{isHidden && (
													<span className="inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-1 bg-blue-500/10 text-slate-700 dark:text-slate-300">
														<EyeOff size={12} />
														Hidden
													</span>
												)}
											</div>
											<h3 className="text-lg font-black text-slate-900 dark:text-white">{post.title}</h3>
											<p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">{post.body}</p>
											<div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
												<div className="inline-flex items-center gap-1">
													<img
														src={getAvatarUrl(post.author?.avatarS3Key, post.author?.id)}
														alt={post.author?.displayName || 'User'}
														className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-700"
													/>
													<span className="font-semibold">{post.author?.displayName || 'Unknown User'}</span>
												</div>
												<span>•</span>
												<span>{post.replyCount} replies</span>
												<span>•</span>
												<span>{new Date(post.lastActivityAt).toLocaleString()}</span>
											</div>
										</button>
										<div className="flex items-center gap-1">
											{(isUserModerator || canDelete) && (
												<div className="relative">
													<button
														onClick={() => setActiveMenu(activeMenu === post.id ? null : post.id)}
														className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
													>
														<MoreHorizontal size={16} />
													</button>
													{activeMenu === post.id && (
														<div className="absolute right-0 mt-1 w-44 glass-panel rounded-lg z-20">
															{isUserModerator && (
																<>
																	<button
																		onClick={() =>
																			handlePostStatus(
																				post.id,
																				post.status === 'hidden' ? 'visible' : 'hidden',
																				post.status === 'hidden' ? 'Unhide this thread?' : 'Hide this thread?',
																			)
																		}
																		disabled={moderationLoading === post.id}
																		className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
																	>
																		{post.status === 'hidden' ? <Eye size={14} /> : <EyeOff size={14} />}
																		{post.status === 'hidden' ? 'Unhide Thread' : 'Hide Thread'}
																	</button>
																	<button
																		onClick={() =>
																			handlePostStatus(
																				post.id,
																				post.status === 'locked' ? 'visible' : 'locked',
																				post.status === 'locked'
																					? 'Unlock this thread?'
																					: "Lock this thread? New replies won't be allowed.",
																			)
																		}
																		disabled={moderationLoading === post.id}
																		className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-2"
																	>
																		{post.status === 'locked' ? <Unlock size={14} /> : <Lock size={14} />}
																		{post.status === 'locked' ? 'Unlock Thread' : 'Lock Thread'}
																	</button>
																</>
															)}
															{canDelete && (
																<button
																	onClick={() => handleDeletePost(post.id)}
																	disabled={moderationLoading === post.id}
																	className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center gap-2"
																>
																	<Trash2 size={14} />
																	Delete Thread
																</button>
															)}
														</div>
													)}
												</div>
											)}
											<button
												onClick={() => void openThread(post.id)}
												className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
											>
												{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
											</button>
										</div>
									</div>
								</div>

								{isExpanded && (
									<div className="px-5 pb-5 border-t border-slate-200/60 dark:border-blue-500/15 bg-blue-50/20 dark:bg-blue-950/20">
										<div className="pt-4 space-y-4">
											<h4 className="font-bold text-slate-900 dark:text-white">
												Replies {loadingRepliesForPost === post.id ? '(loading...)' : `(${postReplies.length})`}
											</h4>

											{postReplies.length === 0 && loadingRepliesForPost !== post.id ? (
												<p className="text-sm text-slate-500 dark:text-slate-400">
													No replies yet.
												</p>
											) : (
												postReplies.map((reply) => renderReply(post.id, reply))
											)}

											{isLocked ? (
												<div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300 inline-flex items-center gap-2">
													<Lock size={14} />
													This thread is locked. New replies are disabled.
												</div>
											) : (
												<div className="glass-panel rounded-xl p-3">
													{replyTargetByPost[post.id] && (
														<div className="mb-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2">
															<span>
																Replying to <b>{replyTargetByPost[post.id]?.author?.displayName}</b>
															</span>
															<button
																onClick={() =>
																	setReplyTargetByPost((prev) => ({ ...prev, [post.id]: null }))
																}
																className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
															>
																Cancel
															</button>
														</div>
													)}
													<textarea
														value={replyDraftByPost[post.id] || ''}
														onChange={(event) =>
															setReplyDraftByPost((prev) => ({
																...prev,
																[post.id]: event.target.value,
															}))
														}
														placeholder="Write your reply..."
														className="glass-control w-full min-h-[90px] px-3 py-2 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
													<div className="mt-2 flex justify-end">
														<button
															onClick={() => void handleCreateReply(post.id)}
															disabled={submittingReplyForPost === post.id}
															className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
														>
															<Send size={14} />
															{submittingReplyForPost === post.id ? 'Sending...' : 'Reply'}
														</button>
													</div>
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					<button
						onClick={() => setPage((prev) => Math.max(1, prev - 1))}
						disabled={page === 1}
						className="glass-button-secondary px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
					>
						Previous
					</button>
					<span className="text-sm text-slate-600 dark:text-slate-400">
						Page {page} of {totalPages}
					</span>
					<button
						onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
						disabled={page === totalPages}
						className="glass-button-secondary px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
}
