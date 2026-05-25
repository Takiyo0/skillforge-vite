import { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { FlaskConical, Play, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { apiClient } from '@skillforge/vite/lib/api';
import type { SandboxLanguage, SandboxRunResponse } from '@skillforge/vite/lib/types';

interface SandboxCase {
	id: string;
	input: string;
	output: string;
}

const toMonacoLanguage = (language: string): string => {
	switch (language) {
		case 'gcc':
			return 'c';
		case 'cpp':
			return 'cpp';
		default:
			return language;
	}
};

export function CodePlayground() {
	const [languages, setLanguages] = useState<SandboxLanguage[]>([]);
	const [language, setLanguage] = useState('javascript');
	const [code, setCode] = useState('');
	const [cases, setCases] = useState<SandboxCase[]>([
		{ id: crypto.randomUUID(), input: '', output: '' },
	]);
	const [result, setResult] = useState<SandboxRunResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				const serverLanguages = await apiClient.getSandboxLanguages(true);
				setLanguages(serverLanguages);
				if (serverLanguages.length > 0) {
					const defaultLang = serverLanguages[0];
					setLanguage(defaultLang.id);
					setCode(defaultLang.baseCode || '');
				}
			} catch (err) {
				setError((err as Error).message || 'Failed to load sandbox languages');
			} finally {
				setLoading(false);
			}
		};
		void load();
	}, []);

	const selectedLanguage = useMemo(
		() => languages.find((item) => item.id === language),
		[languages, language]
	);

	const onChangeLanguage = (nextLanguage: string) => {
		setLanguage(nextLanguage);
		const lang = languages.find((item) => item.id === nextLanguage);
		if (lang?.baseCode) {
			setCode(lang.baseCode);
		}
	};

	const addCase = () => {
		setCases((prev) => [...prev, { id: crypto.randomUUID(), input: '', output: '' }]);
	};

	const removeCase = (id: string) => {
		setCases((prev) => (prev.length === 1 ? prev : prev.filter((item) => item.id !== id)));
	};

	const updateCase = (id: string, key: 'input' | 'output', value: string) => {
		setCases((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
	};

	const run = async () => {
		if (!code.trim()) {
			setError('Code is required');
			return;
		}
		try {
			setRunning(true);
			setError(null);
			const payloadCases = cases.map((item) => ({
				input: item.input,
				output: item.output.trim() === '' ? undefined : item.output,
			}));
			const executionResult = await apiClient.runCodeSandbox(code, language, payloadCases);
			setResult(executionResult);
		} catch (err) {
			setError((err as Error).message || 'Failed to run code');
		} finally {
			setRunning(false);
		}
	};

	if (loading) {
		return <div className="flex-1 flex items-center justify-center text-slate-500">Loading code sandbox...</div>;
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-5">
				<div className="glass-widget-surface rounded-2xl p-5 md:p-6 border border-white/20 dark:border-white/10">
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
						<div>
							<div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-300 mb-2">
								<FlaskConical size={14} />
								Misc Tool
							</div>
							<h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Code Sandbox</h1>
							<p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
								Run quick experiments with custom test cases.
							</p>
						</div>
						<div className="w-full md:w-64">
							<label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
								Language
							</label>
							<select
								value={language}
								onChange={(e) => onChangeLanguage(e.target.value)}
								className="w-full rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-slate-100"
							>
								{languages.map((item) => (
									<option key={item.id} value={item.id}>
										{item.name}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
					<div className="xl:col-span-3 glass-widget-surface rounded-2xl border border-white/20 dark:border-white/10 overflow-hidden">
						<div className="px-4 py-3 border-b border-white/20 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Editor · {selectedLanguage?.name ?? language}
						</div>
						<Editor
							height="560px"
							language={toMonacoLanguage(language)}
							value={code}
							onChange={(value) => setCode(value || '')}
							theme="vs-dark"
							options={{
								minimap: { enabled: false },
								fontSize: 14,
								wordWrap: 'on',
							}}
						/>
					</div>

					<div className="xl:col-span-2 space-y-4">
						<div className="glass-widget-surface rounded-2xl border border-white/20 dark:border-white/10 p-4">
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Test Cases</h2>
								<button
									onClick={addCase}
									className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white"
								>
									<Plus size={14} />
									Add
								</button>
							</div>
							<div className="space-y-3 max-h-[360px] overflow-auto pr-1">
								{cases.map((item, index) => (
									<div key={item.id} className="rounded-2xl border border-white/20 dark:border-white/10 p-3 bg-white/50 dark:bg-slate-900/40">
										<div className="flex items-center justify-between mb-2">
											<p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
												Case {index + 1}
											</p>
											<button
												onClick={() => removeCase(item.id)}
												className="text-slate-500 hover:text-red-500"
												aria-label={`Remove case ${index + 1}`}
											>
												<Trash2 size={14} />
											</button>
										</div>
										<textarea
											value={item.input}
											onChange={(e) => updateCase(item.id, 'input', e.target.value)}
											placeholder="Input"
											className="w-full mb-2 min-h-16 rounded-2xl text-xs font-mono p-2 border border-white/20 dark:border-white/10 bg-white/70 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100"
										/>
										<textarea
											value={item.output}
											onChange={(e) => updateCase(item.id, 'output', e.target.value)}
											placeholder="Expected output (optional)"
											className="w-full min-h-14 rounded-2xl text-xs font-mono p-2 border border-white/20 dark:border-white/10 bg-white/70 dark:bg-slate-950/60 text-slate-900 dark:text-slate-100"
										/>
									</div>
								))}
							</div>
							<button
								onClick={run}
								disabled={running}
								className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60 text-white font-black text-sm"
							>
								<Play size={16} />
								{running ? 'Running...' : 'Run Code'}
							</button>
							{error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
						</div>

						<div className="glass-widget-surface rounded-2xl border border-white/20 dark:border-white/10 p-4">
							<h2 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3">Results</h2>
							{!result ? (
								<p className="text-sm text-slate-500 dark:text-slate-400">No run yet.</p>
							) : (
								<div className="space-y-3 max-h-[340px] overflow-auto pr-1">
									{result.results.map((item) => (
										<div key={item.index} className="rounded-2xl border border-white/20 dark:border-white/10 p-3 bg-white/50 dark:bg-slate-900/40">
											<div className="flex items-center justify-between mb-2">
												<p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
													Case {item.index + 1}
												</p>
												<span className={`inline-flex items-center gap-1 text-xs font-bold ${item.passed ? 'text-emerald-600' : 'text-red-600'}`}>
													{item.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
													{item.passed ? 'Passed' : 'Failed'}
												</span>
											</div>
											<pre className="text-xs font-mono whitespace-pre-wrap break-words text-slate-800 dark:text-slate-100">{item.actualOutput || '(no output)'}</pre>
											{item.isCorrect !== null && (
												<p className={`mt-2 text-xs font-semibold ${item.isCorrect ? 'text-emerald-600' : 'text-amber-600'}`}>
													{item.isCorrect ? 'Output matches expected' : 'Output does not match expected'}
												</p>
											)}
											{item.stderr && <pre className="mt-2 text-xs font-mono whitespace-pre-wrap break-words text-red-600">{item.stderr}</pre>}
											{item.compileOutput && <pre className="mt-2 text-xs font-mono whitespace-pre-wrap break-words text-orange-600">{item.compileOutput}</pre>}
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
