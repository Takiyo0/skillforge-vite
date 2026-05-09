import {useState, useEffect} from 'react';
import Editor from '@monaco-editor/react';
import {
    Plus,
    Edit2,
    Trash2,
    AlertCircle,
    Loader,
    ChevronDown,
    ChevronUp,
    X,
    Code2,
    BookOpen,
    Zap,
} from 'lucide-react';
import type {Unit, ExerciseDetails, TestCase, Hint, ApiError} from '@skillforge/vite/lib/types';
import {apiClient} from '@skillforge/vite/lib/api';
import {MarkdownContent} from '@skillforge/vite/components/ui/MarkdownContent';

interface AdminExercisesProps {
    unitId?: string;
}

type ModalState = 'closed' | 'create' | 'edit' | 'test-case' | 'hint' | 'details';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ExerciseFormData {
    title: string;
    promptMarkdown: string;
    difficulty: 'normal' | 'advanced';
    language: string;
    starterCode: string;
    maxCpuMs: number;
    maxMemoryKb: number;
}

interface TestCaseFormData {
    inputText: string;
    expectedOutput: string;
    isHidden?: boolean;
}

interface HintFormData {
    hintText: string;
    unlockAfterFailedAttempts: number;
}

const INITIAL_EXERCISE_FORM: ExerciseFormData = {
    title: '',
    promptMarkdown: '',
    difficulty: 'normal',
    language: 'JavaScript',
    starterCode: '',
    maxCpuMs: 5000,
    maxMemoryKb: 256000,
};

const INITIAL_TEST_CASE_FORM: TestCaseFormData = {
    inputText: '',
    expectedOutput: '',
    isHidden: false,
};

const INITIAL_HINT_FORM: HintFormData = {
    hintText: '',
    unlockAfterFailedAttempts: 3,
};

const DIFFICULTIES: Array<'normal' | 'advanced'> = ['normal', 'advanced'];
const LANGUAGES = [
    'JavaScript',
    'Python',
    'Java',
    'C++',
    'Go',
    'Rust',
    'TypeScript',
    'Ruby',
    'PHP',
    'C#',
];

const getMonacoLanguage = (language: string): string => {
    switch (language.toLowerCase()) {
        case 'typescript':
            return 'typescript';
        case 'python':
            return 'python';
        case 'java':
            return 'java';
        case 'c++':
            return 'cpp';
        case 'go':
            return 'go';
        case 'rust':
            return 'rust';
        case 'ruby':
            return 'ruby';
        case 'php':
            return 'php';
        case 'c#':
            return 'csharp';
        default:
            return 'javascript';
    }
};

export function AdminExercises({unitId}: AdminExercisesProps = {}) {
    const inlineView = Boolean(unitId);
    // State for units and exercises
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState<string>(unitId ?? '');
    const [exercises, setExercises] = useState<ExerciseDetails[]>([]);

    // State for loading and errors
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // State for modal and forms
    const [modalState, setModalState] = useState<ModalState>('closed');
    const [exerciseFormData, setExerciseFormData] = useState<ExerciseFormData>(INITIAL_EXERCISE_FORM);
    const [testCaseFormData, setTestCaseFormData] = useState<TestCaseFormData>(INITIAL_TEST_CASE_FORM);
    const [hintFormData, setHintFormData] = useState<HintFormData>(INITIAL_HINT_FORM);

    // State for selected items
    const [selectedExercise, setSelectedExercise] = useState<ExerciseDetails | null>(null);
    const [selectedTestCaseId, setSelectedTestCaseId] = useState<string | null>(null);
    const [selectedHintId, setSelectedHintId] = useState<string | null>(null);

    // State for UI
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

    // Fetch units on mount
    useEffect(() => {
        fetchUnitsAndExercises();
    }, []);

    useEffect(() => {
        if (unitId) {
            setSelectedUnitId(unitId);
        }
    }, [unitId]);

    // Fetch exercises when unit changes
    useEffect(() => {
        if (selectedUnitId) {
            fetchExercisesForUnit(selectedUnitId);
        }
    }, [selectedUnitId]);

    useEffect(() => {
        if (inlineView && selectedExercise) {
            setExerciseFormData({
                title: selectedExercise.title,
                promptMarkdown: selectedExercise.promptMarkdown,
                difficulty: selectedExercise.difficulty,
                language: selectedExercise.language,
                starterCode: selectedExercise.starterCode,
                maxCpuMs: selectedExercise.maxCpuMs,
                maxMemoryKb: selectedExercise.maxMemoryKb,
            });
        }
    }, [inlineView, selectedExercise]);

    const fetchUnitsAndExercises = async () => {
        try {
            setLoading(true);
            setError(null);
            if (unitId) {
                const unit = await apiClient.getUnitByIdAdmin(unitId);
                if (unit.type !== 'exercise') {
                    setUnits([]);
                    setExercises([]);
                    return;
                }
                setUnits([unit]);
                setSelectedUnitId(unit.id);
                setExercises(unit.exercise ? [unit.exercise] : []);
                setSelectedExercise(unit.exercise ?? null);
                setExpandedExerciseId(unit.exercise ? unit.exercise.id : null);
                return;
            }
            const courses = await apiClient.getInstructorCourses();

            // Fetch all units from all courses (using admin endpoint data)
            const allUnits: Unit[] = [];
            for (const course of courses) {
                // Use units from course object (fetched via admin endpoint)
                const courseUnits = course.units || [];

                const courseInfo = {
                    id: course.id,
                    slug: course.slug,
                    title: course.title,
                    subtitle: course.subtitle,
                    description: course.description,
                    level: course.level,
                    language: course.language,
                    isPublished: course.isPublished || false,
                };
                allUnits.push(...courseUnits.map((unit) => ({
                    ...unit,
                    courseId: course.id,
                    course: courseInfo
                } as Unit)));
            }

            // Filter to exercise units
            const exerciseUnits = allUnits.filter((u) => u.type === 'exercise');
            setUnits(exerciseUnits);

            // Set default selected unit
            if (exerciseUnits.length > 0) {
                setSelectedUnitId(exerciseUnits[0].id);
            }
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Failed to fetch units');
            addToast('Failed to load units', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchExercisesForUnit = async (unitId: string) => {
        try {
            const unit = await apiClient.getUnitByIdAdmin(unitId);
            if (unit.exercise) {
                setExercises([unit.exercise]);
                setSelectedExercise(unit.exercise);
            } else {
                setExercises([]);
                setSelectedExercise(null);
            }
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to fetch exercise', 'error');
            setExercises([]);
        }
    };

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, {id, message, type}]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    };

    const validateExerciseForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!exerciseFormData.title.trim()) errors.title = 'Title is required';
        if (!exerciseFormData.promptMarkdown.trim()) errors.promptMarkdown = 'Prompt is required';
        if (!exerciseFormData.language.trim()) errors.language = 'Language is required';
        if (exerciseFormData.maxCpuMs < 100) errors.maxCpuMs = 'Max CPU must be at least 100ms';
        if (exerciseFormData.maxMemoryKb < 1024) errors.maxMemoryKb = 'Max memory must be at least 1MB';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateTestCaseForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!testCaseFormData.inputText.trim()) errors.inputText = 'Input is required';
        if (!testCaseFormData.expectedOutput.trim()) errors.expectedOutput = 'Expected output is required';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateHintForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!hintFormData.hintText.trim()) errors.hintText = 'Hint text is required';
        if (hintFormData.unlockAfterFailedAttempts < 1)
            errors.unlockAfterFailedAttempts = 'Must be at least 1';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Exercise handlers
    const handleOpenCreateExercise = () => {
        setSelectedExercise(null);
        setExerciseFormData(INITIAL_EXERCISE_FORM);
        setFormErrors({});
        setModalState('create');
    };

    const handleCreateExercise = async () => {
        if (!validateExerciseForm() || !selectedUnitId) return;

        try {
            setIsSubmitting(true);
            await apiClient.createExercise(selectedUnitId, exerciseFormData);
            // await new Promise((resolve) => setTimeout(resolve, 700));
            await fetchExercisesForUnit(selectedUnitId);
            addToast('Exercise created successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to create exercise', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateExercise = async () => {
        if (!validateExerciseForm() || !selectedExercise) return;

        try {
            setIsSubmitting(true);
            const updated = await apiClient.updateExercise(selectedExercise.id, {
                title: exerciseFormData.title,
                promptMarkdown: exerciseFormData.promptMarkdown,
                difficulty: exerciseFormData.difficulty,
                language: exerciseFormData.language,
                starterCode: exerciseFormData.starterCode,
                maxCpuMs: exerciseFormData.maxCpuMs,
                maxMemoryKb: exerciseFormData.maxMemoryKb,
            });
            await fetchExercisesForUnit(selectedUnitId);
            setExerciseFormData({
                title: updated.title,
                promptMarkdown: updated.promptMarkdown,
                difficulty: updated.difficulty,
                language: updated.language,
                starterCode: updated.starterCode,
                maxCpuMs: updated.maxCpuMs,
                maxMemoryKb: updated.maxMemoryKb,
            });
            if (expandedExerciseId === selectedExercise.id) {
                setSelectedExercise(updated);
            }
            addToast('Exercise updated successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to update exercise', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteExercise = async (exerciseId: string) => {
        try {
            setIsSubmitting(true);
            await apiClient.deleteExercise(exerciseId);
            setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
            addToast('Exercise deleted successfully', 'success');
            setDeleteConfirm(null);
        } catch (err) {
            const apiError = err as ApiError;
            if (apiError.statusCode === 404) {
                setExercises((prev) => prev.filter((e) => e.id !== exerciseId));
            } else {
                addToast(apiError.message || 'Failed to delete exercise', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Test case handlers
    const handleOpenCreateTestCase = (exercise: ExerciseDetails) => {
        setSelectedExercise(exercise);
        setSelectedTestCaseId(null);
        setTestCaseFormData(INITIAL_TEST_CASE_FORM);
        setFormErrors({});
        setModalState('test-case');
    };

    const handleOpenEditTestCase = (exercise: ExerciseDetails, testCase: TestCase) => {
        setSelectedExercise(exercise);
        setSelectedTestCaseId(testCase.id);
        setTestCaseFormData({
            inputText: testCase.inputText,
            expectedOutput: testCase.expectedOutput,
            isHidden: testCase.isHidden,
            // weight: testCase.weight,
        });
        setFormErrors({});
        setModalState('test-case');
    };

    const handleAddTestCase = async () => {
        if (!validateTestCaseForm() || !selectedExercise) return;

        try {
            setIsSubmitting(true);
            await apiClient.addTestCase(selectedExercise.id, testCaseFormData);
            const updated = await apiClient.getExerciseByIdAdmin(selectedExercise.id);
            await fetchExercisesForUnit(selectedUnitId);
            setSelectedExercise(updated);
            addToast('Test case added successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to add test case', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateTestCase = async () => {
        if (!validateTestCaseForm() || !selectedTestCaseId || !selectedExercise) return;

        try {
            setIsSubmitting(true);
            await apiClient.updateTestCase(selectedTestCaseId, testCaseFormData);
            const updated = await apiClient.getExerciseByIdAdmin(selectedExercise.id);
            await fetchExercisesForUnit(selectedUnitId);
            setSelectedExercise(updated);
            addToast('Test case updated successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to update test case', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTestCase = async (testCaseId: string) => {
        if (!selectedExercise) return;

        try {
            setIsSubmitting(true);
            await apiClient.deleteTestCase(testCaseId);
            const updated = await apiClient.getExerciseByIdAdmin(selectedExercise.id);
            await fetchExercisesForUnit(selectedUnitId);
            setSelectedExercise(updated);
            addToast('Test case deleted successfully', 'success');
            setDeleteConfirm(null);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to delete test case', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Hint handlers
    const handleOpenCreateHint = (exercise: ExerciseDetails) => {
        setSelectedExercise(exercise);
        setSelectedHintId(null);
        setHintFormData(INITIAL_HINT_FORM);
        setFormErrors({});
        setModalState('hint');
    };

    const handleOpenEditHint = (exercise: ExerciseDetails, hint: Hint) => {
        setSelectedExercise(exercise);
        setSelectedHintId(hint.id);
        setHintFormData({
            hintText: hint.hintText,
            unlockAfterFailedAttempts: hint.unlockAfterFailedAttempts,
        });
        setFormErrors({});
        setModalState('hint');
    };

    const handleAddHint = async () => {
        if (!validateHintForm() || !selectedExercise) return;

        try {
            setIsSubmitting(true);
            await apiClient.addHint(selectedExercise.id, {
                hintText: hintFormData.hintText,
                unlockAfterFailedAttempts: hintFormData.unlockAfterFailedAttempts,
            });
            const updated = await apiClient.getExerciseByIdAdmin(selectedExercise.id);
            await fetchExercisesForUnit(selectedUnitId);
            setSelectedExercise(updated);
            addToast('Hint added successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to add hint', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateHint = async () => {
        if (!validateHintForm() || !selectedHintId || !selectedExercise) return;

        try {
            setIsSubmitting(true);
            await apiClient.updateHint(selectedHintId, {
                hintText: hintFormData.hintText,
                unlockAfterFailedAttempts: hintFormData.unlockAfterFailedAttempts,
            });
            const updated = await apiClient.getExerciseByIdAdmin(selectedExercise.id);
            await fetchExercisesForUnit(selectedUnitId);
            setSelectedExercise(updated);
            addToast('Hint updated successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to update hint', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteHint = async (hintId: string) => {
        if (!selectedExercise) return;

        try {
            setIsSubmitting(true);
            await apiClient.deleteHint(hintId);
            const updated = await apiClient.getExerciseByIdAdmin(selectedExercise.id);
            await fetchExercisesForUnit(selectedUnitId);
            setSelectedExercise(updated);
            addToast('Hint deleted successfully', 'success');
            setDeleteConfirm(null);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to delete hint', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFormChange = (field: string, value: any) => {
        if (inlineView && modalState === 'closed' && selectedExercise) {
            setExerciseFormData((prev) => ({...prev, [field]: value}));
        } else if (modalState === 'create') {
            setExerciseFormData((prev) => ({...prev, [field]: value}));
        } else if (modalState === 'test-case') {
            setTestCaseFormData((prev) => ({...prev, [field]: value}));
        } else if (modalState === 'hint') {
            setHintFormData((prev) => ({...prev, [field]: value}));
        }
        if (formErrors[field]) {
            setFormErrors((prev) => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const truncateText = (text: string, maxLength: number = 80): string => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    return (
        <div className="space-y-6 overflow-y-auto">
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

            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
                    <div
                        className="glass-widget-shell rounded-[2rem] p-8 max-w-md">
                        <div className="flex items-center space-x-4 mb-6">
                            <div
                                className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center">
                                <AlertCircle size={24}/>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Delete {deleteConfirm.type}</h3>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mb-8">
                            Are you sure you want to delete "{deleteConfirm.name}"? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-6 py-3 bg-blue-50/70 dark:bg-blue-500/10 text-slate-900 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteConfirm.type === 'exercise') {
                                        handleDeleteExercise(deleteConfirm.id);
                                    } else if (deleteConfirm.type === 'test case') {
                                        handleDeleteTestCase(deleteConfirm.id);
                                    } else if (deleteConfirm.type === 'hint') {
                                        handleDeleteHint(deleteConfirm.id);
                                    }
                                }}
                                className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Loader size={20} className="animate-spin mx-auto"/> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header with Create Button */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                        {inlineView ? 'Exercise Editor' : 'Manage Exercises'}
                    </h2>
                    {!inlineView && (
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} in selected unit
                        </p>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div
                    className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start space-x-4">
                    <div
                        className="w-10 h-10 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle size={24}/>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-red-700 dark:text-red-300">{error}</p>
                        <button
                            onClick={fetchUnitsAndExercises}
                            className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline mt-2"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            )}

            {/* Unit Selection */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader size={32} className="text-slate-400 dark:text-slate-600 animate-spin"/>
                </div>
            ) : (
                <>
                    {!unitId && (
                        <div
                            className="glass-widget-shell rounded-[2rem] shadow-xl shadow-blue-950/10 p-6">
                            <label
                                className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                                Select Unit
                            </label>
                            <select
                                value={selectedUnitId}
                                onChange={(e) => setSelectedUnitId(e.target.value)}
                                className="w-full px-6 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                            >
                                <option value="">Select a unit...</option>
                                {units.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                        {unit.title} (Course: {unit.course.title})
                                    </option>
                                ))}
                            </select>
                            {units.length === 0 && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">No exercise units
                                    available</p>
                            )}
                        </div>
                    )}

                    {/* Exercises List */}
                    {selectedUnitId && (
                        <div className="space-y-4">
                            {exercises.length === 0 ? (
                                <div
                                    className="glass-widget-shell rounded-[2.5rem] shadow-xl shadow-blue-950/10 p-12 flex flex-col items-center justify-center">
                                    <div
                                        className="w-16 h-16 bg-blue-50/70 dark:bg-blue-500/10 text-slate-400 dark:text-slate-600 rounded-full flex items-center justify-center mb-4">
                                        <Code2 size={32}/>
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">No exercises
                                        yet</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-center mb-6">
                                        Create your first exercise for this unit
                                    </p>
                                    <button
                                        onClick={handleOpenCreateExercise}
                                        className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white px-6 py-3 rounded-xl font-bold transition-transform hover:scale-105 flex items-center space-x-2 shadow-lg shadow-pink-600/30"
                                    >
                                        <Plus size={20} strokeWidth={3}/>
                                        <span>Create Exercise</span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {exercises.map((exercise) => (
                                        <div
                                            key={exercise.id}
                                            className="glass-widget-shell rounded-[2rem] shadow-xl shadow-blue-950/10 overflow-hidden"
                                        >
                                            <div className="p-6">
                                                {/* Exercise Header */}
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center space-x-3 mb-2">
                                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                                                {exercise.title}
                                                            </h3>
                                                            <span
                                                                className="px-3 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full text-xs font-bold uppercase">
																{exercise.difficulty}
															</span>
                                                            <span
                                                                className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
																{exercise.language}
															</span>
                                                        </div>
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                                            {truncateText(exercise.promptMarkdown, 150)}
                                                        </p>

                                                        {/* Exercise Stats */}
                                                        <div className="flex items-center space-x-6 text-sm">
                                                            <div
                                                                className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                                                                <Zap size={16}/>
                                                                <span>
																	<strong>{exercise.testCases.length}</strong> test
																	case{exercise.testCases.length !== 1 ? 's' : ''}
																</span>
                                                            </div>
                                                            <div
                                                                className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                                                                <BookOpen size={16}/>
                                                                <span>
																	<strong>{exercise.hints.length}</strong> hint
                                                                    {exercise.hints.length !== 1 ? 's' : ''}
																</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="flex items-center space-x-2 ml-4">
                                                        <button
                                                            onClick={() =>
                                                                setDeleteConfirm({
                                                                    type: 'exercise',
                                                                    id: exercise.id,
                                                                    name: exercise.title,
                                                                })
                                                            }
                                                            className="p-3 bg-blue-50/70 dark:bg-blue-500/10 text-slate-600 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors"
                                                            title="Delete exercise"
                                                        >
                                                            <Trash2 size={18}/>
                                                        </button>
                                                        {!inlineView && (
                                                            <button
                                                                onClick={() =>
                                                                    setExpandedExerciseId(
                                                                        expandedExerciseId === exercise.id ? null : exercise.id
                                                                    )
                                                                }
                                                                className="p-3 bg-blue-50/70 dark:bg-blue-500/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                            >
                                                                {expandedExerciseId === exercise.id ? (
                                                                    <ChevronUp size={18}/>
                                                                ) : (
                                                                    <ChevronDown size={18}/>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {(inlineView || expandedExerciseId === exercise.id) && (
                                                    <div
                                                        className="mt-6 pt-6 border-t border-blue-200/60 dark:border-blue-500/15 space-y-6">
                                                        {inlineView && (
                                                            <div
                                                                className="glass-widget-surface rounded-[1.5rem] p-6 space-y-5">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                                                        Edit Exercise
                                                                    </h4>
                                                                    <button
                                                                        onClick={handleUpdateExercise}
                                                                        className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center space-x-2"
                                                                        disabled={isSubmitting}
                                                                    >
                                                                        {isSubmitting ? (
                                                                            <>
                                                                                <Loader size={18}
                                                                                        className="animate-spin"/>
                                                                                <span>Saving...</span>
                                                                            </>
                                                                        ) : (
                                                                            <span>Save Changes</span>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label
                                                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                                            Title
                                                                        </label>
                                                                        <input
                                                                            type="text"
                                                                            value={exerciseFormData.title}
                                                                            onChange={(e) => handleFormChange('title', e.target.value)}
                                                                            className="w-full px-4 py-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label
                                                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                                            Difficulty
                                                                        </label>
                                                                        <select
                                                                            value={exerciseFormData.difficulty}
                                                                            onChange={(e) =>
                                                                                handleFormChange('difficulty', e.target.value as 'normal' | 'advanced')
                                                                            }
                                                                            className="w-full px-4 py-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                                                                        >
                                                                            {DIFFICULTIES.map((diff) => (
                                                                                <option key={diff} value={diff}>
                                                                                    {diff.charAt(0).toUpperCase() + diff.slice(1)}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <label
                                                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                            Prompt (Markdown)
                                                                        </label>
                                                                        <div
                                                                            className="glass-widget-dark overflow-hidden rounded-2xl">
                                                                            <Editor
                                                                                height="420px"
                                                                                language="markdown"
                                                                                value={exerciseFormData.promptMarkdown}
                                                                                onChange={(value) =>
                                                                                    handleFormChange('promptMarkdown', value ?? '')
                                                                                }
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
                                                                    <div className="space-y-2">
                                                                        <label
                                                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                            Preview
                                                                        </label>
                                                                        <div
                                                                            className="glass-widget-surface rounded-2xl p-5 h-[420px] overflow-y-auto">
                                                                            <MarkdownContent
                                                                                content={exerciseFormData.promptMarkdown || 'Preview will appear here.'}/>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label
                                                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                                            Language
                                                                        </label>
                                                                        <select
                                                                            value={exerciseFormData.language}
                                                                            onChange={(e) => handleFormChange('language', e.target.value)}
                                                                            className="w-full px-4 py-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                                                                        >
                                                                            {LANGUAGES.map((lang) => (
                                                                                <option key={lang} value={lang}>
                                                                                    {lang}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label
                                                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                                            Starter Code
                                                                        </label>
                                                                        <div
                                                                            className="glass-widget-dark overflow-hidden rounded-2xl">
                                                                            <Editor
                                                                                height="240px"
                                                                                language={getMonacoLanguage(exerciseFormData.language)}
                                                                                value={exerciseFormData.starterCode}
                                                                                onChange={(value) =>
                                                                                    handleFormChange('starterCode', value ?? '')
                                                                                }
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
                                                                </div>
                                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label
                                                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                                            Max CPU (ms)
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            min="100"
                                                                            value={exerciseFormData.maxCpuMs}
                                                                            onChange={(e) => handleFormChange('maxCpuMs', parseInt(e.target.value) || 0)}
                                                                            className="w-full px-4 py-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label
                                                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                                                            Max Memory (KB)
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            min="1024"
                                                                            value={exerciseFormData.maxMemoryKb}
                                                                            onChange={(e) => handleFormChange('maxMemoryKb', parseInt(e.target.value) || 0)}
                                                                            className="w-full px-4 py-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Test Cases Section */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                                                    Test Cases ({exercise.testCases.length})
                                                                </h4>
                                                                <button
                                                                    onClick={() => handleOpenCreateTestCase(exercise)}
                                                                    className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center space-x-2"
                                                                >
                                                                    <Plus size={16}/>
                                                                    <span>Add Test Case</span>
                                                                </button>
                                                            </div>

                                                            {exercise.testCases.length === 0 ? (
                                                                <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                                                                    No test cases yet
                                                                </p>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    {exercise.testCases.map((testCase) => (
                                                                        <div
                                                                            key={testCase.id}
                                                                            className="glass-widget-surface p-4 rounded-lg"
                                                                        >
                                                                            <div
                                                                                className="flex items-start justify-between mb-3">
                                                                                <div className="flex-1">
                                                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                                                        Input
                                                                                    </p>
                                                                                    <p className="font-mono text-sm text-slate-700 dark:text-slate-300 glass-widget-inset p-2 rounded break-all whitespace-pre-line">
                                                                                        {testCase.inputText}
                                                                                    </p>
                                                                                </div>
                                                                                <div
                                                                                    className="flex items-center space-x-2 ml-4">
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleOpenEditTestCase(exercise, testCase)
                                                                                        }
                                                                                        className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition-colors"
                                                                                    >
                                                                                        <Edit2 size={14}/>
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            setDeleteConfirm({
                                                                                                type: 'test case',
                                                                                                id: testCase.id,
                                                                                                name: truncateText(testCase.inputText, 40),
                                                                                            })
                                                                                        }
                                                                                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
                                                                                    >
                                                                                        <Trash2 size={14}/>
                                                                                    </button>
                                                                                </div>
                                                                            </div>

                                                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                                                Expected Output
                                                                            </p>
                                                                            <p className="font-mono text-sm text-slate-700 dark:text-slate-300 glass-widget-inset p-2 rounded break-all whitespace-pre-line">
                                                                                {testCase.expectedOutput}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Hints Section */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                                                    Hints ({exercise.hints.length})
                                                                </h4>
                                                                <button
                                                                    onClick={() => handleOpenCreateHint(exercise)}
                                                                    className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center space-x-2"
                                                                >
                                                                    <Plus size={16}/>
                                                                    <span>Add Hint</span>
                                                                </button>
                                                            </div>

                                                            {exercise.hints.length === 0 ? (
                                                                <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
                                                                    No hints yet
                                                                </p>
                                                            ) : (
                                                                <div className="space-y-3">
                                                                    {[...exercise.hints]
                                                                        .sort((a, b) => a.unlockAfterFailedAttempts - b.unlockAfterFailedAttempts)
                                                                        .map((hint, index) => (
                                                                            <div
                                                                                key={hint.id}
                                                                                className="glass-widget-surface p-4 rounded-lg"
                                                                            >
                                                                                <div
                                                                                    className="flex items-start justify-between mb-2">
                                                                                    <div className="flex-1">
                                                                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                                                            Hint {index + 1} - Unlock
                                                                                            after{' '}
                                                                                            {hint.unlockAfterFailedAttempts}{' '}
                                                                                            failed attempt
                                                                                            {hint.unlockAfterFailedAttempts !== 1 ? 's' : ''}
                                                                                        </p>
                                                                                        <p className="text-sm text-slate-700 dark:text-slate-300">
                                                                                            {hint.hintText}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div
                                                                                        className="flex items-center space-x-2 ml-4">
                                                                                        <button
                                                                                            onClick={() => handleOpenEditHint(exercise, hint)}
                                                                                            className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition-colors"
                                                                                        >
                                                                                            <Edit2 size={14}/>
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() =>
                                                                                                setDeleteConfirm({
                                                                                                    type: 'hint',
                                                                                                    id: hint.id,
                                                                                                    name: `Hint ${index + 1}`,
                                                                                                })
                                                                                            }
                                                                                            className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition-colors"
                                                                                        >
                                                                                            <Trash2 size={14}/>
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Exercise Create Modal */}
            {modalState === 'create' && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-40 overflow-y-auto">
                    <div
                        className="glass-widget-shell rounded-[2rem] p-8 max-w-2xl w-full mx-4 my-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                Create Exercise
                            </h3>
                            <button
                                onClick={() => setModalState('closed')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={24} className="text-slate-600 dark:text-slate-400"/>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={exerciseFormData.title}
                                    onChange={(e) => handleFormChange('title', e.target.value)}
                                    placeholder="e.g., FizzBuzz Implementation"
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                                />
                                {formErrors.title && (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.title}</p>
                                )}
                            </div>

                            {/* Prompt */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Prompt (Markdown)
                                    </label>
                                    <div
                                        className="glass-widget-dark overflow-hidden rounded-2xl">
                                        <Editor
                                            height="420px"
                                            language="markdown"
                                            value={exerciseFormData.promptMarkdown}
                                            onChange={(value) => handleFormChange('promptMarkdown', value ?? '')}
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
                                    {formErrors.promptMarkdown && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.promptMarkdown}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Preview
                                    </label>
                                    <div
                                        className="glass-widget-surface rounded-2xl p-5 h-[420px] overflow-y-auto">
                                        <MarkdownContent
                                            content={exerciseFormData.promptMarkdown || 'Preview will appear here.'}/>
                                    </div>
                                </div>
                            </div>

                            {/* Difficulty and Language */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Difficulty
                                    </label>
                                    <select
                                        value={exerciseFormData.difficulty}
                                        onChange={(e) =>
                                            handleFormChange('difficulty', e.target.value as 'normal' | 'advanced')
                                        }
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                                    >
                                        {DIFFICULTIES.map((diff) => (
                                            <option key={diff} value={diff}>
                                                {diff.charAt(0).toUpperCase() + diff.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Language
                                    </label>
                                    <select
                                        value={exerciseFormData.language}
                                        onChange={(e) => handleFormChange('language', e.target.value)}
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                                    >
                                        {LANGUAGES.map((lang) => (
                                            <option key={lang} value={lang}>
                                                {lang}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.language && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.language}</p>
                                    )}
                                </div>
                            </div>

                            {/* Starter Code */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Starter Code
                                </label>
                                <div
                                    className="glass-widget-dark overflow-hidden rounded-2xl">
                                    <Editor
                                        height="280px"
                                        language={getMonacoLanguage(exerciseFormData.language)}
                                        value={exerciseFormData.starterCode}
                                        onChange={(value) => handleFormChange('starterCode', value ?? '')}
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

                            {/* Performance Limits */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Max CPU (ms)
                                    </label>
                                    <input
                                        type="number"
                                        min="100"
                                        value={exerciseFormData.maxCpuMs}
                                        onChange={(e) => handleFormChange('maxCpuMs', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                                    />
                                    {formErrors.maxCpuMs && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.maxCpuMs}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                        Max Memory (KB)
                                    </label>
                                    <input
                                        type="number"
                                        min="1024"
                                        value={exerciseFormData.maxMemoryKb}
                                        onChange={(e) => handleFormChange('maxMemoryKb', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-900 dark:text-white"
                                    />
                                    {formErrors.maxMemoryKb && (
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.maxMemoryKb}</p>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setModalState('closed')}
                                    className="flex-1 px-6 py-3 bg-blue-50/70 dark:bg-blue-500/10 text-slate-900 dark:text-white rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateExercise}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader size={20} className="animate-spin"/>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Create Exercise</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Test Case Modal */}
            {modalState === 'test-case' && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-40 overflow-y-auto">
                    <div
                        className="glass-widget-shell rounded-[2rem] p-8 max-w-2xl w-full mx-4 my-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                {selectedTestCaseId ? 'Edit Test Case' : 'Add Test Case'}
                            </h3>
                            <button
                                onClick={() => setModalState('closed')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={24} className="text-slate-600 dark:text-slate-400"/>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Input */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Input
                                </label>
                                <textarea
                                    value={testCaseFormData.inputText}
                                    onChange={(e) => handleFormChange('inputText', e.target.value)}
                                    placeholder="Enter the input for this test case..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-mono text-sm"
                                />
                                {formErrors.inputText && (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.inputText}</p>
                                )}
                            </div>

                            {/* Expected Output */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Expected Output
                                </label>
                                <textarea
                                    value={testCaseFormData.expectedOutput}
                                    onChange={(e) => handleFormChange('expectedOutput', e.target.value)}
                                    placeholder="Enter the expected output..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white font-mono text-sm"
                                />
                                {formErrors.expectedOutput && (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.expectedOutput}</p>
                                )}
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="checkbox"
                                        id="isHidden"
                                        checked={testCaseFormData.isHidden || false}
                                        onChange={(e) => handleFormChange('isHidden', e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                                    />
                                    <label htmlFor="isHidden"
                                           className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                        Hide this test case
                                    </label>
                                </div>
                                {/*<div>*/}
                                {/*	<label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">*/}
                                {/*		Weight*/}
                                {/*	</label>*/}
                                {/*	<input*/}
                                {/*		type="number"*/}
                                {/*		min="1"*/}
                                {/*		value={testCaseFormData.weight || 1}*/}
                                {/*		onChange={(e) => handleFormChange('weight', parseInt(e.target.value) || 1)}*/}
                                {/*		className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"*/}
                                {/*	/>*/}
                                {/*</div>*/}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setModalState('closed')}
                                    className="flex-1 px-6 py-3 bg-blue-50/70 dark:bg-blue-500/10 text-slate-900 dark:text-white rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={selectedTestCaseId ? handleUpdateTestCase : handleAddTestCase}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader size={20} className="animate-spin"/>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>{selectedTestCaseId ? 'Update' : 'Add'} Test Case</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hint Modal */}
            {modalState === 'hint' && (
                <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-40 overflow-y-auto">
                    <div
                        className="glass-widget-shell rounded-[2rem] p-8 max-w-2xl w-full mx-4 my-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                {selectedHintId ? 'Edit Hint' : 'Add Hint'}
                            </h3>
                            <button
                                onClick={() => setModalState('closed')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={24} className="text-slate-600 dark:text-slate-400"/>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Hint Text */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Hint Content
                                </label>
                                <textarea
                                    value={hintFormData.hintText}
                                    onChange={(e) => handleFormChange('hintText', e.target.value)}
                                    placeholder="Write a helpful hint for the user..."
                                    rows={5}
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                                />
                                {formErrors.hintText && (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{formErrors.hintText}</p>
                                )}
                            </div>

                            {/* Failed Attempts */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Unlock after failed attempts
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={hintFormData.unlockAfterFailedAttempts}
                                    onChange={(e) =>
                                        handleFormChange('unlockAfterFailedAttempts', parseInt(e.target.value) || 1)
                                    }
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                                />
                                {formErrors.unlockAfterFailedAttempts && (
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                        {formErrors.unlockAfterFailedAttempts}
                                    </p>
                                )}
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                    This hint will be shown to the user after they fail this many test cases.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setModalState('closed')}
                                    className="flex-1 px-6 py-3 bg-blue-50/70 dark:bg-blue-500/10 text-slate-900 dark:text-white rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={selectedHintId ? handleUpdateHint : handleAddHint}
                                    className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader size={20} className="animate-spin"/>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>{selectedHintId ? 'Update' : 'Add'} Hint</span>
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
