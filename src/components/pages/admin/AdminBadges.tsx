import {useEffect, useMemo, useState} from 'react';
import {
    AlertCircle,
    Award,
    Filter,
    Loader,
    Pencil,
    Plus,
    Search,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import type {
    AdminBadge,
    BadgeCriteriaMetadata,
    BadgeCriteriaType,
    CreateBadgeRequest,
    UpdateBadgeRequest,
} from '@skillforge/vite/lib/types';
import {apiClient} from '@skillforge/vite/lib/api';
import {getBadgeIcon, getS3Url} from '@skillforge/vite/lib/s3';
import {GlassButton, GlassSecondaryButton, Input, Select, StateCard, Textarea} from '@skillforge/vite/components/ui/controls';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface BadgeFormState {
    code: string;
    name: string;
    description: string;
    iconS3Key: string;
    criteriaType: BadgeCriteriaType;
    language: string;
    xp: string;
    iconFile?: File;
    iconPreview?: string;
}

const EMPTY_FORM: BadgeFormState = {
    code: '',
    name: '',
    description: '',
    iconS3Key: '',
    criteriaType: 'first_course',
    language: 'javascript',
    xp: '1000',
};

const CRITERIA_LABELS: Record<BadgeCriteriaType, string> = {
    first_course: 'First course',
    xp_milestone: 'XP milestone',
};

export function AdminBadges() {
    const [badges, setBadges] = useState<AdminBadge[]>([]);
    const [criteriaMetadata, setCriteriaMetadata] = useState<BadgeCriteriaMetadata[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCriteriaFilter, setSelectedCriteriaFilter] = useState<
        'all' | BadgeCriteriaType
    >('all');
    const [showModal, setShowModal] = useState(false);
    const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
    const [form, setForm] = useState<BadgeFormState>(EMPTY_FORM);

    useEffect(() => {
        void fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [badgeData, metadata] = await Promise.all([
                apiClient.getAllBadges(),
                apiClient.getBadgeCriteriaMetadata(),
            ]);
            setBadges(badgeData);
            setCriteriaMetadata(metadata);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to load badges';
            setError(errorMsg);
            addToast(errorMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const addToast = (message: string, type: Toast['type']) => {
        const id = Math.random().toString(36).slice(2);
        const toast: Toast = {id, message, type};
        setToasts((prev) => [...prev, toast]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((item) => item.id !== id));
        }, 3000);
    };

    const openCreateModal = () => {
        setEditingBadgeId(null);
        setForm(EMPTY_FORM);
        setShowModal(true);
    };

    const openEditModal = (badge: AdminBadge) => {
        setEditingBadgeId(badge.id);
        setForm({
            code: badge.code,
            name: badge.name,
            description: badge.description || '',
            iconS3Key: badge.iconS3Key || '',
            criteriaType: badge.criteria.type,
            language: badge.criteria.language || 'javascript',
            xp: badge.criteria.xp?.toString() || '1000',
            iconFile: undefined,
            iconPreview: undefined,
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingBadgeId(null);
        setForm(EMPTY_FORM);
    };

    const currentCriteriaDefinition = useMemo(
        () => criteriaMetadata.find((item) => item.type === form.criteriaType),
        [criteriaMetadata, form.criteriaType],
    );

    const filteredBadges = useMemo(() => {
        let filtered = badges;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((badge) => {
                const criteriaText =
                    badge.criteria.type === 'first_course'
                        ? badge.criteria.language || ''
                        : String(badge.criteria.xp || '');

                return (
                    badge.name.toLowerCase().includes(query) ||
                    badge.code.toLowerCase().includes(query) ||
                    (badge.description || '').toLowerCase().includes(query) ||
                    criteriaText.toLowerCase().includes(query)
                );
            });
        }

        if (selectedCriteriaFilter !== 'all') {
            filtered = filtered.filter((badge) => badge.criteria.type === selectedCriteriaFilter);
        }

        return filtered;
    }, [badges, searchQuery, selectedCriteriaFilter]);

    const criteriaSummary = (badge: AdminBadge) => {
        if (badge.criteria.type === 'first_course') {
            return `Language: ${badge.criteria.language || 'n/a'}`;
        }

        if (badge.criteria.type === 'xp_milestone') {
            return `XP: ${badge.criteria.xp ?? 'n/a'}`;
        }

        return 'Unknown criteria';
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payloadBase = {
                code: form.code.trim(),
                name: form.name.trim(),
                description: form.description.trim(),
                iconS3Key: form.iconS3Key.trim() || null,
                criteriaType: form.criteriaType,
            };

            const payload: CreateBadgeRequest | UpdateBadgeRequest =
                form.criteriaType === 'first_course'
                    ? {
                        ...payloadBase,
                        language: form.language.trim(),
                    }
                    : {
                        ...payloadBase,
                        xp: Number(form.xp),
                    };

            let badgeId = editingBadgeId;
            if (editingBadgeId) {
                await apiClient.updateBadge(editingBadgeId, payload as UpdateBadgeRequest);
                addToast('Badge updated', 'success');
            } else {
                const newBadge = await apiClient.createBadge(payload as CreateBadgeRequest);
                badgeId = newBadge.id;
                addToast('Badge created', 'success');
            }

            // Upload icon if a file was selected
            if (form.iconFile && badgeId) {
                try {
                    setUploading(true);
                    await apiClient.uploadBadgeIcon(badgeId, form.iconFile);
                    addToast('Icon uploaded', 'success');
                } catch (err) {
                    const errorMsg = err instanceof Error ? err.message : 'Failed to upload icon';
                    addToast(errorMsg, 'error');
                } finally {
                    setUploading(false);
                }
            }

            closeModal();
            await fetchData();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to save badge';
            addToast(errorMsg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (badge: AdminBadge) => {
        const confirmed = window.confirm(`Delete badge "${badge.name}"?`);
        if (!confirmed) {
            return;
        }

        try {
            await apiClient.deleteBadge(badge.id);
            addToast('Badge deleted', 'success');
            await fetchData();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to delete badge';
            addToast(errorMsg, 'error');
        }
    };

    const totalBadges = badges.length;
    const firstCourseBadges = badges.filter((badge) => badge.criteria.type === 'first_course').length;
    const xpBadges = badges.filter((badge) => badge.criteria.type === 'xp_milestone').length;

    return (
        <div className="space-y-8">
            <div className="fixed top-4 right-4 z-50 space-y-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`px-6 py-3 rounded-2xl shadow-lg text-white flex items-center gap-3 ${
                            toast.type === 'success'
                                ? 'bg-emerald-500'
                                : toast.type === 'error'
                                    ? 'bg-red-500'
                                    : 'bg-blue-500'
                        }`}
                    >
                        {toast.type === 'error' && <AlertCircle size={18}/>}
                        {toast.message}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div
                    className="p-8 rounded-2xl glass-shell">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">
                        Total Badges
                    </p>
                    <h3 className="text-5xl font-black text-slate-900 dark:text-white">{totalBadges}</h3>
                </div>
                <div
                    className="p-8 rounded-2xl glass-shell">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">
                        First Course
                    </p>
                    <h3 className="text-5xl font-black text-slate-900 dark:text-white">{firstCourseBadges}</h3>
                </div>
                <div
                    className="p-8 rounded-2xl glass-shell">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-2">
                        XP Milestones
                    </p>
                    <h3 className="text-5xl font-black text-slate-900 dark:text-white">{xpBadges}</h3>
                </div>
            </div>

            <div
                className="rounded-2xl glass-shell p-8 text-center">
                <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
                    <div>
                        <label
                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                            Search badges
                        </label>
                        <div className="relative">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
                            />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full lg:w-96 pl-12"
                                placeholder="Search by code, name, or criteria..."
                            />
                        </div>
                    </div>
                    <div>
                        <label
                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                            <Filter size={16} className="inline mr-2"/>
                            Criteria
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {(['all', 'first_course', 'xp_milestone'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setSelectedCriteriaFilter(filter)}
                                    className={`glass-chip px-5 py-2 rounded-2xl font-bold text-sm transition-all ${
                                        selectedCriteriaFilter === filter
                                            ? 'bg-blue-500/20 text-blue-700 dark:text-blue-200'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/70'
                                    }`}
                                >
                                    {filter === 'all' ? 'All' : CRITERIA_LABELS[filter]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <GlassButton
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2"
                    >
                        <Plus size={18}/>
                        New badge
                    </GlassButton>
                </div>
            </div>

            {error && (
                <div
                    className="glass-state border-red-500/20 bg-red-500/10 rounded-2xl p-8">
                    <div className="flex items-start gap-4">
                        <div
                            className="w-12 h-12 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center shrink-0">
                            <AlertCircle size={28}/>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black text-xl mb-2 text-red-700 dark:text-red-300">
                                Error loading badges
                            </h3>
                            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                            <button
                                onClick={fetchData}
                                className="rounded-2xl bg-red-600 px-6 py-2 font-bold text-white transition-colors hover:bg-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center min-h-96">
                    <StateCard title="Loading badges..." description="Syncing badge catalog and criteria metadata."/>
                </div>
            )}

            {!loading && !error && filteredBadges.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredBadges.map((badge) => (
                        <div
                            key={badge.id}
                            className="glass-panel rounded-2xl p-6 space-y-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        {badge.code}
                                    </p>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">
                                        {badge.name}
                                    </h3>
                                </div>
                                <div className="w-16 h-16 flex items-center justify-center shrink-0 text-4xl">
                                    {badge.iconS3Key ? (
                                        <img
                                            src={getS3Url(badge.iconS3Key) || badge.iconS3Key}
                                            alt={badge.name}
                                            className="w-full h-full object-cover rounded-2xl"
                                        />
                                    ) : (
                                        getBadgeIcon(null, badge.id)
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                                {badge.description || 'No description'}
                            </p>

                            <div className="glass-chip rounded-2xl p-4 space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Criteria
                                </p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {CRITERIA_LABELS[badge.criteria.type]}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {criteriaSummary(badge)}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <GlassButton
                                    onClick={() => openEditModal(badge)}
                                    className="flex-1 justify-center"
                                >
                                    <Pencil size={16}/>
                                    Edit
                                </GlassButton>
                                <GlassSecondaryButton
                                    onClick={() => void handleDelete(badge)}
                                    className="justify-center text-red-600 dark:text-red-300"
                                >
                                    <Trash2 size={16}/>
                                    Delete
                                </GlassSecondaryButton>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && !error && filteredBadges.length === 0 && (
                <div className="flex items-center justify-center min-h-96">
                    <StateCard icon={<Award size={24}/>} title="No badges match your filters"/>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        className="glass-panel-strong rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-8 space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        {editingBadgeId ? 'Edit badge' : 'Create badge'}
                                    </p>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-2">
                                        Badge details
                                    </h2>
                                </div>
                                <button
                                    onClick={closeModal}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                >
                                    <X size={28}/>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label
                                        className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                        Code
                                    </label>
                                    <Input
                                        value={form.code}
                                        onChange={(e) => setForm((prev) => ({...prev, code: e.target.value}))}
                                        className="font-medium"
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                        Name
                                    </label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm((prev) => ({...prev, name: e.target.value}))}
                                        className="font-medium"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label
                                        className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                        Description
                                    </label>
                                    <Textarea
                                        value={form.description}
                                        onChange={(e) =>
                                            setForm((prev) => ({...prev, description: e.target.value}))
                                        }
                                        rows={3}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label
                                        className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                        Badge Icon (optional)
                                    </label>
                                    <div className="flex gap-4">
                                        <div
                                            className="w-24 h-24 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border-2 border-dashed border-blue-200/60 dark:border-blue-500/15 rounded-2xl flex items-center justify-center shrink-0">
                                            {form.iconPreview ? (
                                                <img
                                                    src={form.iconPreview}
                                                    alt="Icon preview"
                                                    className="w-full h-full object-cover rounded-2xl"
                                                />
                                            ) : (
                                                <div className="text-5xl">
                                                    {getBadgeIcon(form.iconS3Key, editingBadgeId || 'new').length > 10 ?
                                                        <img
                                                            src={getBadgeIcon(form.iconS3Key, editingBadgeId || 'new')}
                                                            alt="Icon preview"
                                                            className="w-full h-full object-cover rounded-2xl"
                                                        />
                                                        : getBadgeIcon(form.iconS3Key, editingBadgeId || 'new')
                                                    }
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                Upload an image or emoji will be used as fallback
                                            </p>
                                            <label
                                                className="glass-chip inline-flex items-center gap-2 rounded-2xl px-4 py-2 font-medium cursor-pointer transition-colors hover:bg-white/80 dark:hover:bg-slate-800/70">
                                                <Upload size={16}/>
                                                <span>Choose image</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                iconFile: file,
                                                                iconPreview: URL.createObjectURL(file),
                                                            }));
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                            </label>
                                            {form.iconFile && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (form.iconPreview) {
                                                            URL.revokeObjectURL(form.iconPreview);
                                                        }
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            iconFile: undefined,
                                                            iconPreview: undefined,
                                                        }));
                                                    }}
                                                    className="block text-sm text-red-600 hover:text-red-700 font-medium"
                                                >
                                                    Clear file
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label
                                        className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                        Criteria type
                                    </label>
                                    <Select
                                        value={form.criteriaType}
                                        onChange={(e) => {
                                            const nextType = e.target.value as BadgeCriteriaType;
                                            const nextDefinition = criteriaMetadata.find(
                                                (item) => item.type === nextType,
                                            );
                                            setForm((prev) => ({
                                                ...prev,
                                                criteriaType: nextType,
                                                language:
                                                    nextType === 'first_course'
                                                        ? prev.language || 'javascript'
                                                        : prev.language,
                                                xp:
                                                    nextType === 'xp_milestone'
                                                        ? prev.xp || String(nextDefinition?.fields[0]?.min || 1000)
                                                        : prev.xp,
                                            }));
                                        }}
                                        className="font-medium"
                                    >
                                        {criteriaMetadata.map((item) => (
                                            <option key={item.type} value={item.type}>
                                                {item.label}
                                            </option>
                                        ))}
                                    </Select>
                                </div>

                                {form.criteriaType === 'first_course' && (
                                    <div className="md:col-span-2">
                                        <label
                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                            Language
                                        </label>
                                        <Select
                                            value={form.language}
                                            onChange={(e) =>
                                                setForm((prev) => ({...prev, language: e.target.value}))
                                            }
                                            className="font-medium"
                                        >
                                            {criteriaMetadata
                                                .find((item) => item.type === 'first_course')
                                                ?.fields[0]?.options?.map((option) => (
                                                <option key={String(option.value)} value={String(option.value)}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </Select>
                                        {currentCriteriaDefinition?.fields[0]?.helperText && (
                                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                {currentCriteriaDefinition.fields[0].helperText}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {form.criteriaType === 'xp_milestone' && (
                                    <div className="md:col-span-2">
                                        <label
                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                            XP threshold
                                        </label>
                                        <Input
                                            type="number"
                                            min={currentCriteriaDefinition?.fields[0]?.min || 1}
                                            step={currentCriteriaDefinition?.fields[0]?.step || 1}
                                            value={form.xp}
                                            onChange={(e) =>
                                                setForm((prev) => ({...prev, xp: e.target.value}))
                                            }
                                            className="font-medium"
                                        />
                                        {currentCriteriaDefinition?.fields[0]?.helperText && (
                                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                                {currentCriteriaDefinition.fields[0].helperText}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-blue-200/60 dark:border-blue-500/15">
                                <GlassSecondaryButton
                                    onClick={closeModal}
                                    className="flex-1 px-6 py-3"
                                >
                                    Cancel
                                </GlassSecondaryButton>
                                <GlassButton
                                    disabled={saving || uploading}
                                    onClick={() => void handleSave()}
                                    className="flex-1 px-6 py-3 disabled:opacity-60 inline-flex items-center justify-center gap-2"
                                >
                                    {(saving || uploading) && <Loader size={18} className="animate-spin"/>}
                                    {uploading ? 'Uploading...' : editingBadgeId ? 'Save changes' : 'Create badge'}
                                </GlassButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
