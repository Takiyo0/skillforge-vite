import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
	label: string;
	to?: string;
}

interface BreadcrumbsProps {
	items: BreadcrumbItem[];
	className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
	return (
		<nav
			aria-label="Breadcrumb"
			className={`inline-flex flex-wrap items-center gap-2 rounded-full glass-panel px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 ${className}`}
		>
			{items.map((item, index) => {
				const isLast = index === items.length - 1;
				const content = item.to && !isLast ? (
					<Link
						to={item.to}
						className="font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
					>
						{item.label}
					</Link>
				) : (
					<span
						className={isLast ? 'font-black text-slate-900 dark:text-white' : ''}
					>
						{item.label}
					</span>
				);

				return (
					<div key={`${item.label}-${index}`} className="flex items-center gap-2">
						{content}
						{!isLast && <ChevronRight size={14} className="text-blue-200/70 dark:text-blue-800/80" />}
					</div>
				);
			})}
		</nav>
	);
}
