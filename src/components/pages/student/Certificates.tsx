import {useState, useEffect} from 'react';
import {Award, Sparkles, Lock} from 'lucide-react';
import {apiClient} from '@skillforge/vite/lib/api';
import {getSeededColor, getBadgeIcon} from '@skillforge/vite/lib/s3';
import type {Certificate} from '@skillforge/vite/lib/types';

export function Certificates() {
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [badges, setBadges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [certsData, badgesData] = await Promise.all([
                    apiClient.getCertificates(),
                    apiClient.getBadges(),
                ]);
                setCertificates(certsData.data || []);
                setBadges(badgesData.badges || []);
            } catch (error) {
                console.error('Failed to fetch certificates/badges:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCertificateClick = (id: string) => {
        window.location.href = `/student/certificates/${id}`;
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div
                        className="inline-block w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-blue-500/30 animate-spin mb-4">
                        S
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Loading trophy room...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-8 space-y-12">
                {/* Header */}
                <div className="flex items-center space-x-4 mb-8">
                    <div
                        className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center">
                        <Award size={24}/>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">Trophy Room</h1>
                </div>

                {/* Certificates Section */}
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center space-x-2">
                        <Sparkles size={28} className="text-amber-500"/>
                        <span>Your Certificates</span>
                    </h2>

                    {certificates.length === 0 ? (
                        <div
                            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-dashed border-blue-200/40 dark:border-blue-400/20 rounded-2xl p-12 text-center shadow-xl shadow-blue-950/5">
                            <Award size={48} className="mx-auto mb-4 text-slate-400"/>
                            <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                                No certificates yet. Complete courses to earn your first trophy!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {certificates.map((cert) => (
                                <button
                                    key={cert.id}
                                    onClick={() => handleCertificateClick(cert.id)}
                                    className="group text-left bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-amber-200/40 dark:border-amber-400/20 rounded-2xl p-6 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer shadow-xl shadow-blue-950/5"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div
                                            className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Award size={24}/>
                                        </div>
                                        <span
                                            className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-3 py-1 rounded-full">
											{cert.course.level}
										</span>
                                    </div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-lg mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        {cert.course.title}
                                    </h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        Completed on{' '}
                                        {new Date(cert.issuedAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </p>
                                    <div className="flex items-center justify-between">
										<span className="text-xs font-mono text-slate-500 dark:text-slate-400">
											{cert.certificateCode}
										</span>
                                        <span
                                            className="text-sm font-black text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
											→
										</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Badges Section */}
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center space-x-2">
                        <Sparkles size={28} className="text-blue-500"/>
                        <span>Your Badges</span>
                    </h2>

                    {badges.length === 0 ? (
                        <div
                            className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-dashed border-blue-200/40 dark:border-blue-400/20 rounded-2xl p-12 text-center shadow-xl shadow-blue-950/5">
                            <Lock size={48} className="mx-auto mb-4 text-slate-400"/>
                            <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">
                                Earn badges by completing achievements and milestones!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {badges.map((badge) => (
                                <div
                                    key={badge.badgeId}
                                    className="group bg-gradient-to-br p-6 rounded-2xl border-2 transition-all hover:shadow-lg backdrop-blur-xl shadow-lg shadow-blue-950/5"
                                    style={{
                                        background: `linear-gradient(to bottom right, ${getSeededColor(badge.badgeId)}20, ${getSeededColor(badge.badgeId)}10)`,
                                        borderColor: `${getSeededColor(badge.badgeId)}50`,
                                    }}
                                >
                                    <div className="text-4xl mb-3 flex justify-center">
                                        {getBadgeIcon(badge.iconS3Key, badge.badgeId)}
                                    </div>
                                    <h3 className="font-black text-slate-900 dark:text-white text-center mb-1">
                                        {badge.name}
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 text-center mb-3">
                                        {badge.description}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-500 text-center">
                                        {new Date(badge.awardedAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
