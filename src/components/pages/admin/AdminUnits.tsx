import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {
    Plus,
    Link2,
    Loader,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    X,
    Check,
    GripVertical,
    Trash2,
} from 'lucide-react';
import type {Unit, Course, ApiError, UnitType, CourseLevel} from '@skillforge/vite/lib/types';
import {apiClient} from '@skillforge/vite/lib/api';
import {getCourseThumbUrl} from '@skillforge/vite/lib/s3';
import {Breadcrumbs} from '@skillforge/vite/components/layout/Breadcrumbs';
import {trimString} from "../../../lib/utils.ts";

type ModalState = 'closed' | 'create' | 'prerequisites';

interface FormData {
    title: string;
    type: UnitType;
    summary: string;
    estimatedMinutes: number;
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const INITIAL_FORM_DATA: FormData = {
    title: '',
    type: 'module',
    summary: '',
    estimatedMinutes: 30,
};

const UNIT_TYPES: UnitType[] = ['module', 'exercise', 'assessment', 'final_exam'];

// Course edit modal helpers (copied minimal from AdminCourses)
const COURSE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'gcc', 'cpp', 'rust', 'go', 'ruby', 'php'];
const CURRENCIES = ['IDR', 'USD', 'EUR', 'GBP', 'JPY', 'CNY'] as const;

interface AdminUnitsProps {
    courseId?: string;
}

export function AdminUnits({courseId}: AdminUnitsProps = {}) {
    const navigate = useNavigate();
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const [modalState, setModalState] = useState<ModalState>('closed');
    const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
    const [draggedUnitId, setDraggedUnitId] = useState<string | null>(null);
    const [prerequisiteUnits, setPrerequisiteUnits] = useState<Unit[]>([]);
    const [selectedPrerequisites, setSelectedPrerequisites] = useState<string[]>([]);
    const [prerequisitesLoading, setPrerequisitesLoading] = useState(false);

// Course edit form state
    interface CourseFormData {
        title: string;
        subtitle: string;
        description: string;
        level: typeof COURSE_LEVELS[number];
        language: string;
        priceCents: number;
        currencyCode: typeof CURRENCIES[number];
    }

    const INITIAL_COURSE_FORM: CourseFormData = {
        title: '',
        subtitle: '',
        description: '',
        level: 'beginner',
        language: 'javascript',
        priceCents: 0,
        currencyCode: 'IDR',
    };

    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [courseForm, setCourseForm] = useState<CourseFormData>(INITIAL_COURSE_FORM);
    const [courseFormErrors, setCourseFormErrors] = useState<Record<string, string>>({});
    const [courseSubmitting, setCourseSubmitting] = useState(false);
    const [courseDeleteOpen, setCourseDeleteOpen] = useState(false);
    const [courseThumbnailFile, setCourseThumbnailFile] = useState<File | null>(null);
    const [courseThumbnailPreview, setCourseThumbnailPreview] = useState<string | null>(null);

    useEffect(() => {
        if (courseId) {
            fetchCourseAndUnits(courseId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId]);

    useEffect(() => {
        if (!courseId && selectedCourse) {
            fetchUnits();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCourse]);

    // Course modal handlers
    const handleOpenEditCourse = () => {
        if (!selectedCourse) return;
        setCourseForm({
            title: selectedCourse.title || '',
            subtitle: selectedCourse.subtitle || '',
            description: selectedCourse.description || '',
            level: (selectedCourse.level as typeof COURSE_LEVELS[number]) || 'beginner',
            language: selectedCourse.language || 'javascript',
            priceCents: selectedCourse.priceCents || 0,
            currencyCode: (selectedCourse.currencyCode as typeof CURRENCIES[number]) || 'IDR',
        });
        setCourseFormErrors({});
        setCourseThumbnailFile(null);
        setCourseThumbnailPreview(getCourseThumbUrl((selectedCourse as Course & {
            thumbnailS3Key?: string
        }).thumbnailS3Key));
        setCourseModalOpen(true);
    };

    const validateCourseForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!courseForm.title.trim()) errors.title = 'Title is required';
        if (!courseForm.subtitle.trim()) errors.subtitle = 'Subtitle is required';
        if (!courseForm.description.trim()) errors.description = 'Description is required';
        if (courseForm.priceCents < 0) errors.priceCents = 'Price must be >= 0';
        setCourseFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCourseFormChange = (field: keyof CourseFormData, value: any) => {
        setCourseForm((prev) => ({...prev, [field]: value}));
        if (courseFormErrors[field]) {
            setCourseFormErrors((prev) => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleUpdateCourse = async () => {
        if (!selectedCourse || !validateCourseForm()) return;
        try {
            setCourseSubmitting(true);
            let updated = await apiClient.updateCourse(selectedCourse.id, courseForm);
            if (courseThumbnailFile) {
                updated = await apiClient.uploadCourseThumbnail(selectedCourse.id, courseThumbnailFile);
            }
            setSelectedCourse(updated);
            addToast('Course updated successfully', 'success');
            setCourseModalOpen(false);
        } catch (err) {
            const apiError = err as ApiError;
            if (apiError.statusCode === 404) {
                addToast('Course not found', 'error');
                setSelectedCourse(null);
            } else {
                addToast(apiError.message || 'Failed to update course', 'error');
            }
        } finally {
            setCourseSubmitting(false);
        }
    };

    const fetchCourseAndUnits = async (targetCourseId: string) => {
        try {
            setLoading(true);
            setError(null);

            const course = await apiClient.getCourseByIdAdmin(targetCourseId);
            setSelectedCourse(course);
            await fetchUnits(course);
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Failed to fetch courses');
            addToast('Failed to load courses', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchUnits = async (courseData?: Course) => {
        const activeCourse = courseData ?? selectedCourse;
        if (!activeCourse) return;

        try {
            setLoading(true);
            setError(null);

            const courseUnits = activeCourse.units || [];

            if (courseUnits.length === 0) {
                setUnits([]);
                return;
            }

            const detailedUnits: Unit[] = [];

            // Fetch full details for each unit via admin endpoint
            for (const unitPreview of courseUnits) {
                try {
                    const unit = await apiClient.getUnitByIdAdmin(unitPreview.id);
                    detailedUnits.push(unit);
                } catch (err) {
                    console.error(`Failed to fetch details for unit ${unitPreview.id}`, err);
                }
            }

            setUnits(detailedUnits.sort((a, b) => a.position - b.position));
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Failed to fetch units');
            addToast('Failed to load units', 'error');
        } finally {
            setLoading(false);
        }
    };

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, {id, message, type}]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!formData.title.trim()) errors.title = 'Title is required';
        if (formData.estimatedMinutes <= 0) errors.estimatedMinutes = 'Estimated minutes must be > 0';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleOpenCreate = () => {
        setSelectedUnit(null);
        setFormData(INITIAL_FORM_DATA);
        setFormErrors({});
        setModalState('create');
    };

    const handleCreateUnit = async () => {
        if (!validateForm() || !selectedCourse) return;

        try {
            setIsSubmitting(true);
            await apiClient.createUnit(selectedCourse.id, {
                title: formData.title,
                type: formData.type,
                summary: formData.summary,
                estimatedMinutes: formData.estimatedMinutes,
            });
            addToast('Unit created successfully', 'success');
            setModalState('closed');
            // Refresh all units from the server
            await fetchCourseAndUnits(selectedCourse.id);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to create unit', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePublishCourse = async (courseId: string) => {
        try {
            await apiClient.publishCourse(courseId);
            setSelectedCourse((prev) => (prev ? {...prev, isPublished: true} : prev));
            addToast('Course published successfully', 'success');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to publish course', 'error');
        }
    };

    const handleUnpublishCourse = async (courseId: string) => {
        try {
            await apiClient.unpublishCourse(courseId);
            setSelectedCourse((prev) => (prev ? {...prev, isPublished: false} : prev));
            addToast('Course unpublished successfully', 'success');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to unpublish course', 'error');
        }
    };

    const handleDeleteCourse = async () => {
        if (!selectedCourse) return;

        try {
            setCourseSubmitting(true);
            await apiClient.deleteCourse(selectedCourse.id);
            addToast('Course deleted successfully', 'success');
            navigate('/admin/courses');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to delete course', 'error');
        } finally {
            setCourseSubmitting(false);
        }
    };

    const handleOpenPrerequisites = async (unit: Unit) => {
        setSelectedUnit(unit);
        setPrerequisitesLoading(true);
        setSelectedPrerequisites(unit.prerequisites?.map((p) => p.id) || []);

        try {
            const allUnits = await Promise.all(
                units.map((u) => u.id === unit.id ? Promise.resolve(u) : apiClient.getUnitByIdAdmin(u.id))
            );
            setPrerequisiteUnits(allUnits.filter((u) => u.id !== unit.id));
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to load prerequisites', 'error');
        } finally {
            setPrerequisitesLoading(false);
        }

        setModalState('prerequisites');
    };

    const handleAddPrerequisite = async (prerequisiteId: string) => {
        if (!selectedUnit) return;

        try {
            await apiClient.addUnitPrerequisite(selectedUnit.id, prerequisiteId);
            await fetchCourseAndUnits(selectedCourse!.id);
            setSelectedPrerequisites((prev) => [...prev, prerequisiteId]);
            addToast('Prerequisite added', 'success');
        } catch (err) {
            const apiError = err as ApiError;
            if (apiError.message?.includes('circular')) {
                addToast('Cannot add this prerequisite: would create circular dependency', 'error');
            } else {
                addToast(apiError.message || 'Failed to add prerequisite', 'error');
            }
        }
    };

    const handleRemovePrerequisite = async (prerequisiteId: string) => {
        if (!selectedUnit) return;

        try {
            await apiClient.removeUnitPrerequisite(selectedUnit.id, prerequisiteId);
            await fetchCourseAndUnits(selectedCourse!.id);
            setSelectedPrerequisites((prev) => prev.filter((id) => id !== prerequisiteId));
            addToast('Prerequisite removed', 'success');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to remove prerequisite', 'error');
        }
    };

    const handlePublishToggle = async (unit: Unit) => {
        try {
            const updated = await apiClient.updateUnit(unit.id, {isPublished: !unit.isPublished});
            setUnits((prev) => prev.map((u) => (u.id === unit.id ? {...u, ...updated} : u)));
            addToast(
                unit.isPublished ? 'Unit unpublished successfully' : 'Unit published successfully',
                'success'
            );
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to update unit status', 'error');
        }
    };

    const handleDragStart = (unitId: string) => {
        setDraggedUnitId(unitId);
    };

    const handleDrop = async (targetUnitId: string) => {
        if (!draggedUnitId || draggedUnitId === targetUnitId) {
            setDraggedUnitId(null);
            return;
        }

        const fromIndex = units.findIndex((unit) => unit.id === draggedUnitId);
        const toIndex = units.findIndex((unit) => unit.id === targetUnitId);

        if (fromIndex < 0 || toIndex < 0) {
            setDraggedUnitId(null);
            return;
        }

        const previousUnits = units;
        const reordered = [...units];
        const [movedUnit] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, movedUnit);
        const normalizedUnits = reordered.map((unit, index) => ({...unit, position: index + 1}));

        setUnits(normalizedUnits);
        setDraggedUnitId(null);

        try {
            setIsSubmitting(true);
            for (const unit of normalizedUnits) {
                const original = previousUnits.find((item) => item.id === unit.id);
                if (original && original.position !== unit.position) {
                    await apiClient.updateUnit(unit.id, {position: unit.position});
                }
            }
            addToast('Unit order updated successfully', 'success');
        } catch (err) {
            const apiError = err as ApiError;
            setUnits(previousUnits);
            addToast(apiError.message || 'Failed to reorder units', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFormChange = (field: keyof FormData, value: string | number | UnitType) => {
        setFormData((prev) => ({...prev, [field]: value}));
        if (formErrors[field]) {
            setFormErrors((prev) => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const getUnitTypeLabel = (type: UnitType): string => {
        const labels: Record<UnitType, string> = {
            module: 'Module',
            exercise: 'Exercise',
            assessment: 'Assessment',
            final_exam: 'Final Exam',
        };
        return labels[type];
    };

    const handleOpenUnitDetail = (unit: Unit) => {
        if (!courseId) {
            setExpandedUnitId(expandedUnitId === unit.id ? null : unit.id);
            return;
        }

        navigate(`/admin/courses/${courseId}/${unit.id}`);
    };

    return (
        <div className="space-y-6 overflow-y-auto px-6 py-6 md:px-8 md:py-8 max-w-[1600px]">
            <Breadcrumbs
                items={[
                    {label: 'Admin', to: '/admin'},
                    {label: 'Courses', to: '/admin/courses'},
                    {label: trimString(selectedCourse?.title || 'Course', 20)},
                ]}
            />

            {/* Toast Notifications */}
            <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`px-6 py-4 rounded-2xl font-bold text-white shadow-lg pointer-events-auto animate-in slide-in-from-right ${
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

            {/* Error State */}
            {error && (
                <div
                    className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-[2rem] p-6 flex items-start space-x-4">
                    <div className="text-red-600 dark:text-red-400 shrink-0">
                        <AlertCircle size={24}/>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-black text-red-700 dark:text-red-300 mb-2">Error loading units</h3>
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    </div>
                    <button
                        onClick={() => courseId && fetchCourseAndUnits(courseId)}
                        className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors shrink-0"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <Loader size={48} className="text-blue-500 animate-spin mx-auto mb-4"/>
                        <p className="text-slate-500 dark:text-slate-400 font-bold">Loading units...</p>
                    </div>
                </div>
            )}

            {/* No Course Selected */}
            {!loading && !selectedCourse && courseId && (
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <p className="text-slate-500 dark:text-slate-400 text-lg font-medium">
                            No course found
                        </p>
                    </div>
                </div>
            )}

            {/* Units Content */}
            {!loading && selectedCourse && (
                <div className="space-y-6">
                    {/* Course Info Card */}
                    <div
                        className="glass-panel rounded-[2rem] p-6 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-col gap-6 md:flex-row md:items-center">
                            <img src={getCourseThumbUrl((selectedCourse as Course & {
                                thumbnailS3Key?: string
                            })?.thumbnailS3Key)} alt="Course thumbnail"
                                 className="w-36 h-24 object-cover rounded-lg border border-blue-200/60 dark:border-blue-500/15"/>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">{selectedCourse!.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedCourse!.subtitle}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                    Author: <span
                                    className="font-semibold text-slate-900 dark:text-white">{selectedCourse!.creator?.displayName || 'Unknown'}</span>
                                </p>
                                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                    <span
                                        className="inline-block mr-3 px-2 py-1 bg-blue-50/70 dark:bg-blue-500/10 rounded-lg">{selectedCourse!.level}</span>
                                    <span
                                        className="inline-block mr-3 px-2 py-1 bg-blue-50/70 dark:bg-blue-500/10 rounded-lg">{selectedCourse!.language}</span>
                                    <span
                                        className="inline-block mr-3 px-2 py-1 bg-blue-50/70 dark:bg-blue-500/10 rounded-lg">{(selectedCourse!.priceCents / 100).toFixed(2)} {selectedCourse!.currencyCode}</span>
                                    <span
                                        className={`inline-block px-2 py-1 text-xs font-black uppercase tracking-widest rounded-lg ${
                                            selectedCourse!.isPublished
                                                ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                                : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                                        }`}
                                    >
												{selectedCourse!.isPublished ? 'Published' : 'Draft'}
											</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Publish/Unpublish for course */}
                            {selectedCourse && selectedCourse.isPublished ? (
                                <button
                                    onClick={() => handleUnpublishCourse(selectedCourse.id)}
                                    className="p-2 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 rounded-lg transition-colors"
                                    title="Unpublish"
                                >
                                    <X size={18}/>
                                </button>
                            ) : (
                                <button
                                    onClick={() => selectedCourse && handlePublishCourse(selectedCourse.id)}
                                    className="p-2 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                                    title="Publish"
                                >
                                    <Check size={18}/>
                                </button>
                            )}

                            <button onClick={handleOpenEditCourse}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold">Edit
                                Course
                            </button>
                            <button
                                onClick={() => setCourseDeleteOpen(true)}
                                className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                title="Delete course"
                            >
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    </div>
                    {/* Header with Create Button */}
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                Manage Units - {selectedCourse!.title}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                                {units.length} unit{units.length !== 1 ? 's' : ''} in this course
                            </p>
                        </div>
                        <button
                            onClick={handleOpenCreate}
                            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-wider transition-transform hover:scale-105 shadow-lg shadow-blue-600/30 w-full lg:w-auto"
                        >
                            <Plus size={20}/> <span>Create Unit</span>
                        </button>
                    </div>

                    {/* Empty State */}
                    {units.length === 0 ? (
                        <div
                            className="rounded-[2rem] glass-panel overflow-hidden p-12 text-center">
                            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium mb-6">
                                No units yet. Create your first unit to get started.
                            </p>
                            <button
                                onClick={handleOpenCreate}
                                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-wider transition-colors"
                            >
                                <Plus size={20}/> <span>Create Unit</span>
                            </button>
                        </div>
                    ) : (
                        <div
                            className="rounded-[2rem] glass-panel overflow-hidden">
                            <table className="min-w-[1100px] w-full">
                                <thead>
                                <tr className="border-b border-blue-200/60 dark:border-blue-500/15 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50">
                                    <th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                                        Title
                                    </th>
                                    <th className="text-left px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                                        Type
                                    </th>
                                    <th className="text-center px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                                        Position
                                    </th>
                                    <th className="text-center px-6 py-4 font-black text-slate-900 dark:text-white uppercase tracking-wider text-sm">
                                        Actions
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {units.map((unit) => (
                                    <tr
                                        key={unit.id}
                                        onClick={() => handleOpenUnitDetail(unit)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleOpenUnitDetail(unit);
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => void handleDrop(unit.id)}
                                        className={`border-b border-blue-200/60 dark:border-blue-500/15 hover:bg-blue-50/60 dark:hover:bg-blue-500/10 transition-colors cursor-pointer group ${
                                            draggedUnitId === unit.id ? 'opacity-60 bg-blue-50 dark:bg-blue-900/20' : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-start space-x-3">
                                                {courseId && (
                                                    <button
                                                        type="button"
                                                        draggable
                                                        onClick={(e) => e.stopPropagation()}
                                                        onDragStart={() => handleDragStart(unit.id)}
                                                        onDragEnd={() => setDraggedUnitId(null)}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-grab active:cursor-grabbing transition-all group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20"
                                                        title="Drag to reorder"
                                                    >
                                                        <GripVertical size={16}/>
                                                    </button>
                                                )}
                                                <div className="min-w-0">
                                                    <div
                                                        className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                                                        {courseId ? <Link2 size={16}/> : expandedUnitId === unit.id ?
                                                            <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                                        <span>{unit.title}</span>
                                                    </div>

                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {unit.prerequisites.length > 0 && (
                                                            <span
                                                                className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] font-black uppercase tracking-widest">
                                                                Requires {unit.prerequisites.length}
                                                            </span>
                                                        )}
                                                        {unit.requiredFor.length > 0 && (
                                                            <span
                                                                className="px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-black uppercase tracking-widest">
                                                                Unlocks {unit.requiredFor.length}
                                                            </span>
                                                        )}
                                                        {unit.prerequisites.slice(0, 2).map((prereq) => (
                                                            <span
                                                                key={prereq.id}
                                                                className="px-2 py-1 rounded-full bg-blue-50/70 dark:bg-blue-500/10 text-slate-600 dark:text-slate-300 text-[11px] font-bold"
                                                                title="Required before this unit"
                                                            >
                                                                {prereq.title}
                                                            </span>
                                                        ))}
                                                        {unit.prerequisites.length > 2 && (
                                                            <span
                                                                className="px-2 py-1 rounded-full bg-blue-50/70 dark:bg-blue-500/10 text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                                                                +{unit.prerequisites.length - 2} more
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
												<span
                                                    className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-black uppercase tracking-widest rounded-lg">
													{getUnitTypeLabel(unit.type)}
												</span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-300">
                                            {unit.position}
                                        </td>

                                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-center space-x-2">
                                                {unit.isPublished ? (
                                                    <button
                                                        onClick={() => handlePublishToggle(unit)}
                                                        className="p-2 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 rounded-lg transition-colors"
                                                        title="Unpublish unit"
                                                    >
                                                        <X size={16}/>
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handlePublishToggle(unit)}
                                                        className="p-2 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"
                                                        title="Publish unit"
                                                    >
                                                        <Check size={16}/>
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleOpenPrerequisites(unit)}
                                                    className="p-2 bg-blue-50/70 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors"
                                                    title="Manage prerequisites"
                                                >
                                                    <Link2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Expanded Content Details */}
                    {expandedUnitId && (
                        <div
                            className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2rem] border border-blue-200/60 dark:border-blue-500/15 shadow-xl shadow-blue-950/10 p-6">
                            {units.find((u) => u.id === expandedUnitId) && (
                                <div className="space-y-4">
                                    <h3 className="font-black text-slate-900 dark:text-white">Unit Details</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="font-bold text-slate-700 dark:text-slate-300">Summary</p>
                                            <p className="text-slate-600 dark:text-slate-400">{units.find((u) => u.id === expandedUnitId)?.summary}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 dark:text-slate-300">Estimated
                                                Minutes</p>
                                            <p className="text-slate-600 dark:text-slate-400">
                                                {units.find((u) => u.id === expandedUnitId)?.estimatedMinutes} min
                                            </p>
                                        </div>
                                        {units.find((u) => u.id === expandedUnitId)?.prerequisites && (
                                            <div>
                                                <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">Prerequisites</p>
                                                <div className="space-y-1">
                                                    {units.find((u) => u.id === expandedUnitId)?.prerequisites?.length ? (
                                                        units.find((u) => u.id === expandedUnitId)?.prerequisites?.map((p) => (
                                                            <p key={p.id}
                                                               className="text-slate-600 dark:text-slate-400">
                                                                • {p.title}
                                                            </p>
                                                        ))
                                                    ) : (
                                                        <p className="text-slate-500 dark:text-slate-400 italic">None</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {modalState === 'create' && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2rem] border border-blue-200/60 dark:border-blue-500/15 shadow-2xl max-w-2xl w-full mx-4 p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                {modalState === 'create' ? 'Create Unit' : 'Edit Unit'}
                            </h2>
                            <button
                                onClick={() => setModalState('closed')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={24} className="text-slate-600 dark:text-slate-400"/>
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label
                                    className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => handleFormChange('title', e.target.value)}
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                    placeholder="e.g., Introduction to Go"
                                />
                                {formErrors.title && (
                                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{formErrors.title}</p>
                                )}
                            </div>

                            {/* Type */}
                            <div>
                                <label
                                    className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                    Type *
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => handleFormChange('type', e.target.value as UnitType)}
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                >
                                    {UNIT_TYPES.map((type) => (
                                        <option key={type} value={type}>
                                            {getUnitTypeLabel(type)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Estimated Minutes */}
                            <div>
                                <label
                                    className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                    Est. Minutes *
                                </label>
                                <input
                                    type="number"
                                    value={formData.estimatedMinutes}
                                    onChange={(e) => handleFormChange('estimatedMinutes', parseInt(e.target.value) || 30)}
                                    min="1"
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                />
                                {formErrors.estimatedMinutes && (
                                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">{formErrors.estimatedMinutes}</p>
                                )}
                            </div>

                            {/* Summary */}
                            <div>
                                <label
                                    className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                                    Summary
                                </label>
                                <textarea
                                    value={formData.summary}
                                    onChange={(e) => handleFormChange('summary', e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                                    placeholder="Brief description of this unit"
                                />
                            </div>
                        </div>

                        <div
                            className="flex justify-end space-x-3 pt-6 border-t border-blue-200/60 dark:border-blue-500/15">
                            <button
                                onClick={() => setModalState('closed')}
                                className="px-6 py-3 bg-blue-50/70 dark:bg-blue-500/10 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateUnit}
                                disabled={isSubmitting}
                                className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 disabled:from-slate-400 disabled:to-slate-400 text-white rounded-xl font-bold transition-colors"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader size={16} className="animate-spin"/>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={16}/>
                                        <span>Create</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prerequisites Modal */}
            {modalState === 'prerequisites' && selectedUnit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2rem] border border-blue-200/60 dark:border-blue-500/15 shadow-2xl max-w-2xl w-full mx-4 p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                    Manage Prerequisites
                                </h2>
                                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                                    Units that must be completed before: <strong>{selectedUnit.title}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setModalState('closed')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={24} className="text-slate-600 dark:text-slate-400"/>
                            </button>
                        </div>

                        {prerequisitesLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader size={32} className="text-blue-500 animate-spin"/>
                            </div>
                        ) : (
                            <div className="space-y-6">

                                {/* Current Prerequisites */}
                                {selectedPrerequisites.length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-3">Current
                                            Prerequisites</h3>
                                        <div className="space-y-2">
                                            {prerequisiteUnits
                                                .filter((u) => selectedPrerequisites.includes(u.id))
                                                .map((unit) => (
                                                    <div
                                                        key={unit.id}
                                                        className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-emerald-900 dark:text-emerald-300">{unit.title}</p>
                                                            <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                                                {getUnitTypeLabel(unit.type)} • Position {unit.position}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemovePrerequisite(unit.id)}
                                                            className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                                        >
                                                            <X size={18}/>
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Available Prerequisites */}
                                {prerequisiteUnits.filter((u) => !selectedPrerequisites.includes(u.id)).length > 0 && (
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-3">
                                            Available Units to Add
                                        </h3>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {prerequisiteUnits
                                                .filter((u) => !selectedPrerequisites.includes(u.id))
                                                .map((unit) => (
                                                    <div
                                                        key={unit.id}
                                                        className="flex items-center justify-between p-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50 border border-blue-200/60 dark:border-blue-500/15 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">{unit.title}</p>
                                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                                {getUnitTypeLabel(unit.type)} • Position {unit.position}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddPrerequisite(unit.id)}
                                                            className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                                        >
                                                            <Plus size={18}/>
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {prerequisiteUnits.length === 0 && (
                                    <div className="py-8 text-center">
                                        <p className="text-slate-500 dark:text-slate-400">
                                            This is the first unit in the course. No prerequisites can be added.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end pt-6 border-t border-blue-200/60 dark:border-blue-500/15">
                            <button
                                onClick={() => setModalState('closed')}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 text-white rounded-xl font-bold transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Course Edit Modal */}
            {courseModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2.5rem] border border-blue-200/60 dark:border-blue-500/15 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div
                            className="sticky top-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-blue-200/60 dark:border-blue-500/15 px-8 py-6 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Edit Course</h2>
                            <button onClick={() => setCourseModalOpen(false)}
                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><X size={20}/>
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            {/* Title */}
                            <div>
                                <label
                                    className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                    Course Title
                                </label>
                                <input
                                    type="text"
                                    value={courseForm.title}
                                    onChange={(e) => handleCourseFormChange('title', e.target.value)}
                                    placeholder="e.g., React Advanced Patterns"
                                    className={`w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border rounded-xl font-medium focus:outline-none focus:ring-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 ${
                                        courseFormErrors.title
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-emerald-500'
                                    }`}
                                />
                                {courseFormErrors.title && (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">{courseFormErrors.title}</p>
                                )}
                            </div>

                            {/* Subtitle */}
                            <div>
                                <label
                                    className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                    Subtitle
                                </label>
                                <input
                                    type="text"
                                    value={courseForm.subtitle}
                                    onChange={(e) => handleCourseFormChange('subtitle', e.target.value)}
                                    placeholder="e.g., Master advanced React patterns"
                                    className={`w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border rounded-xl font-medium focus:outline-none focus:ring-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 ${
                                        courseFormErrors.subtitle
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-emerald-500'
                                    }`}
                                />
                                {courseFormErrors.subtitle && (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">{courseFormErrors.subtitle}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label
                                    className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                    Description
                                </label>
                                <textarea
                                    value={courseForm.description}
                                    onChange={(e) => handleCourseFormChange('description', e.target.value)}
                                    placeholder="Describe your course in detail..."
                                    rows={5}
                                    className={`w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border rounded-xl font-medium focus:outline-none focus:ring-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 resize-none ${
                                        courseFormErrors.description
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-emerald-500'
                                    }`}
                                />
                                {courseFormErrors.description && (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">{courseFormErrors.description}</p>
                                )}
                            </div>

                            <div>
                                <label
                                    className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                    Course Banner / Thumbnail
                                </label>
                                <div className="space-y-3">
                                    {courseThumbnailPreview && (
                                        <img
                                            src={courseThumbnailPreview}
                                            alt="Course banner preview"
                                            className="w-full h-40 object-cover rounded-xl border border-blue-200/60 dark:border-blue-500/15"
                                        />
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setCourseThumbnailFile(file);
                                            setCourseThumbnailPreview(file ? URL.createObjectURL(file) : null);
                                        }}
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Uploaded image will be stored to S3 and saved into <code>thumbnail_s3_key</code>.
                                    </p>
                                </div>
                            </div>

                            {/* Level */}
                            <div>
                                <label
                                    className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                    Course Level
                                </label>
                                <select
                                    value={courseForm.level}
                                    onChange={(e) => handleCourseFormChange('level', e.target.value as CourseLevel)}
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                                >
                                    {COURSE_LEVELS.map((level) => (
                                        <option key={level} value={level} className="capitalize">
                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Language */}
                            <div>
                                <label
                                    className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                    Language
                                </label>
                                <select
                                    value={courseForm.language}
                                    onChange={(e) => handleCourseFormChange('language', e.target.value)}
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                                >
                                    {LANGUAGES.map((lang) => (
                                        <option key={lang} value={lang}>
                                            {lang.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Price */}
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label
                                        className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                        Price (in cents)
                                    </label>
                                    <input
                                        type="number"
                                        value={courseForm.priceCents}
                                        onChange={(e) => handleCourseFormChange('priceCents', parseInt(e.target.value) || 0)}
                                        min="0"
                                        className={`w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border rounded-xl font-medium focus:outline-none focus:ring-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 ${
                                            courseFormErrors.priceCents
                                                ? 'border-red-500 focus:ring-red-500'
                                                : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-emerald-500'
                                        }`}
                                        placeholder="e.g., 9999 for $99.99"
                                    />
                                    {courseFormErrors.priceCents && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">{courseFormErrors.priceCents}</p>
                                    )}
                                </div>

                                {/* Currency */}
                                <div>
                                    <label
                                        className="block text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                                        Currency
                                    </label>
                                    <select
                                        value={courseForm.currencyCode}
                                        onChange={(e) => handleCourseFormChange('currencyCode', e.target.value)}
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                                    >
                                        {CURRENCIES.map((curr) => (
                                            <option key={curr} value={curr}>
                                                {curr}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div
                                className="flex justify-end space-x-4 pt-6 border-t border-blue-200/60 dark:border-blue-500/15">
                                <button onClick={() => setCourseModalOpen(false)} disabled={courseSubmitting}
                                        className="glass-button-secondary px-6 py-3 rounded-xl">Cancel
                                </button>
                                <button onClick={handleUpdateCourse} disabled={courseSubmitting}
                                        className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl">{courseSubmitting ? 'Saving...' : 'Update'}</button>
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {courseDeleteOpen && selectedCourse && (
                <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2.5rem] border border-blue-200/60 dark:border-blue-500/15 shadow-xl max-w-md w-full">
                        <div className="p-8">
                            <div
                                className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mx-auto mb-6">
                                <AlertCircle size={24}/>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">
                                Delete Course?
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
                                Are you sure you want to delete "<strong>{selectedCourse.title}</strong>"? This action
                                cannot be undone.
                            </p>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setCourseDeleteOpen(false)}
                                    disabled={courseSubmitting}
                                    className="glass-button-secondary px-6 py-3 text-slate-900 dark:text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteCourse}
                                    disabled={courseSubmitting}
                                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {courseSubmitting ? (
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
