import { useState } from 'react';
import {
	Shield,
	Search,
	CheckCircle,
	AlertCircle,
} from 'lucide-react';

export function AdminHome() {
	const [qrInput, setQrInput] = useState('');
	const [verificationResult, setVerificationResult] = useState<{ valid: boolean; name: string; course: string; issueDate: string } | null>(null);

	const handleScan = () => {
		if (qrInput.trim()) {
			setVerificationResult({
				valid: true,
				name: 'Shiroko',
				course: 'Frontend Web Development Master',
				issueDate: 'Mar 31, 2026'
			});
		}
	};

	return (
		<div className="space-y-8">
			{/* System Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="p-8 rounded-[2rem] glass-shell relative overflow-hidden group">
					<div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
					<p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Total Users</p>
					<h3 className="text-5xl font-black text-slate-900 dark:text-white">12,457</h3>
				</div>
				<div className="p-8 rounded-[2rem] glass-shell relative overflow-hidden group">
					<div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
					<p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Certificates Issued</p>
					<h3 className="text-5xl font-black text-emerald-500">3,821</h3>
				</div>
				<div className="p-8 rounded-[2rem] glass-shell relative overflow-hidden group">
					<div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
					<p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">System Health</p>
					<h3 className="text-5xl font-black text-blue-600">99.9%</h3>
				</div>
			</div>

			{/* Certificate Verification */}
			<div className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2.5rem] border border-blue-200/60 dark:border-blue-500/15 shadow-xl shadow-blue-950/10 p-8">
				<div className="flex items-center space-x-3 mb-8">
					<div className="w-10 h-10 bg-blue-500/20 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
						<Shield size={24} />
					</div>
					<h2 className="text-2xl font-black text-slate-900 dark:text-white">Verify Certificate</h2>
				</div>

				<div className="space-y-6">
					<div>
						<label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Certificate ID or QR Code</label>
						<div className="flex gap-3">
							<input
								type="text"
								placeholder="Enter Certificate ID (e.g., SKF-8921-XCA)"
								value={qrInput}
								onChange={(e) => setQrInput(e.target.value)}
								className="flex-1 px-6 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
							/>
							<button
								onClick={handleScan}
								className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-wider transition-transform hover:scale-105 shadow-xl shadow-blue-600/30 flex items-center space-x-2"
							>
								<Search size={18} /> <span>Verify</span>
							</button>
						</div>
					</div>

					{verificationResult && (
						<div className={`p-8 rounded-[2rem] border-2 ${verificationResult.valid ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
							<div className="flex items-start space-x-4">
								<div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${verificationResult.valid ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
									{verificationResult.valid ? <CheckCircle size={28} /> : <AlertCircle size={28} />}
								</div>
								<div className="flex-1">
									<h3 className={`font-black text-xl mb-2 ${verificationResult.valid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
										{verificationResult.valid ? '✓ Certificate Valid' : '✗ Certificate Invalid'}
									</h3>
									{verificationResult.valid && (
										<div className="space-y-2 text-slate-700 dark:text-slate-300">
											<p><strong>Name:</strong> {verificationResult.name}</p>
											<p><strong>Course:</strong> {verificationResult.course}</p>
											<p><strong>Issue Date:</strong> {verificationResult.issueDate}</p>
										</div>
									)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* User Management */}
			<div className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2.5rem] border border-blue-200/60 dark:border-blue-500/15 shadow-xl shadow-blue-950/10 p-8">
				<h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Manage Players</h2>

				<div className="overflow-x-auto sm:overflow-visible">
					<table className="min-w-[600px] sm:min-w-0 w-full">
						<thead>
							<tr className="border-b border-blue-200/60 dark:border-blue-500/15">
								<th className="text-left px-4 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">Player</th>
								<th className="text-left px-4 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">Role</th>
								<th className="text-left px-4 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">Level</th>
								<th className="text-left px-4 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">Status</th>
								<th className="text-center px-4 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">Action</th>
							</tr>
						</thead>
						<tbody>
							<tr className="border-b border-blue-200/60 dark:border-blue-500/15 hover:bg-blue-50/60 dark:hover:bg-blue-500/10 transition-colors">
								<td className="px-4 py-4">
									<p className="font-bold text-slate-900 dark:text-white">Shiroko</p>
									<p className="text-sm text-slate-500 dark:text-slate-400">shiroko@example.com</p>
								</td>
								<td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300">Student</td>
								<td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300">Level 12</td>
								<td className="px-4 py-4">
									<span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-widest rounded-lg">Active</span>
								</td>
								<td className="px-4 py-4 text-center">
									<button className="px-4 py-2.5 min-h-[44px] min-w-[44px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-bold text-sm transition-colors">Edit</button>
								</td>
							</tr>

							<tr className="border-b border-blue-200/60 dark:border-blue-500/15 hover:bg-blue-50/60 dark:hover:bg-blue-500/10 transition-colors">
								<td className="px-4 py-4">
									<p className="font-bold text-slate-900 dark:text-white">Hoshino</p>
									<p className="text-sm text-slate-500 dark:text-slate-400">hoshino@example.com</p>
								</td>
								<td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300">Instructor</td>
								<td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300">—</td>
								<td className="px-4 py-4">
									<span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-widest rounded-lg">Active</span>
								</td>
								<td className="px-4 py-4 text-center">
									<button className="px-4 py-2.5 min-h-[44px] min-w-[44px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-bold text-sm transition-colors">Edit</button>
								</td>
							</tr>

							<tr className="hover:bg-blue-50/60 dark:hover:bg-blue-500/10 transition-colors">
								<td className="px-4 py-4">
									<p className="font-bold text-slate-900 dark:text-white">Yuuka</p>
									<p className="text-sm text-slate-500 dark:text-slate-400">yuuka@example.com</p>
								</td>
								<td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300">Admin</td>
								<td className="px-4 py-4 font-bold text-slate-700 dark:text-slate-300">—</td>
								<td className="px-4 py-4">
									<span className="inline-block px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-widest rounded-lg">Active</span>
								</td>
								<td className="px-4 py-4 text-center">
									<button className="px-4 py-2.5 min-h-[44px] min-w-[44px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-bold text-sm transition-colors">Edit</button>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
