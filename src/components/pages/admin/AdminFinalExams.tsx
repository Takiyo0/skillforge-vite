import {useState, useEffect} from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    AlertCircle,
    Loader,
    X,
    CheckCircle,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import type {Unit, FinalExam, ApiError} from '@skillforge/vite/lib/types';
import {apiClient} from '@skillforge/vite/lib/api';
import {MarkdownContent} from '@skillforge/vite/components/ui/MarkdownContent';
import {MarkdownEditor} from '@skillforge/vite/components/ui/MarkdownEditor';

interface AdminFinalExamsProps {
    unitId?: string;
    unit?: Unit | null;
}

type ModalState = 'closed' | 'create-question' | 'edit-question' | 'create-option' | 'edit-option';

interface QuestionComponent {
    id: string;
    type: string;
    prompt: string;
    explanation?: string;
    points: number | string;
    answerMultiple?: boolean;
    options?: Array<{
        id: string;
        label: string;
        isCorrect?: boolean;
    }>;
}

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface QuestionFormData {
    prompt: string;
    explanation: string;
    points: number;
    options: Array<{ label: string; isCorrect: boolean; tempId?: string }>;
}

interface OptionFormData {
    label: string;
    isCorrect: boolean;
}

const INITIAL_QUESTION_FORM: QuestionFormData = {
    prompt: '',
    explanation: '',
    points: 10,
    options: [],
};

const INITIAL_OPTION_FORM: OptionFormData = {
    label: '',
    isCorrect: false,
};

export function AdminFinalExams({unitId, unit: initialUnit}: AdminFinalExamsProps = {}) {
    const inlineView = Boolean(unitId);
    // State for units and final exams
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState<string>(unitId ?? '');
    const [finalExam, setFinalExam] = useState<FinalExam | null>(null);
    const [questions, setQuestions] = useState<QuestionComponent[]>([]);

    // State for loading and errors
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // State for modal and forms
    const [modalState, setModalState] = useState<ModalState>('closed');
    const [questionFormData, setQuestionFormData] = useState<QuestionFormData>(INITIAL_QUESTION_FORM);

    // State for selected items
    const [selectedQuestion, setSelectedQuestion] = useState<QuestionComponent | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; prompt: string } | null>(null);
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

    // State for options management
    const [optionFormData, setOptionFormData] = useState<OptionFormData>(INITIAL_OPTION_FORM);
    const [selectedOption, setSelectedOption] = useState<{ id: string; label: string } | null>(null);
    const [optionDeleteConfirm, setOptionDeleteConfirm] = useState<{ id: string; label: string } | null>(null);

    // State for UI
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch units on mount
    useEffect(() => {
        fetchUnitsAndExams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (unitId) {
            setSelectedUnitId(unitId);
        }
    }, [unitId]);

    // Fetch final exam when unit changes
    useEffect(() => {
        if (selectedUnitId && (!inlineView || !initialUnit)) {
            fetchFinalExam(selectedUnitId);
        }
    }, [selectedUnitId, inlineView, initialUnit]);

    const fetchUnitsAndExams = async () => {
        try {
            setLoading(true);
            setError(null);
            if (unitId) {
                const activeUnit = initialUnit && initialUnit.id === unitId ? initialUnit : await apiClient.getUnitByIdAdmin(unitId);
                if (activeUnit.type !== 'final_exam') {
                    setUnits([]);
                    setFinalExam(null);
                    setQuestions([]);
                    return;
                }
                setUnits([activeUnit]);
                setSelectedUnitId(activeUnit.id);
                if (activeUnit.finalExam) {
                    setFinalExam(activeUnit.finalExam);
                    setQuestions(extractQuestionsFromExam(activeUnit.finalExam));
                } else {
                    setFinalExam(null);
                    setQuestions([]);
                }
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
                    title: course.title,
                    slug: course.slug,
                };
                allUnits.push(
                    ...courseUnits.map((unit: any) => ({
                        ...unit,
                        course: courseInfo,
                    }))
                );
            }

            // Filter to final_exam units
            const finalExamUnits = allUnits.filter((u) => u.type === 'final_exam');
            setUnits(finalExamUnits);

            // Set default selected unit
            if (finalExamUnits.length > 0) {
                setSelectedUnitId(finalExamUnits[0].id);
            }
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Failed to fetch units');
            addToast('Failed to load units', 'error');
        } finally {
            setLoading(false);
        }
    };

    const extractQuestionsFromExam = (exam: FinalExam): QuestionComponent[] => {
        // The components array IS the questions array
        return (exam.components as QuestionComponent[]) || [];
    };

    const fetchFinalExam = async (unitId: string, forceRefresh = false) => {
        try {
            const unit = await apiClient.getUnitByIdAdmin(unitId, {forceRefresh});
            if (unit.finalExam) {
                setFinalExam(unit.finalExam);
                setQuestions(extractQuestionsFromExam(unit.finalExam));
            } else {
                setFinalExam(null);
                setQuestions([]);
            }
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to fetch final exam', 'error');
        }
    };

    const addToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, {id, message, type}]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    };

    const handleOpenCreateQuestion = () => {
        setSelectedQuestion(null);
        setQuestionFormData(INITIAL_QUESTION_FORM);
        setModalState('create-question');
    };

    const handleOpenEditQuestion = (question: QuestionComponent) => {
        setSelectedQuestion(question);
        setQuestionFormData({
            prompt: question.prompt,
            explanation: question.explanation || '',
            points: typeof question.points === 'string' ? parseInt(question.points) : question.points || 10,
            options: [],
        });
        setModalState('edit-question');
    };

    const handleSaveQuestion = async () => {
        if (!selectedUnitId) return;

        // Validate
        if (!questionFormData.prompt.trim()) {
            addToast('Question prompt is required', 'error');
            return;
        }

        try {
            setIsSubmitting(true);

            if (selectedQuestion) {
                // Update question
                await apiClient.updateFinalExamQuestion(
                    selectedUnitId,
                    selectedQuestion.id,
                    {
                        prompt: questionFormData.prompt,
                        explanation: questionFormData.explanation,
                        points: questionFormData.points,
                    }
                );
                addToast('Question updated successfully', 'success');
            } else {
                // Create question with options
                const options = questionFormData.options
                    .filter(opt => opt.label.trim())
                    .map(opt => {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const {tempId, ...rest} = opt;
                        return rest;
                    });

                await apiClient.createFinalExamQuestion(
                    selectedUnitId,
                    {
                        prompt: questionFormData.prompt,
                        explanation: questionFormData.explanation,
                        points: questionFormData.points,
                        options: options.length > 0 ? options : [],
                    }
                );
                addToast('Question created successfully', 'success');
            }

            // Refetch to get fresh data
            await fetchFinalExam(selectedUnitId, true);

            setModalState('closed');
            setSelectedQuestion(null);
            setQuestionFormData(INITIAL_QUESTION_FORM);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to save question', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteQuestion = async () => {
        if (!deleteConfirm || !selectedUnitId) return;

        try {
            setIsSubmitting(true);
            await apiClient.deleteFinalExamQuestion(
                selectedUnitId,
                deleteConfirm.id
            );
            addToast('Question deleted successfully', 'success');
            setDeleteConfirm(null);

            // Refetch to get fresh data
            await fetchFinalExam(selectedUnitId, true);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to delete question', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveOption = async () => {
        if (!selectedQuestion || !selectedUnitId) return;

        // Validate
        if (!optionFormData.label.trim()) {
            addToast('Option label is required', 'error');
            return;
        }

        try {
            setIsSubmitting(true);

            if (selectedOption) {
                // Update option
                await apiClient.updateFinalExamOption(
                    selectedUnitId,
                    selectedQuestion.id,
                    selectedOption.id,
                    optionFormData.label,
                    optionFormData.isCorrect
                );
                addToast('Option updated successfully', 'success');
            } else {
                // Create option
                await apiClient.createFinalExamOption(
                    selectedUnitId,
                    selectedQuestion.id,
                    optionFormData.label,
                    optionFormData.isCorrect,
                );
                addToast('Option created successfully', 'success');
            }

            // Refetch to get fresh data
            await fetchFinalExam(selectedUnitId, true);

            setModalState('closed');
            setSelectedOption(null);
            setOptionFormData(INITIAL_OPTION_FORM);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to save option', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteOption = async () => {
        if (!optionDeleteConfirm || !selectedQuestion || !selectedUnitId) return;

        try {
            setIsSubmitting(true);
            await apiClient.deleteFinalExamOption(
                selectedUnitId,
                selectedQuestion.id,
                optionDeleteConfirm.id
            );
            addToast('Option deleted successfully', 'success');
            setOptionDeleteConfirm(null);

            // Refetch to get fresh data
            await fetchFinalExam(selectedUnitId, true);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to delete option', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenCreateOption = () => {
        setSelectedOption(null);
        setOptionFormData(INITIAL_OPTION_FORM);
        setModalState('create-option');
    };

    const handleOpenEditOption = (question: QuestionComponent, option: {
        id: string;
        label: string;
        isCorrect?: boolean
    }) => {
        setSelectedQuestion(question);
        setSelectedOption({id: option.id, label: option.label});
        setOptionFormData({
            label: option.label,
            isCorrect: option.isCorrect || false,
        });
        setModalState('edit-option');
    };

    // Helper functions for managing options during question creation
    const addOptionToQuestion = () => {
        setQuestionFormData({
            ...questionFormData,
            options: [
                ...questionFormData.options,
                {
                    label: '',
                    isCorrect: false,
                    tempId: `temp-${Date.now()}-${Math.random()}`,
                },
            ],
        });
    };

    const removeOptionFromQuestion = (tempId?: string) => {
        setQuestionFormData({
            ...questionFormData,
            options: questionFormData.options.filter(opt => opt.tempId !== tempId),
        });
    };

    const updateOptionInQuestion = (tempId: string | undefined, label: string, isCorrect: boolean) => {
        setQuestionFormData({
            ...questionFormData,
            options: questionFormData.options.map(opt =>
                opt.tempId === tempId ? {...opt, label, isCorrect} : opt
            ),
        });
    };

    return (
        <div className="space-y-8">
            {/* Toast Notifications */}
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`fixed top-4 right-4 px-6 py-4 rounded-2xl text-white font-bold flex items-center gap-3 z-50 ${
                        toast.type === 'success'
                            ? 'bg-emerald-500'
                            : toast.type === 'error'
                                ? 'bg-red-500'
                                : 'bg-blue-500'
                    }`}
                >
                    {toast.type === 'success' && <CheckCircle size={20}/>}
                    {toast.type === 'error' && <AlertCircle size={20}/>}
                    {toast.message}
                </div>
            ))}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <Loader size={32} className="text-blue-600 animate-spin"/>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div
                    className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                        <AlertCircle size={24} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-1"/>
                        <div>
                            <h3 className="font-black text-red-900 dark:text-red-100">Error Loading Final Exams</h3>
                            <p className="text-red-700 dark:text-red-300 mt-2">{error}</p>
                            <button
                                onClick={fetchUnitsAndExams}
                                className="mt-3 text-red-700 dark:text-red-300 font-bold hover:underline text-sm"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Unit Selection */}
                    {!unitId && (
                        <div
                            className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 shadow-xl shadow-blue-950/10 p-6">
                            <label
                                className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                                Select Final Exam Unit
                            </label>
                            <select
                                value={selectedUnitId}
                                onChange={(e) => setSelectedUnitId(e.target.value)}
                                className="w-full px-6 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                            >
                                <option value="">Select a unit...</option>
                                {units.map((unit) => (
                                    <option key={unit.id} value={unit.id}>
                                        {unit.title} (Course: {unit.course.title})
                                    </option>
                                ))}
                            </select>
                            {units.length === 0 && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">
                                    No final exam units available. Create one from the Units page.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Questions Section */}
                    {selectedUnitId && inlineView ? (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Final Exam Editor</h2>

                            {finalExam ? (
                                <>
                                    <div
                                        className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white">{finalExam.title}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div>
                                                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Passing
                                                    Score</p>
                                                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{finalExam.passingScore}%</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Max
                                                    Attempts</p>
                                                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{finalExam.maxAttempts}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time
                                                    Limit</p>
                                                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{Math.round(finalExam.timeLimitSeconds / 60)} min</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Questions</p>
                                                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{questions.length}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {questions.length === 0 ? (
                                        <div
                                            className="bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                                            <p className="text-slate-600 dark:text-slate-400 font-medium">No questions
                                                yet</p>
                                            <button
                                                onClick={handleOpenCreateQuestion}
                                                className="mt-4 flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-2 rounded-2xl font-bold transition-transform hover:scale-105 mx-auto"
                                            >
                                                <Plus size={20}/>
                                                <span>Create Question</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {questions.map((question, idx) => (
                                                <div
                                                    key={question.id}
                                                    className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 p-4"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
																<span
                                                                    className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-black rounded">
																	Q{idx + 1}
																</span>
                                                                <span
                                                                    className="inline-block px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-bold rounded">
																	{question.points} pts
																</span>
                                                            </div>
                                                            <MarkdownContent
                                                                content={question.prompt}
                                                                className="text-slate-900 dark:text-white font-medium [&_p]:my-0 [&_pre]:my-2"
                                                            />
                                                            {question.explanation && (
                                                                <MarkdownContent
                                                                    content={question.explanation}
                                                                    className="mt-2 text-sm text-slate-600 dark:text-slate-400 [&_p]:my-1 [&_pre]:my-2"
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 ml-4">
                                                            <button
                                                                onClick={() => handleOpenEditQuestion(question)}
                                                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-2xl transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={18}/>
                                                            </button>
                                                            <button
                                                                onClick={() => setDeleteConfirm({
                                                                    id: question.id,
                                                                    prompt: question.prompt
                                                                })}
                                                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-2xl transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={18}/>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className="mt-4 pt-4 border-t border-blue-200/60 dark:border-blue-500/15 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Options</p>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedQuestion(question);
                                                                    handleOpenCreateOption();
                                                                }}
                                                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                            >
                                                                + Add Option
                                                            </button>
                                                        </div>
                                                        {question.options && question.options.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {question.options.map((option) => (
                                                                    <div
                                                                        key={option.id}
                                                                        className="flex items-start gap-3 p-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50 rounded-2xl border border-blue-200/60 dark:border-blue-500/15"
                                                                    >
                                                                        <div className="flex items-center mt-1">
                                                                            {option.isCorrect ? (
                                                                                <CheckCircle size={20}
                                                                                             className="text-emerald-500"/>
                                                                            ) : (
                                                                                <div
                                                                                    className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600"/>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <MarkdownContent
                                                                                content={option.label}
                                                                                className="text-sm font-medium text-slate-900 dark:text-white [&_p]:my-0 [&_pre]:my-2"
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={() => handleOpenEditOption(question, option)}
                                                                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded transition-colors"
                                                                                title="Edit"
                                                                            >
                                                                                <Edit2 size={16}/>
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setSelectedQuestion(question);
                                                                                    setOptionDeleteConfirm({
                                                                                        id: option.id,
                                                                                        label: option.label,
                                                                                    });
                                                                                }}
                                                                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded transition-colors"
                                                                                title="Delete"
                                                                            >
                                                                                <Trash2 size={16}/>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-4">
                                                                <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">No
                                                                    options added yet</p>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedQuestion(question);
                                                                        handleOpenCreateOption();
                                                                    }}
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-sm transition-colors"
                                                                >
                                                                    <Plus size={16}/>
                                                                    Add First Option
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            <button
                                                onClick={handleOpenCreateQuestion}
                                                className="w-full mt-4 py-3 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-2xl font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus size={20}/>
                                                Add Question
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div
                                    className="rounded-2xl glass-shell p-8 text-center">
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">No questions
                                        yet</p>
                                    <p className="text-slate-500 dark:text-slate-400 mb-6">Start by creating your first
                                        question.</p>
                                    <button
                                        onClick={handleOpenCreateQuestion}
                                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-3 rounded-2xl font-bold transition-transform hover:scale-105"
                                    >
                                        <Plus size={20}/>
                                        <span>Create Question</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : selectedUnitId && (
                        <div className="space-y-4">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Questions</h2>

                            {/* Final Exam Info */}
                            {finalExam && (
                                <div
                                    className="bg-gradient-to-r from-blue-50 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Title
                                            </p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                                {finalExam.title}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Passing Score
                                            </p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                                {finalExam.passingScore}%
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Max Attempts
                                            </p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                                {finalExam.maxAttempts}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                Time Limit
                                            </p>
                                            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                                                {Math.round(finalExam.timeLimitSeconds / 60)} min
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!finalExam && (
                                <div
                                    className="rounded-2xl glass-shell p-8 text-center text-center">
                                    <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                        No questions yet
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                                        Start by creating your first question.
                                    </p>
                                    <button
                                        onClick={handleOpenCreateQuestion}
                                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-3 rounded-2xl font-bold transition-transform hover:scale-105"
                                    >
                                        <Plus size={20}/>
                                        <span>Create Question</span>
                                    </button>
                                </div>
                            )}

                            {/* Questions List */}
                            {finalExam && questions.length === 0 ? (
                                <div
                                    className="bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                                        No questions yet
                                    </p>
                                    <button
                                        onClick={handleOpenCreateQuestion}
                                        className="mt-4 flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-2 rounded-2xl font-bold transition-transform hover:scale-105 mx-auto"
                                    >
                                        <Plus size={20}/>
                                        <span>Create Question</span>
                                    </button>
                                </div>
                            ) : finalExam ? (
                                <div className="space-y-3">
                                    {questions.map((question, idx) => (
                                        <div
                                            key={question.id}
                                            className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 hover:shadow-md transition-shadow overflow-hidden"
                                        >
                                            {/* Question Header */}
                                            <div className="p-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
															<span
                                                                className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-black rounded">
																Q{idx + 1}
															</span>
                                                            <span
                                                                className="inline-block px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-bold rounded">
																{question.points} pts
															</span>
                                                        </div>
                                                        <MarkdownContent
                                                            content={question.prompt}
                                                            className="text-slate-900 dark:text-white font-medium [&_p]:my-0 [&_pre]:my-2"
                                                        />
                                                        {question.explanation && (
                                                            <MarkdownContent
                                                                content={question.explanation}
                                                                className="mt-2 text-sm text-slate-600 dark:text-slate-400 [&_p]:my-1 [&_pre]:my-2"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 ml-4">
                                                        <button
                                                            onClick={() => handleOpenEditQuestion(question)}
                                                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-2xl transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={18}/>
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setDeleteConfirm({
                                                                    id: question.id,
                                                                    prompt: question.prompt,
                                                                })
                                                            }
                                                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-2xl transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={18}/>
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setExpandedQuestion(expandedQuestion === question.id ? null : question.id)
                                                            }
                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl transition-colors"
                                                            title={expandedQuestion === question.id ? 'Collapse' : 'Expand'}
                                                        >
                                                            {expandedQuestion === question.id ? (
                                                                <ChevronUp size={18}/>
                                                            ) : (
                                                                <ChevronDown size={18}/>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Options Section - Expanded */}
                                            {expandedQuestion === question.id && (
                                                <div
                                                    className="border-t border-blue-200/60 dark:border-blue-500/15 p-4 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50">
                                                    {question.options && question.options.length > 0 ? (
                                                        <div className="space-y-3">
                                                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm">
                                                                Options ({question.options.length})
                                                            </h4>
                                                            {question.options.map((option) => (
                                                                <div
                                                                    key={option.id}
                                                                    className="flex items-start gap-3 p-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded border border-blue-200/60 dark:border-blue-500/15"
                                                                >
                                                                    <div className="flex items-center mt-1">
                                                                        {option.isCorrect ? (
                                                                            <CheckCircle size={20}
                                                                                         className="text-emerald-500"/>
                                                                        ) : (
                                                                            <div
                                                                                className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600"/>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <MarkdownContent
                                                                            content={option.label}
                                                                            className="text-sm font-medium text-slate-900 dark:text-white [&_p]:my-0 [&_pre]:my-2"
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => handleOpenEditOption(question, option)}
                                                                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded transition-colors"
                                                                            title="Edit"
                                                                        >
                                                                            <Edit2 size={16}/>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedQuestion(question);
                                                                                setOptionDeleteConfirm({
                                                                                    id: option.id,
                                                                                    label: option.label,
                                                                                });
                                                                            }}
                                                                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded transition-colors"
                                                                            title="Delete"
                                                                        >
                                                                            <Trash2 size={16}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedQuestion(question);
                                                                    handleOpenCreateOption();
                                                                }}
                                                                className="w-full mt-2 py-2 border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 rounded font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-sm flex items-center justify-center gap-2"
                                                            >
                                                                <Plus size={16}/>
                                                                Add Option
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4">
                                                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
                                                                No options added yet
                                                            </p>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedQuestion(question);
                                                                    handleOpenCreateOption();
                                                                }}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-sm transition-colors"
                                                            >
                                                                <Plus size={16}/>
                                                                Add First Option
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        onClick={handleOpenCreateQuestion}
                                        className="w-full mt-4 py-3 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-2xl font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={20}/>
                                        Add Question
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )}
                </>
            )}

            {/* Create/Edit Question Modal */}
            {(modalState === 'create-question' || modalState === 'edit-question') && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div
                            className="sticky top-0 flex items-center justify-between p-6 border-b border-blue-200/60 dark:border-blue-500/15 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                {selectedQuestion ? 'Edit Question' : 'Create Question'}
                            </h3>
                            <button
                                onClick={() => setModalState('closed')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl"
                            >
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <MarkdownEditor
                                label="Question Prompt"
                                required
                                value={questionFormData.prompt}
                                onChange={(value) => setQuestionFormData({...questionFormData, prompt: value})}
                                height="220px"
                            />

                            {/* Points */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Points
                                </label>
                                <input
                                    type="number"
                                    min={1}
                                    value={questionFormData.points}
                                    onChange={(e) =>
                                        setQuestionFormData({
                                            ...questionFormData,
                                            points: Math.max(1, parseInt(e.target.value) || 1),
                                        })
                                    }
                                    className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <MarkdownEditor
                                label="Explanation"
                                value={questionFormData.explanation}
                                onChange={(value) => setQuestionFormData({...questionFormData, explanation: value})}
                                height="180px"
                            />

                            {/* Options - Only show when creating */}
                            {!selectedQuestion && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                            Options (Optional - Add later if needed)
                                        </label>
                                        <button
                                            onClick={addOptionToQuestion}
                                            className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors"
                                        >
                                            + Add Option
                                        </button>
                                    </div>

                                    {questionFormData.options.length > 0 ? (
                                        <div className="space-y-3">
                                            {questionFormData.options.map((option, idx) => (
                                                <div
                                                    key={option.tempId}
                                                    className="bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm p-4 rounded-2xl border border-blue-200/60 dark:border-blue-500/15 space-y-3"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
														<span
                                                            className="inline-block px-2 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded">
															Option {idx + 1}
														</span>
                                                    </div>
                                                    <MarkdownEditor
                                                        label="Option Text"
                                                        value={option.label}
                                                        onChange={(value) =>
                                                            updateOptionInQuestion(option.tempId, value, option.isCorrect)
                                                        }
                                                        height="150px"
                                                    />
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                id={`isCorrect-${option.tempId}`}
                                                                checked={option.isCorrect}
                                                                onChange={(e) =>
                                                                    updateOptionInQuestion(option.tempId, option.label, e.target.checked)
                                                                }
                                                                className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 accent-emerald-600 cursor-pointer"
                                                            />
                                                            <label
                                                                htmlFor={`isCorrect-${option.tempId}`}
                                                                className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                                                            >
                                                                Mark as correct
                                                            </label>
                                                        </div>
                                                        <button
                                                            onClick={() => removeOptionFromQuestion(option.tempId)}
                                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded transition-colors"
                                                            title="Remove option"
                                                        >
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                                            No options added yet. Click "Add Option" to add options for this question.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div
                            className="flex gap-3 p-6 border-t border-blue-200/60 dark:border-blue-500/15 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50">
                            <button
                                onClick={() => setModalState('closed')}
                                className="glass-button-secondary flex-1 px-4 py-3 text-slate-900 dark:text-white rounded-2xl font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveQuestion}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white rounded-2xl font-bold transition-colors"
                            >
                                {isSubmitting ? 'Saving...' : selectedQuestion ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Option Modal */}
            {(modalState === 'create-option' || modalState === 'edit-option') && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div
                            className="sticky top-0 flex items-center justify-between p-6 border-b border-blue-200/60 dark:border-blue-500/15 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                {selectedOption ? 'Edit Option' : 'Create Option'}
                            </h3>
                            <button
                                onClick={() => setModalState('closed')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl"
                            >
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <MarkdownEditor
                                label="Option Label"
                                required
                                value={optionFormData.label}
                                onChange={(value) => setOptionFormData({...optionFormData, label: value})}
                                height="180px"
                            />

                            {/* Is Correct */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="isCorrect"
                                    checked={optionFormData.isCorrect}
                                    onChange={(e) =>
                                        setOptionFormData({...optionFormData, isCorrect: e.target.checked})
                                    }
                                    className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 accent-emerald-600 cursor-pointer"
                                />
                                <label htmlFor="isCorrect"
                                       className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Mark as correct answer
                                </label>
                            </div>
                        </div>

                        <div
                            className="flex gap-3 p-6 border-t border-blue-200/60 dark:border-blue-500/15 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50">
                            <button
                                onClick={() => setModalState('closed')}
                                className="glass-button-secondary flex-1 px-4 py-3 text-slate-900 dark:text-white rounded-2xl font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveOption}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white rounded-2xl font-bold transition-colors"
                            >
                                {isSubmitting ? 'Saving...' : selectedOption ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Question Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                                Delete Question?
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                Are you sure you want to delete: "{deleteConfirm.prompt}"?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="glass-button-secondary flex-1 px-4 py-3 text-slate-900 dark:text-white rounded-2xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteQuestion}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-400 text-white rounded-2xl font-bold transition-colors"
                                >
                                    {isSubmitting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Option Confirmation Modal */}
            {optionDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-2xl border border-blue-200/60 dark:border-blue-500/15 max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                                Delete Option?
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                Are you sure you want to delete: "{optionDeleteConfirm.label}"?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setOptionDeleteConfirm(null)}
                                    className="glass-button-secondary flex-1 px-4 py-3 text-slate-900 dark:text-white rounded-2xl font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteOption}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-400 text-white rounded-2xl font-bold transition-colors"
                                >
                                    {isSubmitting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
