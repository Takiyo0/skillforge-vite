import { useNavigate } from 'react-router-dom';
import { ChevronRight, Play, Lock, CheckCircle, BookOpen, Code, HelpCircle } from 'lucide-react';
import { mockCourses } from '@skillforge/vite/lib/mockData';

interface LearningPathProps {
	activeCourseId?: string;
}

export function LearningPath({ activeCourseId = 'backend' }: LearningPathProps) {
	const navigate = useNavigate();
	const currentCourse = mockCourses.find(c => c.id === activeCourseId) || mockCourses[0];

	const getModuleIcon = (type: string) => {
		switch (type) {
			case 'video': return <Play size={20} />;
			case 'material': return <BookOpen size={20} />;
			case 'project': return <Code size={20} />;
			case 'quiz': return <HelpCircle size={20} />;
			default: return <BookOpen size={20} />;
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
			case 'current': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
			case 'locked': return 'glass-chip bg-slate-500/10 text-slate-500 dark:text-slate-400';
			default: return 'glass-chip bg-slate-500/10 text-slate-500 dark:text-slate-400';
		}
	};

	const getStatusLabel = (status: string) => {
		switch (status) {
			case 'completed': return '✓ Completed';
			case 'current': return '◉ Current';
			case 'locked': return '🔒 Locked';
			default: return status;
		}
	};

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="max-w-4xl mx-auto p-8 space-y-8">
				{/* Back Navigation */}
				<div className="flex items-center space-x-2 text-sm font-bold text-slate-500 dark:text-slate-400 mb-4 cursor-pointer hover:text-blue-500" onClick={() => navigate('/student/dashboard')}>
					<ChevronRight className="rotate-180" size={16} /> <span>Back to Campaigns</span>
				</div>

				{/* Course Header */}
				<div className="glass-panel-strong p-8 rounded-[2.5rem] flex justify-between items-center relative overflow-hidden">
					<div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl ${currentCourse.color === 'blue' ? 'bg-blue-500/10' : 'bg-emerald-500/10'}`}></div>
					<div className="relative z-10 flex items-center space-x-6">
						<div className={`w-16 h-16 rounded-2xl flex items-center justify-center border border-white/15 shadow-inner ${currentCourse.color === 'blue' ? 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300' : 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300'}`}>
							<currentCourse.icon size={32} />
						</div>
						<div>
							<span className={`font-black uppercase tracking-widest text-sm mb-1 block ${currentCourse.color === 'blue' ? 'text-blue-600 dark:text-blue-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{currentCourse.tag} Map</span>
							<h1 className="text-3xl font-black text-slate-900 dark:text-white">{currentCourse.title}</h1>
						</div>
					</div>

					<div className="relative z-10 text-right">
						<p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Course Progress</p>
						<div className="text-4xl font-black text-slate-900 dark:text-white">{currentCourse.progress}%</div>
					</div>
				</div>

				{/* Modules List */}
				<div className="space-y-4">
					<h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Missions</h2>
					{currentCourse.modules.map((module) => {
						const isLocked = module.status === 'locked';
						return (
							<div
								key={module.id}
							className={`glass-panel p-6 rounded-[2rem] transition-all ${!isLocked ? 'hover:border-blue-400/30 hover:-translate-y-1 cursor-pointer' : 'opacity-60'}`}
								onClick={() => {
									if (!isLocked) {
										navigate(`/student/playground?module=${module.id}`);
									}
								}}
							>
								<div className="flex items-center space-x-4">
									{/* Status Icon */}
									<div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getStatusColor(module.status)}`}>
										{module.status === 'completed' ? <CheckCircle size={24} /> : module.status === 'locked' ? <Lock size={24} /> : getModuleIcon(module.type)}
									</div>

									{/* Module Info */}
									<div className="flex-1">
										<div className="flex items-center space-x-3 mb-2">
											<h3 className="font-black text-slate-900 dark:text-white text-lg">{module.title}</h3>
											<span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg ${getStatusColor(module.status)}`}>
												{getStatusLabel(module.status)}
											</span>
										</div>
										<p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{module.duration}</p>
									</div>

									{/* XP Reward */}
									<div className="text-right shrink-0">
										<p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Reward</p>
										<p className={`text-2xl font-black ${module.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
											+{module.xp} XP
										</p>
									</div>

									{/* Arrow */}
									{!isLocked && <ChevronRight size={24} className="text-slate-300 dark:text-slate-600" />}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
