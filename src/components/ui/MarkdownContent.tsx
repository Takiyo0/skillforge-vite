import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@skillforge/vite/lib/utils';

interface MarkdownContentProps {
	content: string;
	className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
	return (
		<div
			className={cn(
				'max-w-none text-slate-700 dark:text-slate-300 selection:bg-blue-200/50 selection:text-slate-950 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
				'[&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:text-slate-900 dark:[&_h1]:text-white',
				'[&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:text-slate-900 dark:[&_h2]:text-white',
				'[&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900 dark:[&_h3]:text-white',
				'[&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:text-slate-900 dark:[&_h4]:text-white',
				'[&_p]:my-4 [&_p]:leading-7',
				'[&_ul]:my-4 [&_ul]:ml-6 [&_ul]:list-disc [&_li]:my-1',
				'[&_ol]:my-4 [&_ol]:ml-6 [&_ol]:list-decimal',
				'[&_a]:font-semibold [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-500 dark:[&_a]:text-blue-400',
				'[&_blockquote]:my-4 [&_blockquote]:rounded-2xl [&_blockquote]:border [&_blockquote]:border-blue-200/60 dark:[&_blockquote]:border-blue-400/20 [&_blockquote]:bg-blue-50/70 dark:[&_blockquote]:bg-blue-500/10 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:pl-5 [&_blockquote]:italic',
				'[&_code]:rounded-lg [&_code]:border [&_code]:border-blue-200/60 dark:[&_code]:border-blue-400/20 [&_code]:bg-blue-50/80 dark:[&_code]:bg-blue-500/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.92em]',
				'[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:border [&_pre]:border-blue-200/60 dark:[&_pre]:border-blue-400/20 [&_pre]:bg-slate-950/90 [&_pre]:p-4 [&_pre]:text-slate-100 [&_pre]:shadow-xl [&_pre]:shadow-blue-950/15 [&_pre]:backdrop-blur-xl',
				'[&_pre_code]:bg-transparent [&_pre_code]:p-0',
				'[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-2xl [&_table]:border [&_table]:border-blue-200/60 dark:[&_table]:border-blue-400/20',
				'[&_th]:bg-blue-50/80 dark:[&_th]:bg-blue-500/10 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-bold',
				'[&_td]:border-t [&_td]:border-blue-200/60 dark:[&_td]:border-blue-400/20 [&_td]:px-3 [&_td]:py-2',
				'[&_hr]:my-6 [&_hr]:border-blue-200/70 dark:[&_hr]:border-blue-400/20',
				className
			)}
		>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
		</div>
	);
}
