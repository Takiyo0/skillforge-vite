import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Code, Play, Cpu, Terminal } from 'lucide-react';
import { mockCourses } from '@skillforge/vite/lib/mockData';

export function CodePlayground() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const moduleId = searchParams.get('module') || 'b5';

	const [aiFeedback, setAiFeedback] = useState('');
	const [isAnalyzing, setIsAnalyzing] = useState(false);
	const [code, setCode] = useState('');

	// Find the current project
	const currentProject = mockCourses.flatMap(c => c.modules).find(m => m.id === moduleId);
	const currentCourse = mockCourses.find(c => c.modules.some(m => m.id === moduleId));

	const handleAIReview = () => {
		setIsAnalyzing(true);
		setTimeout(() => {
			setAiFeedback(`AI Review for ${currentProject?.title}: Looking good! Your logic aligns with the quest requirements. Ensure you test edge cases. +50 XP`);
			setIsAnalyzing(false);
		}, 1500);
	};

	if (!currentProject || !currentCourse) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<p className="text-slate-500 dark:text-slate-400">Module not found</p>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-hidden flex flex-col">
			<div className="p-8 space-y-4 h-full flex flex-col overflow-hidden">
				{/* Back Navigation Header */}
				<div className="flex items-center space-x-2 text-sm font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-blue-500 w-fit" onClick={() => navigate('/student/learning-path')}>
					<ChevronRight className="rotate-180" size={16} /> <span>Back to Path</span>
				</div>

				{/* Module Header */}
				<div className="glass-widget-shell flex justify-between items-center p-4 rounded-[2rem] shrink-0">
					<div className="flex items-center space-x-4 pl-4">
						<div className="w-12 h-12 bg-rose-500/20 text-rose-500 dark:text-rose-400 rounded-xl flex items-center justify-center">
							<Code size={24} />
						</div>
						<div>
							<h2 className="font-black text-slate-900 dark:text-white text-xl">{currentProject.title}</h2>
							<p className="text-sm font-medium text-slate-500 dark:text-slate-400">Campaign: {currentCourse.title}</p>
						</div>
					</div>
					<div className="flex space-x-3 pr-2">
						<button className="flex items-center space-x-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl font-black transition-colors">
							<Play size={16} fill="currentColor" /> <span>RUN CODE</span>
						</button>
						<button
							onClick={handleAIReview}
							className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-black transition-all shadow-lg shadow-cyan-500/30"
						>
							<Cpu size={18} /> <span>ASK AI SENSEI</span>
						</button>
					</div>
				</div>

				{/* Editor and Output Layout */}
				<div className="flex-1 flex gap-4 overflow-hidden rounded-[2rem]">
					{/* Editor Area */}
					<div className="glass-widget-dark flex-1 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl shadow-blue-950/20 relative">
						{/* Terminal Header styling */}
						<div className="bg-blue-500/10 px-6 py-3 flex items-center border-b border-blue-200/10 space-x-4 shrink-0">
							<div className="flex space-x-2">
								<div className="w-3 h-3 rounded-full bg-rose-500"></div>
								<div className="w-3 h-3 rounded-full bg-amber-500"></div>
								<div className="w-3 h-3 rounded-full bg-emerald-500"></div>
							</div>
							<div className="flex items-center text-slate-300 text-sm font-mono glass-widget-inset px-4 py-1 rounded-lg">
								<Terminal size={14} className="mr-2" />
								{currentCourse.id === 'ai_ml' ? 'model.js' : 'server.js'}
							</div>
						</div>
						<textarea
							className="flex-1 w-full bg-transparent text-slate-100 p-6 font-mono text-[15px] leading-relaxed resize-none focus:outline-none placeholder:text-slate-500"
							defaultValue={currentProject.codeTemplate || ''}
							value={code}
							onChange={(e) => setCode(e.target.value)}
							placeholder="Write your code here..."
						/>
					</div>

					{/* AI / Output Area */}
					<div className="w-[35%] flex flex-col gap-4 overflow-hidden">
						<div className="glass-widget-dark flex-1 rounded-[2rem] p-6 font-mono text-sm overflow-y-auto flex flex-col relative shadow-2xl shadow-blue-950/20">
							<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-cyan-400"></div>
							<span className="text-emerald-500/50 mb-4 font-bold tracking-widest uppercase text-xs">Console Output</span>
							<div className="text-emerald-400 space-y-2">
								<p className="flex items-center"><ChevronRight size={14} className="mr-1 opacity-50" /> {currentCourse.id === 'ai_ml' ? 'node model.js' : 'nodemon server.js'}</p>
								<p className="flex items-center text-slate-500 italic"><ChevronRight size={14} className="mr-1 opacity-50" /> ... waiting for execution</p>
							</div>
						</div>

						<div className="glass-widget-shell flex-[1.5] rounded-[2rem] p-6 overflow-y-auto flex flex-col relative">
							<div className="flex items-center space-x-3 text-cyan-400 font-black mb-6 uppercase tracking-wider text-sm shrink-0">
								<div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">
									<Cpu size={18} />
								</div>
								<span>AI Sensei Feedback</span>
							</div>

							{isAnalyzing ? (
								<div className="h-full flex flex-col items-center justify-center text-cyan-400">
									<Cpu size={48} className="animate-bounce mb-4 opacity-50" />
									<div className="flex items-center space-x-2">
										<div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div>
										<span className="font-bold tracking-widest uppercase text-sm">Analyzing Code...</span>
									</div>
								</div>
							) : aiFeedback ? (
								<div className="glass-widget-inset p-5 rounded-2xl text-slate-100 leading-relaxed font-medium overflow-y-auto">
									{aiFeedback}
								</div>
							) : (
								<div className="h-full flex flex-col items-center justify-center text-center opacity-50">
									<Cpu size={48} className="text-cyan-400 mb-4" />
									<p className="text-cyan-200 font-bold max-w-[200px]">Click "ASK AI SENSEI" to scan your code for bugs and tips.</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
