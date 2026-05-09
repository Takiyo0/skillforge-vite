import { useCallback, useEffect, useState } from 'react';
import {
	Send,
	MoreHorizontal,
	Trash2,
	Lock,
	Eye,
	EyeOff,
	X,
	CornerDownRight,
	Clock3,
	Pin,
	AlertCircle,
	MessageSquare,
} from 'lucide-react';
import { apiClient } from '@skillforge/vite/lib/api';
import type { User as UserType } from '@skillforge/vite/lib/types';
import { isAdmin } from '@skillforge/vite/lib/roles';
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

interface ForumThreadViewProps {
	forumId: string; // This is the post ID
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function ForumThreadView({
	forumId,
}: ForumThreadViewProps) {
	const [post, setPost] = useState<ForumPost | null>(null);
	const [replies, setReplies] = useState<ForumReply[]>([]);
	const [loading, setLoading] = useState(true);
	const [submittingReply, setSubmittingReply] = useState(false);
	const [moderationLoading, setModerationLoading] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [replyDraft, setReplyDraft] = useState('');
	const [replyTarget, setReplyTarget] = useState<ForumReply | null>(null);
	const [currentUser, setCurrentUser] = useState<UserType | null>(null);
	const [activeMenu, setActiveMenu] = useState<string | null>(null);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const user = await apiClient.getProfile();
				if (user) setCurrentUser(user);
			} catch {
				// user not logged in, that's fine
			}
		};
		fetchUser();
	}, []);

	useEffect(() => {
		const fetchPostAndReplies = async () => {
			try {
				setLoading(true);
				setError(null);

				// fetch post-details
				const postData = await apiClient.getForumPost(forumId);
				if (postData) {
					setPost(postData);
				}

				// fetch replies
				const repliesResponse = await apiClient.getForumReplies(forumId);
				if (repliesResponse && 'data' in repliesResponse) {
					setReplies(Array.isArray(repliesResponse.data) ? repliesResponse.data : []);
				} else if (Array.isArray(repliesResponse)) {
					setReplies(repliesResponse);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to load thread');
			} finally {
				setLoading(false);
			}
		};

		if (forumId) {
			fetchPostAndReplies();
		}
	}, [forumId]);

	const isModerator = useCallback((): boolean => {
		return isAdmin(currentUser);
	}, [currentUser]);

	const canDeleteItem = useCallback(
		(itemAuthorId: string): boolean => {
			if (!currentUser) return false;
			if (isModerator()) return true;
			return itemAuthorId === currentUser.id;
		},
		[currentUser, isModerator]
	);

	const handleReply = async () => {
		if (!replyDraft.trim() || !post) return;

		try {
			setSubmittingReply(true);
			const response = await apiClient.createForumReply({
				postId: forumId,
				content: replyDraft,
				parentReplyId: replyTarget?.id,
			});

			if (response) {
				// add to replies
				if (replyTarget?.id) {
					// add as child reply
					const updateTree = (replyList: ForumReply[]): ForumReply[] => {
						return replyList.map((r) => {
							if (r.id === replyTarget.id) {
								return {
									...r,
									childReplies: [...(r.childReplies || []), response],
								};
							}
							if (r.childReplies?.length) {
								return {
									...r,
									childReplies: updateTree(r.childReplies),
								};
							}
							return r;
						});
					};
					setReplies(updateTree(replies));
				} else {
					// add as top-level reply
					setReplies([...replies, response]);
				}

				setReplyDraft('');
				setReplyTarget(null);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to post reply');
		} finally {
			setSubmittingReply(false);
		}
	};

	const handleHideReply = async (replyId: string) => {
		if (!isModerator()) return;

		try {
			setModerationLoading(replyId);
			await apiClient.updateForumReplyStatus(replyId, 'hidden');

			const updateTree = (replyList: ForumReply[]): ForumReply[] => {
				return replyList.map((r) => {
					if (r.id === replyId) {
						return { ...r, status: 'hidden' };
					}
					if (r.childReplies?.length) {
						return {
							...r,
							childReplies: updateTree(r.childReplies),
						};
					}
					return r;
				});
			};
			setReplies(updateTree(replies));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to hide reply');
		} finally {
			setModerationLoading(null);
		}
	};

	const handleShowReply = async (replyId: string) => {
		if (!isModerator()) return;

		try {
			setModerationLoading(replyId);
			await apiClient.updateForumReplyStatus(replyId, 'visible');

			const updateTree = (replyList: ForumReply[]): ForumReply[] => {
				return replyList.map((r) => {
					if (r.id === replyId) {
						return { ...r, status: 'visible' };
					}
					if (r.childReplies?.length) {
						return {
							...r,
							childReplies: updateTree(r.childReplies),
						};
					}
					return r;
				});
			};
			setReplies(updateTree(replies));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to show reply');
		} finally {
			setModerationLoading(null);
		}
	};

	const handleDeleteReply = async (replyId: string) => {
		if (!canDeleteItem(replyId)) return;

		try {
			setModerationLoading(replyId);
			await apiClient.deleteForumReply(replyId);

			const updateTree = (replyList: ForumReply[]): ForumReply[] => {
				return replyList
					.map((r) => {
						if (r.id === replyId) {
							return null;
						}
						if (r.childReplies?.length) {
							return {
								...r,
								childReplies: updateTree(r.childReplies),
							};
						}
						return r;
					})
					.filter((r) => r !== null) as ForumReply[];
			};
			setReplies(updateTree(replies));
			setShowDeleteConfirm(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete reply');
		} finally {
			setModerationLoading(null);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-gray-600">Loading thread...</div>
			</div>
		);
	}

	if (!post) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-red-600">Thread not found</div>
			</div>
		);
	}

	const renderReplyTree = (replyList: ForumReply[], depth = 0) => {
		return replyList.map((reply) => (
			<div key={reply.id} className={depth > 0 ? 'border-l-2 border-gray-200 pl-4 ml-4' : ''}>
				{reply.status === 'deleted' ? (
					<div className="py-4 text-gray-400 italic">
						[This reply has been deleted]
					</div>
				) : (
					<div className="bg-white dark:bg-white/10 text-slate-900 dark:text-white rounded-lg p-4 mb-4 border border-gray-500">
						{/* Header */}
						<div className="flex items-start justify-between mb-3">
							<div className="flex items-center gap-3 flex-1">
								{reply.author?.avatarS3Key && (
									<img
										src={getAvatarUrl(reply.author.avatarS3Key)}
										alt={reply.author.displayName}
										className="w-10 h-10 rounded-full"
									/>
								)}
								<div className="flex-1">
									<div className="font-medium text-sm">
										{reply.author?.displayName}
									</div>
									<div className="text-xs text-gray-500">
										{formatDate(reply.createdAt)}
									</div>
								</div>
							</div>

							{/* Status and Menu */}
							<div className="flex items-center gap-2">
								{reply.status === 'hidden' && (
									<span className="inline-flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
										<EyeOff size={12} /> Hidden
									</span>
								)}

								{/* Moderation Menu */}
								{(isModerator() || canDeleteItem(reply.author?.id)) && (
									<div className="relative">
										<button
											onClick={() =>
												setActiveMenu(activeMenu === reply.id ? null : reply.id)
											}
											className="p-1 hover:bg-gray-100 rounded"
										>
											<MoreHorizontal size={16} />
										</button>

										{activeMenu === reply.id && (
											<div className="absolute right-0 top-8 border border-gray-500 rounded-lg shadow-lg z-20 min-w-max">
												{isModerator() && (
													<>
														{reply.status === 'hidden' ? (
															<button
																onClick={() => {
																	handleShowReply(reply.id);
																	setActiveMenu(null);
																}}
																disabled={
																	moderationLoading === reply.id
																}
																className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2 disabled:opacity-50"
															>
																<Eye size={14} /> Show
															</button>
														) : (
															<button
																onClick={() => {
																	handleHideReply(reply.id);
																	setActiveMenu(null);
																}}
																disabled={
																	moderationLoading === reply.id
																}
																className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm flex items-center gap-2 disabled:opacity-50"
															>
																<EyeOff size={14} /> Hide
															</button>
														)}
													</>
												)}

												{canDeleteItem(reply.author?.id) && (
													<button
														onClick={() => {
															setShowDeleteConfirm(reply.id);
															setActiveMenu(null);
														}}
														className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-sm flex items-center gap-2"
													>
														<Trash2 size={14} /> Delete
													</button>
												)}
											</div>
										)}
									</div>
								)}
							</div>
						</div>

						{/* Body */}
						<div className="text-sm text-slate-600 dark:text-slate-400 mb-3 whitespace-pre-wrap">
							{reply.body}
						</div>

						{/* Reply-to-reply button */}
						<button
							onClick={() => setReplyTarget(reply)}
							className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
						>
							<CornerDownRight size={12} /> Reply
						</button>

						{/* Delete Confirmation */}
						{showDeleteConfirm === reply.id && (
							<div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
								<p className="text-red-700 mb-2">Delete this reply?</p>
								<div className="flex gap-2">
									<button
										onClick={() => handleDeleteReply(reply.id)}
										disabled={moderationLoading === reply.id}
										className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
									>
										Delete
									</button>
									<button
										onClick={() => setShowDeleteConfirm(null)}
										className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
									>
										Cancel
									</button>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Nested replies */}
				{reply.childReplies && reply.childReplies.length > 0 && (
					<div className="ml-4">
						{renderReplyTree(reply.childReplies, depth + 1)}
					</div>
				)}
			</div>
		));
	};

	return (
		<div className="space-y-6">
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start gap-2">
					<AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
					<span>{error}</span>
				</div>
			)}

			{/* Original Post */}
			<div className="bg-white dark:bg-white/10 rounded-lg border border-gray-500 text-slate-900 dark:text-white p-6">
				{/* Header */}
				<div className="flex items-start justify-between mb-4">
					<div className="flex-1">
						<h1 className="text-2xl font-bold mb-2">{post.title}</h1>
						<div className="flex items-center gap-3">
							{post.author?.avatarS3Key && (
								<img
									src={getAvatarUrl(post.author.avatarS3Key)}
									alt={post.author.displayName}
									className="w-12 h-12 rounded-full"
								/>
							)}
							<div>
								<div className="font-medium">{post.author?.displayName}</div>
								<div className="text-sm text-gray-500">
									{formatDate(post.createdAt)}
								</div>
							</div>
						</div>
					</div>

					{/* Status badges */}
					<div className="flex items-center gap-2 flex-wrap justify-end">
						{post.isPinned && (
							<span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
								<Pin size={12} /> Pinned
							</span>
						)}
						{post.status === 'locked' && (
							<span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2 py-1 rounded">
								<Lock size={12} /> Locked
							</span>
						)}
						{post.status === 'hidden' && (
							<span className="inline-flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded">
								<EyeOff size={12} /> Hidden
							</span>
						)}
					</div>
				</div>

				{/* Body */}
				<div className="text-slate-600 dark:text-slate-400 mb-6 whitespace-pre-wrap leading-relaxed">
					{post.body}
				</div>

				{/* Stats */}
				<div className="flex items-center gap-4 text-sm text-gray-600 border-t pt-4">
					<div className="flex items-center gap-1">
						<MessageSquare size={16} />
						{post.replyCount} {post.replyCount === 1 ? 'reply' : 'replies'}
					</div>
					<div className="flex items-center gap-1">
						<Clock3 size={16} />
						Last activity: {formatDate(post.lastActivityAt)}
					</div>
				</div>
			</div>

			{/* Replies */}
			{replies.length > 0 && (
				<div>
					<h2 className="text-lg font-bold mb-4">
						{replies.length} {replies.length === 1 ? 'reply' : 'replies'}
					</h2>
					<div className="space-y-0">
						{renderReplyTree(replies)}
					</div>
				</div>
			)}

			{/* Reply Form */}
			{post.status !== 'locked' && (
				<div className="bg-white dark:bg-white/10 rounded-lg border border-gray-500 p-6">
					{replyTarget && (
						<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded flex items-start justify-between">
							<div>
								<div className="text-sm font-medium text-blue-900">
									Replying to: <strong>{replyTarget.author?.displayName}</strong>
								</div>
								<div className="text-xs text-blue-700 mt-1 line-clamp-2">
									"{replyTarget.body}"
								</div>
							</div>
							<button
								onClick={() => setReplyTarget(null)}
								className="text-blue-600 hover:text-blue-700"
							>
								<X size={16} />
							</button>
						</div>
					)}

					<textarea
						value={replyDraft}
						onChange={(e) => setReplyDraft(e.target.value)}
						placeholder={
							replyTarget
								? 'Write your reply...'
								: 'Write a reply...'
						}
						className="w-full px-4 py-3 border border-gray-500 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
						rows={4}
					/>

					<button
						onClick={handleReply}
						disabled={!replyDraft.trim() || submittingReply}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
					>
						<Send size={16} />
						{submittingReply ? 'Posting...' : 'Post Reply'}
					</button>
				</div>
			)}

			{post.status === 'locked' && (
				<div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded flex items-center gap-2">
					<Lock size={18} />
					This thread is locked and cannot accept new replies.
				</div>
			)}
		</div>
	);
}
