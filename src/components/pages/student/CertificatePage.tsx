import {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {Download, CheckCircle, Calendar, Trophy, Share2} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {apiClient} from '@skillforge/vite/lib/api';
import type {Certificate} from '@skillforge/vite/lib/types';

export function CertificatePage() {
    const {certificateId} = useParams<{ certificateId: string }>();
    const navigate = useNavigate();
    const [certificate, setCertificate] = useState<Certificate | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        const fetchCertificate = async () => {
            if (!certificateId) return;

            try {
                setLoading(true);
                const data = await apiClient.getCertificate(certificateId);
                setCertificate(data);
            } catch (err) {
                const apiError = err as any;
                setError(apiError.message || 'Failed to load certificate');
                console.error('Certificate load error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCertificate();
    }, [certificateId]);

    const handleDownload = async () => {
        if (!certificateId) return;

        try {
            setDownloading(true);
            const response = await apiClient.getCertificateDownloadUrl(certificateId);
            // Open download URL in new tab
            window.open(response.downloadUrl, '_blank');
        } catch (err) {
            const apiError = err as any;
            console.error('Download error:', err);
            alert(apiError.message || 'Failed to download certificate');
        } finally {
            setDownloading(false);
        }
    };

    const handleShare = () => {
        if (!certificate) return;

        const shareText = `I just completed the course "${certificate.course.title}" and earned a certificate! Certificate Code: ${certificate.certificateCode}`;

        if (navigator.share) {
            navigator.share({
                title: 'Certificate Achievement',
                text: shareText,
                url: window.location.href,
            }).catch((err) => console.error('Share failed:', err));
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
            alert('Certificate link copied to clipboard!');
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div
                        className="inline-block w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white font-black text-3xl shadow-lg animate-pulse mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Loading certificate...</p>
                </div>
            </div>
        );
    }

    if (error || !certificate) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md">
                    <p className="text-red-300 font-medium mb-4">{error || 'Certificate not found'}</p>
                    <button
                        onClick={() => window.history.back()}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                    >
                        Back
                    </button>
                </div>
            </div>
        );
    }

    const issuedDate = new Date(certificate.issuedAt);

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="p-8 max-w-4xl mx-auto space-y-8">
                {/* Certificate Card - Golden Theme */}
                <div
                    className="glass-widget-shell rounded-[3rem] p-12 relative overflow-hidden">
                    {/* Decorative background */}
                    <div
                        className="absolute top-0 left-0 w-96 h-96 bg-blue-300/18 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                    <div
                        className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-300/18 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

                    <div className="relative z-10">
                        {/* Header */}
                        <div className="text-center mb-12">
                            <Trophy size={48} className="mx-auto text-blue-600 mb-4"/>
                            <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-2">Certificate of
                                Completion</h1>
                            <div
                                className="w-32 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full"></div>
                        </div>

                        {/* Certificate Content */}
                        <div className="space-y-8">
                            {/* This certifies */}
                            <div className="text-center">
                                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium mb-2">This
                                    certifies that</p>
                                <p className="text-4xl font-black text-blue-900 dark:text-blue-300">
                                    {certificate.user.displayName}
                                </p>
                            </div>

                            {/* Course */}
                            <div className="text-center">
                                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium mb-2">has
                                    successfully completed the course</p>
                                <p className="text-3xl font-black text-slate-900 dark:text-white">
                                    {certificate.course.title}
                                </p>
                            </div>

                            {/* Certificate Details */}
                            <div
                                className="grid grid-cols-2 gap-6 pt-8 border-t-2 border-amber-200 dark:border-amber-700">
                                <div className="text-center">
                                    <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider mb-2">Certificate
                                        Code</p>
                                    <p className="text-sm font-mono font-bold text-slate-900 dark:text-white break-all">
                                        {certificate.certificateCode}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider mb-2 flex items-center justify-center space-x-1">
                                        <Calendar size={14}/>
                                        <span>Date Issued</span>
                                    </p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        {issuedDate.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                            </div>

                            {/* Verification Status */}
                            {!certificate.isRevoked && (
                                <div
                                    className="glass-widget-surface rounded-2xl p-4 text-center">
                                    <p className="text-xs text-green-700 dark:text-green-300 uppercase font-bold tracking-wider flex items-center justify-center space-x-1">
                                        <CheckCircle size={14}/>
                                        <span>Certificate Valid</span>
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">This certificate has
                                        not been revoked</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* QR Code & Actions Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* QR Code */}
                    <div className="md:col-span-1">
                        <div
                            className="glass-widget-surface rounded-2xl p-6 text-center">
                            <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider mb-4">Verification
                                QR Code</p>
                            <div className="glass-widget-inset p-4 rounded-xl inline-block">
                                <QRCodeSVG
                                    value={JSON.stringify(certificate.qrPayload)}
                                    size={180}
                                    level="H"
                                    marginSize={12}
                                    bgColor="white"
                                    fgColor="black"
                                />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">Scan to verify
                                certificate</p>
                        </div>
                    </div>

                    {/* Certificate Details */}
                    <div className="md:col-span-2 space-y-4">
                        {/* Learner Info */}
                        <div
                            className="glass-widget-surface rounded-2xl p-6">
                            <h3 className="font-black text-slate-900 dark:text-white mb-4 text-lg">Learner
                                Information</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Name</p>
                                    <p className="text-slate-900 dark:text-white font-bold">{certificate.user.displayName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Email</p>
                                    <p className="text-slate-700 dark:text-slate-300 text-sm">{certificate.user.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Course Info */}
                        <div
                            className="glass-widget-surface rounded-2xl p-6">
                            <h3 className="font-black text-slate-900 dark:text-white mb-4 text-lg">Course Details</h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Course
                                        Title</p>
                                    <p className="text-slate-900 dark:text-white font-bold">{certificate.course.title}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Level</p>
                                    <span
                                        className="inline-block px-3 py-1 text-xs font-bold uppercase rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 mt-1">
										{certificate.course.level}
									</span>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Completed</p>
                                    <p className="text-slate-900 dark:text-white font-bold">
                                        {new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Verification Code */}
                        <div
                            className="glass-widget-surface rounded-2xl p-6">
                            <p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider mb-2">Verification
                                Code</p>
                            <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-all">{certificate.verificationCode}</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:bg-slate-500 text-white px-6 py-3 rounded-xl font-black text-sm transition-colors flex items-center justify-center space-x-2"
                    >
                        <Download size={18}/>
                        <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
                    </button>
                    <button
                        onClick={handleShare}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-sm transition-colors flex items-center justify-center space-x-2"
                    >
                        <Share2 size={18}/>
                        <span>Share Certificate</span>
                    </button>
                    <button
                        onClick={() => navigate(`/student/courses/${certificate.courseId}`)}
                        className="flex-1 bg-slate-700/80 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-black text-sm transition-colors"
                    >
                        View Course
                    </button>
                </div>

                {/* Back Link */}
                <div className="pt-4">
                    <button
                        onClick={() => navigate('/student/profile/me')}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold text-sm transition-colors"
                    >
                        ← Back to Profile
                    </button>
                </div>
            </div>
        </div>
    );
}
