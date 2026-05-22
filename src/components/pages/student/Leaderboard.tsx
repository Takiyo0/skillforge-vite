import { useState, useEffect } from 'react';
import { Flame, Trophy, TrendingUp } from 'lucide-react';
import { apiClient } from '@skillforge/vite/lib/api';
import type { User } from '@skillforge/vite/lib/types';
import {UserProfileLink} from '@skillforge/vite/components/ui/UserProfileLink';

interface LeaderboardEntry {
	userId: string;
	displayName: string;
	currentStreakDays: number;
	longestStreakDays: number;
	rank?: number;
}

export function Leaderboard() {
	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const limit = 50;

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);
				setError(null);

				// Fetch current user and leaderboard in parallel
				const [user, leaderboardData] = await Promise.all([
					apiClient.getProfile().catch(() => null),
					apiClient.getStreakLeaderboard(limit),
				]);

				setCurrentUser(user);

				if (Array.isArray(leaderboardData)) {
					const entriesWithRank = leaderboardData.map((entry: any, index: number) => ({
						...entry,
						rank: index + 1,
					}));
					setLeaderboard(entriesWithRank);
				}
			} catch (err) {
				console.error('Failed to fetch leaderboard:', err);
				setError('Failed to load leaderboard. Please try again.');
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	const getMedalEmoji = (rank: number) => {
		switch (rank) {
			case 1:
				return '🥇';
			case 2:
				return '🥈';
			case 3:
				return '🥉';
			default:
				return null;
		}
	};

	const isCurrentUser = (userId: string) => currentUser?.id === userId;

	if (loading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-blue-500/30 animate-spin mb-4">
						S
					</div>
					<p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Loading leaderboard...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="max-w-6xl mx-auto p-8 space-y-8">
				{/* Header */}
				<div className="flex items-center space-x-4">
					<div className="w-12 h-12 bg-yellow-500/20 text-yellow-500 rounded-2xl flex items-center justify-center">
						<Trophy size={24} />
					</div>
					<div>
						<h1 className="text-3xl font-black text-slate-900 dark:text-white">Streak Leaderboard</h1>
						<p className="text-slate-600 dark:text-slate-400 text-sm">Who's on the longest learning streak?</p>
					</div>
				</div>

				{error && (
					<div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-600 dark:text-red-400">
						{error}
					</div>
				)}

				{/* Leaderboard Table */}
				<div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-blue-400/20 overflow-hidden shadow-xl shadow-blue-950/5">
					<div className="overflow-x-auto sm:overflow-visible">
						<table className="min-w-[500px] sm:min-w-0 w-full">
							<thead>
								<tr className="border-b border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl">
									<th className="px-6 py-4 text-left text-sm font-black text-slate-900 dark:text-white">
										Rank
									</th>
									<th className="px-6 py-4 text-left text-sm font-black text-slate-900 dark:text-white">
										Player
									</th>
									<th className="px-6 py-4 text-left text-sm font-black text-slate-900 dark:text-white">
										<div className="flex items-center space-x-2">
											<Flame size={16} className="text-orange-500" />
											<span>Current Streak</span>
										</div>
									</th>
									<th className="px-6 py-4 text-left text-sm font-black text-slate-900 dark:text-white">
										<div className="flex items-center space-x-2">
											<TrendingUp size={16} className="text-blue-500" />
											<span>Longest Streak</span>
										</div>
									</th>
								</tr>
							</thead>
							<tbody>
								{leaderboard.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-6 py-12 text-center">
											<p className="text-slate-600 dark:text-slate-400">
												No leaderboard data available yet.
											</p>
										</td>
									</tr>
								) : (
									leaderboard.map((entry) => {
										const medal = getMedalEmoji(entry.rank || 0);
										const isUser = isCurrentUser(entry.userId);
										return (
											<tr
												key={entry.userId}
												className={`border-b border-slate-200 dark:border-slate-700 transition-colors ${
													isUser
														? 'bg-blue-50 dark:bg-blue-900/20'
														: 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
												}`}
											>
												<td className="px-6 py-4">
													<div className="flex items-center space-x-3">
														{medal ? (
															<span className="text-2xl">{medal}</span>
														) : (
															<span className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500/15 text-sm font-bold text-slate-600 dark:text-slate-400">
																#{entry.rank}
															</span>
														)}
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="flex items-center space-x-3">
														<div>
															<p
																className={`font-bold ${
																	isUser
																		? 'text-blue-600 dark:text-blue-400'
																		: 'text-slate-900 dark:text-white'
																}`}
															>
																<UserProfileLink userId={entry.userId} className="hover:underline">
																	{entry.displayName}
																</UserProfileLink>
																{isUser && (
																	<span className="ml-2 text-xs font-bold uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
																		You
																	</span>
																)}
															</p>
														</div>
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="flex items-center space-x-2">
														<Flame size={16} className="text-orange-500" />
														<span className="font-bold text-slate-900 dark:text-white">
															{entry.currentStreakDays}
														</span>
														<span className="text-xs text-slate-500 dark:text-slate-400">days</span>
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="flex items-center space-x-2">
														<TrendingUp size={16} className="text-blue-500" />
														<span className="font-bold text-slate-900 dark:text-white">
															{entry.longestStreakDays}
														</span>
														<span className="text-xs text-slate-500 dark:text-slate-400">days</span>
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
