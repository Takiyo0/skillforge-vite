import Editor from '@monaco-editor/react';
import {MarkdownContent} from '@skillforge/vite/components/ui/MarkdownContent';

interface MarkdownEditorProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    height?: string;
    required?: boolean;
    error?: string;
    preview?: boolean;
}

export function MarkdownEditor({
    label,
    value,
    onChange,
    height = '220px',
    required = false,
    error,
    preview = true,
}: MarkdownEditorProps) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                {label}{required ? ' *' : ''}
            </label>
            <div className="glass-widget-dark overflow-hidden rounded-xl">
                <Editor
                    height={height}
                    language="markdown"
                    value={value}
                    onChange={(nextValue) => onChange(nextValue ?? '')}
                    options={{
                        minimap: {enabled: false},
                        wordWrap: 'on',
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                    }}
                    theme="vs-dark"
                />
            </div>
            {error && <p className="text-red-600 dark:text-red-400 text-xs">{error}</p>}
            {preview && (
                <div className="glass-widget-surface rounded-xl p-4 max-h-56 overflow-y-auto">
                    <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Preview
                    </p>
                    <MarkdownContent
                        content={value || '*Nothing to preview yet.*'}
                        className="text-sm [&_p]:my-2 [&_pre]:my-2"
                    />
                </div>
            )}
        </div>
    );
}
