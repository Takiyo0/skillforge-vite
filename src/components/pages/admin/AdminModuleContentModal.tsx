import {useEffect, useState} from 'react';
import Editor from '@monaco-editor/react';
import {Loader, Upload, Paperclip, Trash2, Save} from 'lucide-react';
import type {ApiError, ModuleResource, Unit} from '@skillforge/vite/lib/types';
import {apiClient} from '@skillforge/vite/lib/api';
import {getS3Url} from '@skillforge/vite/lib/s3';
import {MarkdownContent} from '@skillforge/vite/components/ui/MarkdownContent';

interface AdminModuleContentModalProps {
    unit: Unit;
    onClose: () => void;
    onSaved: () => void;
    onToast: (message: string, type: 'success' | 'error' | 'info') => void;
    inline?: boolean;
}

export function AdminModuleContentModal({
                                            unit,
                                            onClose,
                                            onSaved,
                                            onToast,
                                            inline = false,
                                        }: AdminModuleContentModalProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [contentKind, setContentKind] = useState<'video' | 'article_markdown'>('article_markdown');
    const [videoUrl, setVideoUrl] = useState('');
    const [articleMarkdown, setArticleMarkdown] = useState('');
    const [playbackSpeedsText, setPlaybackSpeedsText] = useState('1,1.25,1.5');
    const [supportsPip, setSupportsPip] = useState(true);
    const [resources, setResources] = useState<ModuleResource[]>([]);
    const [hasExistingContent, setHasExistingContent] = useState(false);
    const [attachmentLabel, setAttachmentLabel] = useState('');

    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            try {
                setLoading(true);
                let moduleContent: Awaited<ReturnType<typeof apiClient.getModuleContent>> | null = null;
                try {
                    moduleContent = await apiClient.getModuleContent(unit.id);
                } catch (error) {
                    const apiError = error as ApiError;
                    if (apiError.statusCode !== 404) throw error;
                }

                const moduleResources = await apiClient.listModuleResources(unit.id);
                if (!mounted) return;

                setResources(moduleResources);
                if (moduleContent) {
                    setHasExistingContent(true);
                    setContentKind(
                        moduleContent.contentKind === 'video' ? 'video' : 'article_markdown'
                    );
                    setVideoUrl(moduleContent.videoUrl || '');
                    setArticleMarkdown(moduleContent.articleMarkdown || '');
                    setSupportsPip(moduleContent.supportsPip ?? true);
                    if (moduleContent.playbackSpeeds?.length) {
                        setPlaybackSpeedsText(moduleContent.playbackSpeeds.join(','));
                    }
                }
            } catch (error) {
                const apiError = error as ApiError;
                onToast(apiError.message || 'Failed to load module content', 'error');
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadData();
        return () => {
            mounted = false;
        };
    }, [unit.id, onToast]);

    const parsePlaybackSpeeds = (): number[] => {
        return playbackSpeedsText
            .split(',')
            .map((v) => Number(v.trim()))
            .filter((v) => Number.isFinite(v) && v > 0);
    };

    const handleSaveContent = async () => {
        if (contentKind === 'video' && !videoUrl.trim()) {
            onToast('Video URL is required for video modules', 'error');
            return;
        }
        if (contentKind === 'article_markdown' && !articleMarkdown.trim()) {
            onToast('Markdown content is required for article modules', 'error');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                contentKind,
                videoUrl: contentKind === 'video' ? videoUrl.trim() : undefined,
                articleMarkdown:
                    contentKind === 'article_markdown' ? articleMarkdown : undefined,
                playbackSpeeds: parsePlaybackSpeeds(),
                supportsPip,
            };
            if (hasExistingContent) {
                await apiClient.updateModuleContent(unit.id, payload);
            } else {
                await apiClient.createModuleContent(unit.id, payload);
                setHasExistingContent(true);
            }
            onToast('Module content saved', 'success');
            onSaved();
        } catch (error) {
            const apiError = error as ApiError;
            onToast(apiError.message || 'Failed to save module content', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleVideoUpload = async (file: File) => {
        try {
            setSaving(true);
            const uploaded = await apiClient.uploadModuleVideo(unit.id, file);
            setVideoUrl(uploaded.videoUrl || uploaded.s3Key);
            onToast('Video uploaded successfully', 'success');
        } catch (error) {
            const apiError = error as ApiError;
            onToast(apiError.message || 'Failed to upload video', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAttachmentUpload = async (file: File) => {
        try {
            setSaving(true);
            const uploaded = await apiClient.uploadModuleResource(unit.id, file, {
                label: attachmentLabel.trim() || file.name,
                resourceType: file.type || 'file',
            });
            setResources((prev) => [uploaded.resource, ...prev]);
            setAttachmentLabel('');
            onToast('Attachment uploaded', 'success');
        } catch (error) {
            const apiError = error as ApiError;
            onToast(apiError.message || 'Failed to upload attachment', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAttachment = async (resourceId: string) => {
        try {
            await apiClient.deleteModuleResource(resourceId);
            setResources((prev) => prev.filter((r) => r.id !== resourceId));
            onToast('Attachment removed', 'success');
        } catch (error) {
            const apiError = error as ApiError;
            onToast(apiError.message || 'Failed to remove attachment', 'error');
        }
    };

    return (
        <div
            className={
                inline
                    ? 'space-y-6'
                    : 'fixed inset-0 bg-slate-950/65 backdrop-blur-2xl z-50 flex items-center justify-center p-4'
            }
        >
            <div
                className={
                    inline
                        ? 'glass-widget-shell rounded-[2rem] shadow-2xl w-full overflow-hidden'
                        : 'glass-widget-shell rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto'
                }
            >

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <Loader className="animate-spin text-blue-500" size={32}/>
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Content Type
                                    </label>
                                    <select
                                        value={contentKind}
                                        onChange={(e) => setContentKind(e.target.value as 'video' | 'article_markdown')}
                                        className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15"
                                    >
                                        <option value="article_markdown">Article (Markdown)</option>
                                        <option value="video">Video</option>
                                    </select>
                                </div>

                                {contentKind === 'video' && (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                            Video URL (YouTube, S3, or hosted link)
                                        </label>
                                        <input
                                            type="text"
                                            value={videoUrl}
                                            onChange={(e) => setVideoUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15"
                                        />
                                        <label
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50/70 dark:bg-blue-500/10 cursor-pointer font-semibold">
                                            <Upload size={16}/>
                                            <span>Upload Video to Platform</span>
                                            <input
                                                type="file"
                                                accept="video/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) void handleVideoUpload(file);
                                                }}
                                            />
                                        </label>
                                    </div>
                                )}

                                {contentKind === 'article_markdown' && (
                                    <div>
                                        <label
                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                            Article Markdown
                                        </label>
                                        <div
                                            className="glass-widget-dark overflow-hidden rounded-xl">
                                            <Editor
                                                height="80vh"
                                                language="markdown"
                                                value={articleMarkdown}
                                                onChange={(value) => setArticleMarkdown(value ?? '')}
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
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label
                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                            Playback Speeds (comma separated)
                                        </label>
                                        <input
                                            type="text"
                                            value={playbackSpeedsText}
                                            onChange={(e) => setPlaybackSpeedsText(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15"
                                        />
                                    </div>
                                    <label
                                        className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={supportsPip}
                                            onChange={(e) => setSupportsPip(e.target.checked)}
                                        />
                                        Support Picture-in-Picture
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {contentKind === 'article_markdown' && (
                                    <div className="glass-widget-surface rounded-xl p-4">
                                        <p className="font-bold mb-3 text-slate-900 dark:text-white">Markdown
                                            Preview</p>
                                        <MarkdownContent
                                            content={articleMarkdown || '*Start writing markdown...*'}
                                            className="text-sm"
                                        />
                                    </div>
                                )}

                                <div className="glass-widget-surface rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Paperclip size={16}/>
                                        <p className="font-bold text-slate-900 dark:text-white">Attachments</p>
                                    </div>
                                    <div className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={attachmentLabel}
                                            onChange={(e) => setAttachmentLabel(e.target.value)}
                                            placeholder="Attachment label (optional)"
                                            className="flex-1 px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15"
                                        />
                                        <label
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer font-semibold">
                                            <Upload size={14}/>
                                            <span>Upload</span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) void handleAttachmentUpload(file);
                                                }}
                                            />
                                        </label>
                                    </div>

                                    <div className="space-y-2 max-h-72 overflow-y-auto">
                                        {resources.length === 0 && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400">No attachments
                                                yet.</p>
                                        )}
                                        {resources.map((resource) => {
                                            const href = resource.url || getS3Url(resource.s3Key) || '#';
                                            return (
                                                <div
                                                    key={resource.id}
                                                    className="flex items-center justify-between px-3 py-2 rounded-lg glass-widget-inset"
                                                >
                                                    <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline truncate"
                                                    >
                                                        {resource.label}
                                                    </a>
                                                    <button
                                                        onClick={() => void handleDeleteAttachment(resource.id)}
                                                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                                        title="Delete attachment"
                                                    >
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-3 border-t border-blue-200/60 dark:border-blue-500/15">
                            <button
                                onClick={onClose}
                                className="glass-button-secondary px-5 py-2 rounded-xl font-bold"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => void handleSaveContent()}
                                disabled={saving}
                                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white font-bold inline-flex items-center gap-2"
                            >
                                {saving ? <Loader size={16} className="animate-spin"/> : <Save size={16}/>}
                                <span>Save Content</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
