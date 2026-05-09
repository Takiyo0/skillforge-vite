import { useState } from 'react';
import type { ReactNode } from 'react';

interface TooltipProps {
	content: string;
	children: ReactNode;
	position?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, position = 'top' }: TooltipProps) {
	const [isVisible, setIsVisible] = useState(false);

	const positionClasses = {
		top: 'bottom-full mb-2',
		bottom: 'top-full mt-2',
		left: 'right-full mr-2',
		right: 'left-full ml-2',
	};

	const arrowClasses = {
		top: 'top-full left-1/2 -translate-x-1/2 border-t-blue-300 border-l-transparent border-r-transparent border-b-transparent dark:border-t-blue-500',
		bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-blue-300 border-l-transparent border-r-transparent border-t-transparent dark:border-b-blue-500',
		left: 'left-full top-1/2 -translate-y-1/2 border-l-blue-300 border-t-transparent border-b-transparent border-r-transparent dark:border-l-blue-500',
		right: 'right-full top-1/2 -translate-y-1/2 border-r-blue-300 border-t-transparent border-b-transparent border-l-transparent dark:border-r-blue-500',
	};

	return (
		<div className="relative inline-block group">
			<div onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
				{children}
			</div>

			{isVisible && (
				<div
					className={`glass-menu absolute ${positionClasses[position]} left-1/2 -translate-x-1/2 rounded-2xl px-3 py-2 text-xs text-slate-900 dark:text-white whitespace-nowrap z-50`}
				>
					{content}
					<div
						className={`absolute ${arrowClasses[position]} w-0 h-0 border-4`}
					/>
				</div>
			)}
		</div>
	);
}
