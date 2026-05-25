import {useCallback, useEffect, useState} from 'react';
import {
    Activity,
    ArrowUpRight,
    Flame,
    Medal,
    RefreshCw,
    Shield,
    Sparkles,
    Timer,
    Trophy,
    Users,
    Zap,
} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import {getAvatarUrl} from '@skillforge/vite/lib/s3';
import type {GlobalLeaderboardResponse, LeaderboardEntry, LeaderboardPeriod} from '@skillforge/vite/lib/types';
import {StateCard, Tabs} from '@skillforge/vite/components/ui/controls';
import {UserProfileLink} from '@skillforge/vite/components/ui/UserProfileLink';

const LEADERBOARD_LIMIT = 100;

const PERIOD_TABS: Array<{ value: LeaderboardPeriod; label: string }> = [
    {value: 'weekly', label: 'Weekly Sprint'},
    {value: 'all_time', label: 'All-Time Hall'},
];

function formatNumber(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function formatCountdown(seconds: number | null): string {
    if (seconds === null) return 'Not scheduled';

    const safeSeconds = Math.max(0, seconds);
    const days = Math.floor(safeSeconds / 86400);
    const hours = Math.floor((safeSeconds % 86400) / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
    return `${minutes}m ${remainingSeconds}s`;
}

function formatDateTime(value?: string): string {
    if (!value) return 'Unknown';

    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function rankTone(rank: number): string {
    if (rank === 1) return 'from-amber-300 via-orange-400 to-rose-500';
    if (rank === 2) return 'from-slate-200 via-sky-200 to-blue-400';
    if (rank === 3) return 'from-orange-200 via-amber-500 to-yellow-700';
    return 'from-blue-500 to-cyan-400';
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'SF';
}

function Avatar({entry, className = ''}: { entry: LeaderboardEntry; className?: string }) {
    const [failed, setFailed] = useState(false);
    const avatarUrl = getAvatarUrl(entry.avatarS3Key, entry.userId);

    return (
        <div className={`relative shrink-0 overflow-hidden rounded-2xl bg-slate-900/10 dark:bg-white/10 ${className}`}>
            {!failed ? (
                <img
                    src={avatarUrl}
                    alt={entry.displayName}
                    className="h-full w-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                <div
                    className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-black text-white">
                    {getInitials(entry.displayName)}
                </div>
            )}
        </div>
    );
}

function RankBadge({rank}: { rank: number }) {
    const Icon = rank <= 3 ? Medal : Trophy;

    return (
        <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${rankTone(rank)} text-white shadow-lg`}>
            {rank <= 3 ? <Icon size={20}/> : <span className="text-sm font-black">#{rank}</span>}
        </div>
    );
}

function LeaderboardRow({entry, isMe}: { entry: LeaderboardEntry; isMe: boolean }) {
    return (
        <div
            className={`grid grid-cols-1 gap-4 rounded-2xl border p-4 transition-all sm:grid-cols-[auto_1fr_auto] sm:items-center ${
                isMe
                    ? 'border-cyan-300/50 bg-cyan-400/12 shadow-lg shadow-cyan-500/10'
                    : 'border-blue-300/14 bg-white/46 hover:-translate-y-0.5 hover:bg-white/66 dark:bg-slate-950/34 dark:hover:bg-slate-900/54'
            }`}
        >
            <div className="flex items-center gap-3">
                <RankBadge rank={entry.rank}/>
                <Avatar entry={entry} className="h-12 w-12"/>
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="line-clamp-1 font-black text-slate-950 dark:text-white">
                            <UserProfileLink userId={entry.userId} className="hover:underline">
                                {entry.displayName}
                            </UserProfileLink>
                        </h3>
                        {isMe && (
                            <span
                                className="rounded-full bg-cyan-400/16 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-200">
                                You
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Level {entry.level} challenger
                    </p>
                </div>
            </div>

            <div className="gap-2 flex flex-wrap">
                <Stat label="Score" value={formatNumber(entry.score)}/>
                <Stat label="XP" value={formatNumber(entry.xpPoints)}/>
                <Stat label="Current" value={`${entry.currentStreakDays}d`}/>
                <Stat label="Best" value={`${entry.longestStreakDays}d`}/>
            </div>

            <UserProfileLink
                userId={entry.userId}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-300/20 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-700 transition-all hover:-translate-y-px dark:text-blue-200"
            >
                Profile
                <ArrowUpRight size={16}/>
            </UserProfileLink>
        </div>
    );
}

function Stat({label, value}: { label: string; value: string | number }) {
    return (
        <div className="rounded-2xl bg-slate-950/[0.04] px-3 py-2 dark:bg-white/[0.05]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-0.5 text-sm font-black text-slate-950 dark:text-white">{value}</p>
        </div>
    );
}

function MyRankPanel({entry}: { entry: LeaderboardEntry | null }) {
    if (!entry) {
        return (
            <div className="glass-panel sticky top-0 rounded-2xl p-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-500/12 text-slate-500">
                    <Activity size={24}/>
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">Not ranked yet</h2>
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Earn XP in this period to enter the arena.
                </p>
            </div>
        );
    }

    return (
        <div className="glass-panel sticky top-0 overflow-hidden rounded-2xl p-6">
            <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-400/20 blur-2xl"/>
            <div className="relative">
                <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-600 dark:text-cyan-300">Your
                    Rank</p>
                <div className="mt-4 flex items-center gap-4">
                    <RankBadge rank={entry.rank}/>
                    <Avatar entry={entry} className="h-14 w-14"/>
                    <div className="min-w-0">
                        <h2 className="line-clamp-1 text-xl font-black text-slate-950 dark:text-white">{entry.displayName}</h2>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Level {entry.level}</p>
                    </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <Stat label="Score" value={formatNumber(entry.score)}/>
                    <Stat label="XP" value={formatNumber(entry.xpPoints)}/>
                    <Stat label="Current" value={`${entry.currentStreakDays}d`}/>
                    <Stat label="Best" value={`${entry.longestStreakDays}d`}/>
                </div>
            </div>
        </div>
    );
}

export function Leaderboard() {
    const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
    const [data, setData] = useState<GlobalLeaderboardResponse | null>(null);
    const [resetSeconds, setResetSeconds] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadLeaderboard = useCallback(async (selectedPeriod: LeaderboardPeriod, quiet = false) => {
        try {
            if (quiet) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);

            const response = await apiClient.getGlobalLeaderboard({
                period: selectedPeriod,
                limit: LEADERBOARD_LIMIT,
            });

            setData(response);
            setResetSeconds(
                response.period === 'weekly' && typeof response.resetInSeconds === 'number'
                    ? response.resetInSeconds
                    : null,
            );
        } catch (err) {
            const apiError = err as { message?: string };
            setError(apiError.message || 'Failed to load leaderboard.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadLeaderboard(period);
    }, [loadLeaderboard, period]);

    useEffect(() => {
        if (period !== 'weekly' || resetSeconds === null) return;

        const timer = window.setInterval(() => {
            setResetSeconds((current) => {
                if (current === null) return current;
                if (current <= 1) {
                    window.clearInterval(timer);
                    void loadLeaderboard('weekly', true);
                    return 0;
                }
                return current - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [loadLeaderboard, period, resetSeconds]);

    const myUserId = data?.myRank?.userId;

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <StateCard
                    title="Loading leaderboard..."
                    description="Synchronizing scores from the arena."
                    icon={<Trophy size={26}/>}
                />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl space-y-6 px-3 py-4 sm:px-5 md:px-8">
                <section
                    className="relative overflow-hidden rounded-2xl border border-blue-300/20 bg-slate-950 p-5 text-white shadow-2xl shadow-blue-950/20 sm:p-7 md:p-8">
                    <div className="absolute -left-20 top-8 h-72 w-72 rounded-full bg-blue-500/28 blur-3xl"/>
                    <div className="absolute -right-16 -top-20 h-80 w-80 rounded-full bg-cyan-400/22 blur-3xl"/>
                    <div
                        className="absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent"/>

                    <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
                        <div>
                            <div
                                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-cyan-100">
                                <Sparkles size={15}/>
                                SkillForge Arena
                            </div>
                            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
                                Climb the board. Hold the forge.
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-blue-100/80 sm:text-base">
                                Scores combine XP, levels, and learning momentum into one competitive snapshot.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 h-full">
                            <div className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-blue-100/70">
                                            {period === 'weekly' ? 'Weekly reset' : 'Board updated'}
                                        </p>
                                        <p className="mt-1 text-2xl font-black">
                                            {period === 'weekly' ? formatCountdown(resetSeconds) : formatDateTime(data?.generatedAt)}
                                        </p>
                                    </div>
                                    <Timer className="text-cyan-200" size={28}/>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div
                                    className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
                                    <Users size={18} className="text-cyan-200"/>
                                    <p className="mt-2 text-2xl font-black">{formatNumber(data?.totalParticipants)}</p>
                                    <p className="text-xs font-black uppercase tracking-widest text-blue-100/70">Players</p>
                                </div>
                                <div
                                    className="rounded-2xl border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
                                    <Trophy size={18} className="text-amber-200"/>
                                    <p className="mt-2 text-2xl font-black">{formatNumber(data?.maxEntries)}</p>
                                    <p className="text-xs font-black uppercase tracking-widest text-blue-100/70">Slots</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Tabs
                        tabs={PERIOD_TABS}
                        value={period}
                        onValueChange={(value) => setPeriod(value as LeaderboardPeriod)}
                    />
                    <button
                        type="button"
                        onClick={() => void loadLeaderboard(period, true)}
                        disabled={refreshing}
                        className="glass-chip inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''}/>
                        Refresh
                    </button>
                </div>

                {error && (
                    <StateCard
                        title="Unable to load leaderboard"
                        description={error}
                        icon={<Trophy size={26}/>}
                        className="border-red-500/20 bg-red-500/10"
                    />
                )}

                {!error && data && data.leaderboard.length === 0 ? (
                    <StateCard
                        title="The arena is empty"
                        description={period === 'weekly' ? 'No one has scored this week yet. Be the first name on the board.' : 'No all-time scores are available yet.'}
                        icon={<Trophy size={28}/>}
                    />
                ) : data && (
                    <div className="grid gap-6 2xl:grid-cols-[1fr_320px]">
                        <main className="space-y-6">
                            <section className="glass-panel rounded-2xl p-3 sm:p-4">
                                <div
                                    className="flex flex-col gap-2 px-2 py-3 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">
                                            Ranked Challengers
                                        </p>
                                        <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                                            Top {formatNumber(data.count)} of {formatNumber(data.total)}
                                        </h2>
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                        Generated {formatDateTime(data.generatedAt)}
                                    </p>
                                </div>

                                <div className="mt-2 space-y-3">
                                    {data.leaderboard.map((entry) => (
                                        <LeaderboardRow
                                            key={entry.userId}
                                            entry={entry}
                                            isMe={entry.userId === myUserId}
                                        />
                                    ))}
                                </div>
                            </section>
                        </main>

                        <aside className="space-y-4">
                            <MyRankPanel entry={data.myRank}/>
                            <div className="glass-panel rounded-2xl p-5">
                                <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                                    Rule Card
                                </p>
                                <div className="mt-4 space-y-3 text-sm font-medium text-slate-600 dark:text-slate-300">
                                    <p className="flex gap-2">
                                        <Zap size={18} className="mt-0.5 shrink-0 text-amber-500"/>
                                        Score rewards XP, level progress, and learning consistency.
                                    </p>
                                    <p className="flex gap-2">
                                        <Flame size={18} className="mt-0.5 shrink-0 text-orange-500"/>
                                        Weekly sprint resets on the timer above.
                                    </p>
                                    <p className="flex gap-2">
                                        <Shield size={18} className="mt-0.5 shrink-0 text-cyan-500"/>
                                        Showing up to {LEADERBOARD_LIMIT} ranked entries for now.
                                    </p>
                                </div>
                            </div>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}
