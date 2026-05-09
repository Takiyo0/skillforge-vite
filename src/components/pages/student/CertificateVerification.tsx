import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QrCode, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@skillforge/vite/lib/api';
import type { CertificateVerificationResponse } from '@skillforge/vite/lib/types';

export function CertificateVerification() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [verificationResult, setVerificationResult] = useState<CertificateVerificationResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const verifyFromQR = async () => {
			try {
				setLoading(true);
				const payload = searchParams.get('payload');

				if (!payload) {
					setError('No verification payload found in URL');
					setLoading(false);
					return;
				}

				// Decode base64 payload
				let decodedPayload: any;
				try {
					const decodedString = atob(payload);
					decodedPayload = JSON.parse(decodedString);
				} catch (e) {
					setError('Invalid verification payload format');
					setLoading(false);
					return;
				}

				// Extract verification code
				const verificationCode = decodedPayload.verificationCode;
				if (!verificationCode) {
					setError('Verification code not found in payload');
					setLoading(false);
					return;
				}

				// Verify certificate
				const result = await apiClient.verifyCertificate(verificationCode);
				setVerificationResult(result);
			} catch (err) {
				const apiError = err as any;
				setError(apiError.message || 'Failed to verify certificate');
				console.error('Verification error:', err);
			} finally {
				setLoading(false);
			}
		};

		verifyFromQR();
	}, [searchParams]);

	if (loading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-center">
					<div className="inline-block w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-blue-500/30 animate-spin mb-4">
						<QrCode />
					</div>
					<p className="text-slate-600 dark:text-slate-400 text-lg font-medium">Verifying certificate...</p>
					<p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Please wait</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="max-w-md w-full">
					<div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-8 text-center">
						<XCircle size={64} className="mx-auto text-red-500 mb-4" />
						<h1 className="text-2xl font-black text-red-300 mb-2">Verification Failed</h1>
						<p className="text-red-200 mb-6">{error}</p>
						<button
							onClick={() => navigate('/')}
							className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold transition-colors"
						>
							Back to Home
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (!verificationResult) {
		return (
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="max-w-md w-full">
					<div className="glass-panel rounded-2xl p-8 text-center">
						<p className="text-slate-600 dark:text-slate-400">No verification result</p>
					</div>
				</div>
			</div>
		);
	}

	if (!verificationResult.isValid) {
		return (
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="max-w-md w-full">
					<div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-8 text-center">
						<XCircle size={64} className="mx-auto text-red-500 mb-4" />
						<h1 className="text-2xl font-black text-red-300 mb-2">Invalid Certificate</h1>
						<p className="text-red-200 mb-6">{verificationResult.message || 'This certificate could not be verified'}</p>
						<button
							onClick={() => navigate('/')}
							className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold transition-colors"
						>
							Back to Home
						</button>
					</div>
				</div>
			</div>
		);
	}

	const cert = verificationResult.certificate;
	if (!cert) {
		return (
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="max-w-md w-full">
					<div className="glass-panel rounded-2xl p-8 text-center">
						<p className="text-slate-600 dark:text-slate-400">Certificate data not found</p>
					</div>
				</div>
			</div>
		);
	}

	const issuedDate = new Date(cert.issuedAt);
	const completedDate = new Date(cert.completedAt);

	return (
		<div className="flex-1 flex items-center justify-center p-8">
			<div className="max-w-2xl w-full">
				{/* Success Header */}
				<div className="text-center mb-8">
					<div className="inline-block mb-4">
						<CheckCircle size={80} className="text-green-500" />
					</div>
					<h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
						Certificate Verified ✓
					</h1>
					<p className="text-slate-600 dark:text-slate-400 text-lg">
						This is a valid and authentic certificate
					</p>
				</div>

				{/* Certificate Details Card */}
				<div className="glass-panel-strong border border-emerald-300/35 dark:border-emerald-500/25 rounded-2xl p-8 mb-8">
					{/* Learner */}
					<div className="mb-8 pb-8 border-b-2 border-green-200 dark:border-green-700">
						<p className="text-xs text-green-700 dark:text-green-300 uppercase font-bold tracking-wider mb-2">
							Learner
						</p>
						<p className="text-3xl font-black text-slate-900 dark:text-white">
							{cert.userName}
						</p>
					</div>

					{/* Course */}
					<div className="mb-8 pb-8 border-b-2 border-green-200 dark:border-green-700">
						<p className="text-xs text-green-700 dark:text-green-300 uppercase font-bold tracking-wider mb-2">
							Course Completed
						</p>
						<p className="text-2xl font-black text-slate-900 dark:text-white mb-3">
							{cert.courseName}
						</p>
						<div className="flex items-center space-x-3">
							<span className="inline-block px-3 py-1 text-xs font-bold uppercase rounded-lg bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-300">
								{cert.courseLevel}
							</span>
						</div>
					</div>

					{/* Dates */}
					<div className="grid grid-cols-2 gap-6">
						<div>
							<p className="text-xs text-green-700 dark:text-green-300 uppercase font-bold tracking-wider mb-2">
								Completed On
							</p>
							<p className="text-lg font-black text-slate-900 dark:text-white">
								{completedDate.toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
								})}
							</p>
						</div>
						<div>
							<p className="text-xs text-green-700 dark:text-green-300 uppercase font-bold tracking-wider mb-2">
								Issued On
							</p>
							<p className="text-lg font-black text-slate-900 dark:text-white">
								{issuedDate.toLocaleDateString('en-US', {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
								})}
							</p>
						</div>
					</div>
				</div>

				{/* Certificate Code */}
				<div className="glass-panel rounded-xl p-6 mb-8">
					<p className="text-xs text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider mb-3">
						Certificate Code
					</p>
					<p className="font-mono text-lg font-bold text-slate-900 dark:text-white break-all">
						{cert.certificateCode}
					</p>
				</div>

				{/* Actions */}
				<div className="flex flex-col sm:flex-row gap-4">
					<button
						onClick={() => navigate('/')}
						className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-black text-sm transition-colors"
					>
						Return Home
					</button>
					<button
						onClick={() => navigate(`/student/certificates/${cert.id}`)}
						className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-sm transition-colors"
					>
						View Full Certificate
					</button>
				</div>
			</div>
		</div>
	);
}
