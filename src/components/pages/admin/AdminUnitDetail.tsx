import {useCallback, useEffect, useState} from 'react';
import {Navigate, useNavigate, useParams} from 'react-router-dom';
import {AlertCircle, ChevronRight, Edit2, Loader, Trash2, X} from 'lucide-react';
import {AdminExercises} from '@skillforge/vite/components/pages/admin/AdminExercises';
import {AdminQuizzes} from '@skillforge/vite/components/pages/admin/AdminQuizzes';
import {AdminFinalExams} from '@skillforge/vite/components/pages/admin/AdminFinalExams';
import {AdminModuleContentModal} from '@skillforge/vite/components/pages/admin/AdminModuleContentModal';
import {apiClient} from '@skillforge/vite/lib/api';
import type {ApiError, Course, Unit, UnitType} from '@skillforge/vite/lib/types';
import {trimString} from "../../../lib/utils.ts";
import {Breadcrumbs} from "../../layout/Breadcrumbs";

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface UnitFormData {
    title: string;
    type: UnitType;
    position: number;
    summary: string;
    estimatedMinutes: number;
}

const INITIAL_UNIT_FORM: UnitFormData = {
    title: '',
    type: 'module',
    position: 1,
    summary: '',
    estimatedMinutes: 30,
};

export function AdminUnitDetail() {
    const navigate = useNavigate();
    const {courseId, unitId} = useParams<{ courseId: string; unitId: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [unit, setUnit] = useState<Unit | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<UnitFormData>(INITIAL_UNIT_FORM);

    useEffect(() => {
        const loadUnit = async () => {
            if (!unitId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await apiClient.getUnitByIdAdmin(unitId);
                if (courseId && data.courseId !== courseId) {
                    setError('Unit does not belong to this course');
                    setLoading(false);
                    return;
                }

                setUnit(data);
                setFormData({
                    title: data.title,
                    type: data.type,
                    position: data.position,
                    summary: data.summary,
                    estimatedMinutes: data.estimatedMinutes,
                });
                const courseData = await apiClient.getCourseByIdAdmin(data.courseId);
                setCourse(courseData);
            } catch (err) {
                const apiError = err as ApiError;
                setError(apiError.message || 'Failed to load unit');
            } finally {
                setLoading(false);
            }
        };

        void loadUnit();
    }, [courseId, unitId]);

    const addToast = useCallback((message: string, type: Toast['type']) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, {id, message, type}]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 3000);
    }, []);

    const handleOpenEdit = () => {
        if (!unit) return;
        setFormData({
            title: unit.title,
            type: unit.type,
            position: unit.position,
            summary: unit.summary,
            estimatedMinutes: unit.estimatedMinutes,
        });
        setEditOpen(true);
    };

    const handleFormChange = (field: keyof UnitFormData, value: string | number | UnitType) => {
        setFormData((prev) => ({...prev, [field]: value}));
    };

    const handleUpdateUnit = async () => {
        if (!unit) return;

        try {
            setSubmitting(true);
            const updated = await apiClient.updateUnit(unit.id, {
                title: formData.title,
                type: formData.type,
                position: formData.position,
                summary: formData.summary,
                estimatedMinutes: formData.estimatedMinutes,
                isPublished: unit.isPublished,
            });
            setUnit((prev) => prev ? {...prev, ...updated} : updated);
            setEditOpen(false);
            addToast('Unit updated successfully', 'success');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to update unit', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUnit = async () => {
        if (!unit || !courseId) return;

        try {
            setSubmitting(true);
            await apiClient.deleteUnit(unit.id);
            addToast('Unit deleted successfully', 'success');
            navigate(`/admin/courses/${courseId}`);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to delete unit', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (!courseId || !unitId) {
        return <Navigate to="/admin/courses" replace/>;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader size={32} className="text-blue-600 animate-spin"/>
            </div>
        );
    }

    if (error || !unit) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>Admin</span>
                    <ChevronRight size={16}/>
                    <button onClick={() => navigate('/admin/courses')}
                            className="hover:text-slate-700 dark:hover:text-slate-200">
                        Courses
                    </button>
                </div>
                <div
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[2rem] p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle size={24} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-1"/>
                        <div>
                            <h3 className="font-black text-red-900 dark:text-red-100">Unable to load unit</h3>
                            <p className="text-red-700 dark:text-red-300 mt-2">{error || 'Unit not found'}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 overflow-y-auto px-6 py-6 md:px-8 md:py-8 max-w-[1600px]">
            <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`px-6 py-3 rounded-xl shadow-lg text-white flex items-center gap-3 ${
                            toast.type === 'success'
                                ? 'bg-emerald-500'
                                : toast.type === 'error'
                                    ? 'bg-red-500'
                                    : 'bg-blue-500'
                        }`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>

            <Breadcrumbs
                items={[
                    {label: 'Admin', to: '/admin'},
                    {label: 'Courses', to: '/admin/courses'},
                    {label: trimString(course?.title || 'Course', 20), to: `/admin/courses/${courseId}`},
                    {label: unit.title, to: `/admin/courses/${courseId}/${unit.id}`},
                ]}
            />

            <div
                className="rounded-[2rem] glass-widget-shell p-6 flex flex-col gap-6">
                <div className="flex items-start justify-between gap-6">
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                Unit Details
                            </p>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-2">{unit.title}</h1>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-3xl">{unit.summary || 'No summary yet.'}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-widest">
                            <span
                                className="px-3 py-1 rounded-lg bg-blue-50/70 dark:bg-blue-500/10 text-slate-700 dark:text-slate-300">
                                {unit.type}
                            </span>
                            <span
                                className="px-3 py-1 rounded-lg bg-blue-50/70 dark:bg-blue-500/10 text-slate-700 dark:text-slate-300">
                                Position {unit.position}
                            </span>
                            <span
                                className="px-3 py-1 rounded-lg bg-blue-50/70 dark:bg-blue-500/10 text-slate-700 dark:text-slate-300">
                                {unit.estimatedMinutes} min
                            </span>
                            <span
                                className={`px-3 py-1 rounded-lg ${
                                    unit.isPublished
                                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                        : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                                }`}
                            >
                                {unit.isPublished ? 'Published' : 'Draft'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleOpenEdit}
                            className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                            title="Edit unit"
                        >
                            <Edit2 size={18}/>
                        </button>
                        <button
                            onClick={() => setDeleteOpen(true)}
                            className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                            title="Delete unit"
                        >
                            <Trash2 size={18}/>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-blue-200/60 dark:border-blue-500/15 p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Course</p>
                        <p className="mt-2 font-bold text-slate-900 dark:text-white">{course?.title || 'Course'}</p>
                    </div>
                    <div className="rounded-2xl border border-blue-200/60 dark:border-blue-500/15 p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Type</p>
                        <p className="mt-2 font-bold text-slate-900 dark:text-white">{unit.type}</p>
                    </div>
                    <div className="rounded-2xl border border-blue-200/60 dark:border-blue-500/15 p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Estimated
                            Minutes</p>
                        <p className="mt-2 font-bold text-slate-900 dark:text-white">{unit.estimatedMinutes}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                        className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-900/20 p-5">
                        <p className="text-xs font-black uppercase tracking-widest text-blue-700 dark:text-blue-300">Requires
                            before this unit</p>
                        <div className="mt-3 space-y-2">
                            {unit.prerequisites.length > 0 ? unit.prerequisites.map((prereq) => (
                                <div key={prereq.id}
                                     className="flex items-center justify-between rounded-xl bg-white/80 dark:bg-slate-950/50 border border-blue-100 dark:border-blue-900/40 px-3 py-2">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{prereq.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {prereq.type || 'Unit'}{prereq.position ? ` • Position ${prereq.position}` : ''}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">No prerequisites yet.</p>
                            )}
                        </div>
                    </div>

                    <div
                        className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-900/20 p-5">
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Required
                            for these units</p>
                        <div className="mt-3 space-y-2">
                            {unit.requiredFor.length > 0 ? unit.requiredFor.map((target) => (
                                <div key={target.id}
                                     className="flex items-center justify-between rounded-xl bg-white/80 dark:bg-slate-950/50 border border-emerald-100 dark:border-emerald-900/40 px-3 py-2">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white">{target.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {target.type || 'Unit'}{target.position ? ` • Position ${target.position}` : ''}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-500 dark:text-slate-400">No dependent units yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {unit.type === 'exercise' && <AdminExercises unitId={unit.id}/>}
            {unit.type === 'assessment' && <AdminQuizzes unitId={unit.id}/>}
            {unit.type === 'final_exam' && <AdminFinalExams unitId={unit.id}/>}
            {unit.type === 'module' && (
                <AdminModuleContentModal
                    unit={unit}
                    inline
                    onClose={() => navigate(`/admin/courses/${courseId}`)}
                    onSaved={() => addToast('Module content saved', 'success')}
                    onToast={addToast}
                />
            )}

            {editOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2.5rem] border border-blue-200/60 dark:border-blue-500/15 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div
                            className="sticky top-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-blue-200/60 dark:border-blue-500/15 px-8 py-6 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Edit Unit</h2>
                            <button onClick={() => setEditOpen(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                <X size={20}/>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <label
                                className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleFormChange('title', e.target.value)}
                                className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border rounded-xl"
                            />
                            <label
                                className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => handleFormChange('type', e.target.value as UnitType)}
                                className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border rounded-xl"
                            >
                                <option value="module">Module</option>
                                <option value="exercise">Exercise</option>
                                <option value="assessment">Assessment</option>
                                <option value="final_exam">Final Exam</option>
                            </select>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label
                                        className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Position</label>
                                    <input
                                        type="number"
                                        value={formData.position}
                                        onChange={(e) => handleFormChange('position', parseInt(e.target.value) || 1)}
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border rounded-xl"
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Est.
                                        Minutes</label>
                                    <input
                                        type="number"
                                        value={formData.estimatedMinutes}
                                        onChange={(e) => handleFormChange('estimatedMinutes', parseInt(e.target.value) || 30)}
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border rounded-xl"
                                    />
                                </div>
                            </div>
                            <label
                                className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Summary</label>
                            <textarea
                                value={formData.summary}
                                onChange={(e) => handleFormChange('summary', e.target.value)}
                                rows={4}
                                className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border rounded-xl"
                            />
                            <div
                                className="flex justify-end space-x-4 pt-6 border-t border-blue-200/60 dark:border-blue-500/15">
                                <button
                                    onClick={() => setEditOpen(false)}
                                    disabled={submitting}
                                    className="glass-button-secondary px-6 py-3 rounded-xl disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateUnit}
                                    disabled={submitting}
                                    className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader size={18} className="animate-spin"/>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Update</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {deleteOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2.5rem] border border-blue-200/60 dark:border-blue-500/15 shadow-xl max-w-md w-full">
                        <div className="p-8">
                            <div
                                className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto mb-6">
                                <AlertCircle size={24}/>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">
                                Delete Unit?
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
                                Are you sure you want to delete "<strong>{unit.title}</strong>"? This action cannot be
                                undone.
                            </p>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setDeleteOpen(false)}
                                    disabled={submitting}
                                    className="glass-button-secondary px-6 py-3 text-slate-900 dark:text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteUnit}
                                    disabled={submitting}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader size={18} className="animate-spin"/>
                                            <span>Deleting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={18}/>
                                            <span>Delete</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
