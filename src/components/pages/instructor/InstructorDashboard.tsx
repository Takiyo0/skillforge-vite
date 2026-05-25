import { Plus, Users, TrendingUp, Code } from 'lucide-react';

export function InstructorDashboard() {
	return (
		<div className="flex-1 overflow-y-auto">
			<div className="p-8 space-y-6 max-w-5xl mx-auto">
				{/* Header */}
				<div className="flex justify-between items-center mb-8">
					<div>
						<h1 className="text-3xl font-black text-slate-900 dark:text-white">Command Center</h1>
						<p className="text-slate-500 font-medium mt-1">Manage your active quests and heroes.</p>
					</div>
					<button className="glass-button px-6 py-3 rounded-2xl font-black transition-transform hover:scale-105 flex items-center space-x-2">
						<Plus size={20} strokeWidth={3} /> <span>Create Quest</span>
					</button>
				</div>

				{/* Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="glass-panel p-8 rounded-2xl relative overflow-hidden group">
						<div className="absolute -right-6 -top-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
						<p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Active Heroes</p>
						<h3 className="text-5xl font-black text-slate-900 dark:text-white">1,248</h3>
					</div>
					<div className="glass-panel p-8 rounded-2xl relative overflow-hidden group">
						<div className="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
						<p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Quest Rating</p>
						<h3 className="text-5xl font-black text-emerald-500">4.8 <span className="text-2xl text-slate-300">/ 5</span></h3>
					</div>
					<div className="glass-panel p-8 rounded-2xl relative overflow-hidden group">
						<div className="absolute -right-6 -top-6 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-colors"></div>
						<p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">Projects to Review</p>
						<h3 className="text-5xl font-black text-rose-500">24</h3>
					</div>
				</div>

				{/* Manage Quests Section */}
				<div className="glass-panel-strong rounded-2xl p-8 mt-8">
					<h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">Manage Quests (Courses)</h2>

					<div className="space-y-4">
						{/* Backend Quest */}
						<div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 hover:border-blue-500/30 transition-colors">
							<div className="mb-4 md:mb-0">
								<span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-2xl mb-2">Published</span>
								<h3 className="font-black text-xl text-slate-900 dark:text-white">Backend Engineering</h3>
								<p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">5 Modules • 450 Heroes Enrolled</p>
							</div>
							<button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-colors">
								Edit Quest
							</button>
						</div>

						{/* AI/ML Quest */}
						<div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 hover:border-blue-500/30 transition-colors">
							<div className="mb-4 md:mb-0">
								<span className="inline-block px-3 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 text-[10px] font-black uppercase tracking-widest rounded-2xl mb-2">Draft</span>
								<h3 className="font-black text-xl text-slate-900 dark:text-white">AI & Machine Learning</h3>
								<p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">3 Modules • 0 Heroes Enrolled</p>
							</div>
							<button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black transition-colors">
								Publish Quest
							</button>
						</div>
					</div>
				</div>

				{/* Recent Activity */}
				<div className="glass-panel-strong rounded-2xl p-8">
					<h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Recent Activity</h2>

					<div className="space-y-4">
						<div className="flex items-center space-x-4 p-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
							<div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
								<Users size={20} />
							</div>
							<div className="flex-1">
								<p className="font-bold text-slate-900 dark:text-white">New enrollment</p>
								<p className="text-sm text-slate-500 dark:text-slate-400">Sarah joined Backend Engineering</p>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400">2 hours ago</p>
						</div>

						<div className="flex items-center space-x-4 p-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
							<div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
								<Code size={20} />
							</div>
							<div className="flex-1">
								<p className="font-bold text-slate-900 dark:text-white">Project submitted</p>
								<p className="text-sm text-slate-500 dark:text-slate-400">John submitted Boss Battle: Auth Service</p>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400">4 hours ago</p>
						</div>

						<div className="flex items-center space-x-4 p-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
							<div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
								<TrendingUp size={20} />
							</div>
							<div className="flex-1">
								<p className="font-bold text-slate-900 dark:text-white">Quest rating updated</p>
								<p className="text-sm text-slate-500 dark:text-slate-400">Backend Engineering now 4.8 stars</p>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400">1 day ago</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
