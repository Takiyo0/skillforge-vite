import {useState, useEffect} from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    AlertCircle,
    Loader,
    ChevronDown,
    ChevronUp,
    X,
    CheckCircle,
    Circle,
} from 'lucide-react';
import type {Unit, Quiz, QuizQuestion, QuizOption, ApiError} from '@skillforge/vite/lib/types';
import {apiClient} from '@skillforge/vite/lib/api';
import {MarkdownContent} from '@skillforge/vite/components/ui/MarkdownContent';
import {MarkdownEditor} from '@skillforge/vite/components/ui/MarkdownEditor';

interface AdminQuizzesProps {
    unitId?: string;
    unit?: Unit | null;
}

type ModalState =
    'closed'
    | 'create-quiz'
    | 'edit-quiz'
    | 'create-question'
    | 'edit-question'
    | 'create-option'
    | 'edit-option';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface QuizFormData {
    title: string;
    instructions: string;
    passingScore: number;
    timeLimitSeconds: number;
    randomizeQuestions: boolean;
    randomizeOptions: boolean;
}

interface QuestionFormData {
    prompt: string;
    points: number;
    explanation?: string;
    options: Array<{ label: string; isCorrect: boolean; tempId?: string }>;
}

interface OptionFormData {
    label: string;
    isCorrect: boolean;
}

const INITIAL_QUIZ_FORM: QuizFormData = {
    title: '',
    instructions: '',
    passingScore: 70,
    timeLimitSeconds: 3600,
    randomizeQuestions: false,
    randomizeOptions: false,
};

const INITIAL_QUESTION_FORM: QuestionFormData = {
    prompt: '',
    points: 1,
    explanation: '',
    options: [],
};

const INITIAL_OPTION_FORM: OptionFormData = {
    label: '',
    isCorrect: false,
};

export function AdminQuizzes({unitId, unit: initialUnit}: AdminQuizzesProps = {}) {
    const inlineView = Boolean(unitId);
    // State for units and quizzes
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedUnitId, setSelectedUnitId] = useState<string>(unitId ?? '');
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);

    // State for loading and errors
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // State for modal and forms
    const [modalState, setModalState] = useState<ModalState>('closed');
    const [quizFormData, setQuizFormData] = useState<QuizFormData>(INITIAL_QUIZ_FORM);
    const [questionFormData, setQuestionFormData] = useState<QuestionFormData>(INITIAL_QUESTION_FORM);
    const [optionFormData, setOptionFormData] = useState<OptionFormData>(INITIAL_OPTION_FORM);

    // State for selected items
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [selectedQuestion, setSelectedQuestion] = useState<QuizQuestion | null>(null);
    const [selectedOption, setSelectedOption] = useState<QuizOption | null>(null);

    // State for UI
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
    const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; name: string } | null>(null);

    // Fetch units on mount
    useEffect(() => {
        fetchUnitsAndQuizzes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (unitId) {
            setSelectedUnitId(unitId);
        }
    }, [unitId]);

    // Fetch quizzes when unit changes
    useEffect(() => {
        if (selectedUnitId && (!inlineView || !initialUnit)) {
            fetchQuizzesForUnit(selectedUnitId);
        }
    }, [selectedUnitId, inlineView, initialUnit]);

    useEffect(() => {
        if (inlineView && selectedQuiz) {
            setQuizFormData({
                title: selectedQuiz.title,
                instructions: selectedQuiz.instructions || '',
                passingScore: selectedQuiz.passingScore || 70,
                timeLimitSeconds: selectedQuiz.timeLimitSeconds || 3600,
                randomizeQuestions: selectedQuiz.randomizeQuestions || false,
                randomizeOptions: selectedQuiz.randomizeOptions || false,
            });
        }
    }, [inlineView, selectedQuiz]);

    const fetchUnitsAndQuizzes = async () => {
        try {
            setLoading(true);
            setError(null);
            if (unitId) {
                const activeUnit = initialUnit && initialUnit.id === unitId ? initialUnit : await apiClient.getUnitByIdAdmin(unitId);
                if (activeUnit.type !== 'assessment') {
                    setUnits([]);
                    setQuizzes([]);
                    return;
                }
                setUnits([activeUnit]);
                setSelectedUnitId(activeUnit.id);
                setQuizzes(activeUnit.quiz ? [activeUnit.quiz] : []);
                setSelectedQuiz(activeUnit.quiz ?? null);
                setExpandedQuizId(activeUnit.quiz ? activeUnit.quiz.id : null);
                return;
            }
            const courses = await apiClient.getInstructorCourses();

            // Fetch all units from all courses (using admin endpoint data)
            const allUnits: Unit[] = [];
            for (const course of courses) {
                // Use units from course object (fetched via admin endpoint)
                const courseUnits = course.units || [];
                allUnits.push(...courseUnits.map((unit) => ({...unit, courseId: course.id} as Unit)));
            }

            // Filter to assessment units (quizzes)
            const assessmentUnits = allUnits.filter((u) => u.type === 'assessment');
            setUnits(assessmentUnits);

            // Set default selected unit
            if (assessmentUnits.length > 0) {
                setSelectedUnitId(assessmentUnits[0].id);
            }
        } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || 'Failed to fetch units');
            addToast('Failed to load units', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuizzesForUnit = async (unitId: string, forceRefresh = false) => {
        try {
            const unit = await apiClient.getUnitByIdAdmin(unitId, {forceRefresh});
            if (unit.quiz) {
                setQuizzes([unit.quiz]);
                setSelectedQuiz(unit.quiz);
            } else {
                setQuizzes([]);
                setSelectedQuiz(null);
            }
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to fetch quiz', 'error');
            setQuizzes([]);
        }
    };

    const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, {id, message, type}]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000);
    };

    const validateQuizForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!quizFormData.title.trim()) errors.title = 'Title is required';
        if (quizFormData.passingScore < 0 || quizFormData.passingScore > 100)
            errors.passingScore = 'Passing score must be between 0 and 100';
        if (quizFormData.timeLimitSeconds < 1) errors.timeLimitSeconds = 'Time limit must be greater than 0';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateQuestionForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!questionFormData.prompt.trim()) errors.prompt = 'Prompt is required';
        if (questionFormData.points < 1) errors.points = 'Points must be at least 1';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const validateOptionForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!optionFormData.label.trim()) errors.label = 'Label is required';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Quiz handlers
    const handleOpenCreateQuiz = () => {
        setSelectedQuiz(null);
        setQuizFormData(INITIAL_QUIZ_FORM);
        setFormErrors({});
        setModalState('create-quiz');
    };

    const handleOpenEditQuiz = (quiz: Quiz) => {
        setSelectedQuiz(quiz);
        setQuizFormData({
            title: quiz.title,
            instructions: quiz.instructions || '',
            passingScore: quiz.passingScore || 70,
            timeLimitSeconds: quiz.timeLimitSeconds || 3600,
            randomizeQuestions: quiz.randomizeQuestions || false,
            randomizeOptions: quiz.randomizeOptions || false,
        });
        setFormErrors({});
        setModalState('edit-quiz');
    };

    const handleCreateQuiz = async () => {
        if (!validateQuizForm() || !selectedUnitId) return;

        try {
            setIsSubmitting(true);
            const newQuiz = await apiClient.createQuiz(selectedUnitId, quizFormData);
            setQuizzes([newQuiz]);
            setSelectedQuiz(newQuiz);
            addToast('Quiz created successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to create quiz', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateQuiz = async () => {
        if (!validateQuizForm() || !selectedQuiz) return;

        try {
            setIsSubmitting(true);
            const updated = await apiClient.updateQuiz(selectedQuiz.id, quizFormData);
            await fetchQuizzesForUnit(selectedUnitId, true);
            setSelectedQuiz(updated);
            addToast('Quiz updated successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to update quiz', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteQuiz = async (quizId: string) => {
        try {
            setIsSubmitting(true);
            await apiClient.deleteQuiz(quizId);
            setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
            addToast('Quiz deleted successfully', 'success');
            setDeleteConfirm(null);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to delete quiz', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Question handlers
    const handleOpenCreateQuestion = (quiz: Quiz) => {
        setSelectedQuiz(quiz);
        setSelectedQuestion(null);
        setQuestionFormData({
            ...INITIAL_QUESTION_FORM,
            // position: (quiz.questions?.length || 0) + 1,
        });
        setFormErrors({});
        setModalState('create-question');
    };

    const handleOpenEditQuestion = (question: QuizQuestion) => {
        setSelectedQuestion(question);
        setQuestionFormData({
            prompt: question.prompt,
            // questionType: question.questionType,
            points: question.points,
            // position: question.position,
            explanation: question.explanation || '',
            options: [],
        });
        setFormErrors({});
        setModalState('edit-question');
    };

    const handleCreateQuestion = async () => {
        if (!validateQuestionForm() || !selectedQuiz) return;

        try {
            setIsSubmitting(true);
            const options = questionFormData.options
                .filter((option) => option.label.trim())
                .map((option) => ({
                    label: option.label,
                    isCorrect: option.isCorrect,
                }));

            await apiClient.addQuizQuestion(selectedQuiz.id, {
                prompt: questionFormData.prompt,
                points: questionFormData.points,
                explanation: questionFormData.explanation,
                options,
            });
            await fetchQuizzesForUnit(selectedUnitId, true);
            addToast('Question created successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to create question', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

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
            options: questionFormData.options.filter((option) => option.tempId !== tempId),
        });
    };

    const updateOptionInQuestion = (tempId: string | undefined, label: string, isCorrect: boolean) => {
        setQuestionFormData({
            ...questionFormData,
            options: questionFormData.options.map((option) =>
                option.tempId === tempId ? {...option, label, isCorrect} : option
            ),
        });
    };

    const handleUpdateQuestion = async () => {
        if (!validateQuestionForm() || !selectedQuestion) return;

        try {
            setIsSubmitting(true);
            await apiClient.updateQuizQuestion(selectedQuestion.id, {
                prompt: questionFormData.prompt,
                points: questionFormData.points,
                explanation: questionFormData.explanation,
            });
            await fetchQuizzesForUnit(selectedUnitId, true);
            addToast('Question updated successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to update question', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteQuestion = async (questionId: string) => {
        try {
            setIsSubmitting(true);
            await apiClient.deleteQuizQuestion(questionId);
            await fetchQuizzesForUnit(selectedUnitId, true);
            addToast('Question deleted successfully', 'success');
            setDeleteConfirm(null);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to delete question', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Option handlers
    const handleOpenCreateOption = (question: QuizQuestion) => {
        if (question.questionType === 'short_answer') {
            addToast('Cannot add options to short answer questions', 'error');
            return;
        }

        setSelectedQuestion(question);
        setSelectedOption(null);
        setOptionFormData(INITIAL_OPTION_FORM);
        setFormErrors({});
        setModalState('create-option');
    };

    const handleOpenEditOption = (option: QuizOption, question: QuizQuestion) => {
        setSelectedQuestion(question);
        setSelectedOption(option);
        setOptionFormData({
            label: option.label,
            isCorrect: option.isCorrect || false,
        });
        setFormErrors({});
        setModalState('edit-option');
    };

    const handleCreateOption = async () => {
        if (!validateOptionForm() || !selectedQuestion) return;

        try {
            setIsSubmitting(true);
            await apiClient.createQuizOption(selectedQuestion.id, optionFormData);
            await fetchQuizzesForUnit(selectedUnitId, true);
            addToast('Option created successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to create option', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateOption = async () => {
        if (!validateOptionForm() || !selectedOption) return;

        try {
            setIsSubmitting(true);
            await apiClient.updateQuizOption(selectedOption.id, optionFormData);
            await fetchQuizzesForUnit(selectedUnitId, true);
            addToast('Option updated successfully', 'success');
            setModalState('closed');
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to update option', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteOption = async (optionId: string) => {
        try {
            setIsSubmitting(true);
            await apiClient.deleteQuizOption(optionId);
            await fetchQuizzesForUnit(selectedUnitId, true);
            addToast('Option deleted successfully', 'success');
            setDeleteConfirm(null);
        } catch (err) {
            const apiError = err as ApiError;
            addToast(apiError.message || 'Failed to delete option', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <Loader className="w-8 h-8 animate-spin text-slate-500"/>
            </div>
        );
    }

    const activeQuiz = selectedQuiz ?? quizzes[0] ?? null;

    return (
        <div className="space-y-6">
            {/* Unit Selection */}
            {!unitId && (
                <div
                    className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-xl border border-blue-200/60 dark:border-blue-500/15 shadow-xl shadow-blue-950/10 p-6">
                    <label
                        className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
                        Select Unit
                    </label>
                    <select
                        value={selectedUnitId}
                        onChange={(e) => setSelectedUnitId(e.target.value)}
                        className="w-full px-4 py-3 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm border border-blue-200/60 dark:border-blue-500/15 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-900 dark:text-white"
                    >
                        <option value="">-- Select a unit --</option>
                        {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                                {unit.title}
                            </option>
                        ))}
                    </select>
                    {error && (
                        <div className="mt-4 flex items-center space-x-2 text-red-600 dark:text-red-400">
                            <AlertCircle size={20}/>
                            <span className="font-medium">{error}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Quizzes List */}
            {selectedUnitId && inlineView ? (
                <div className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Quiz Editor</h2>

                    {activeQuiz ? (
                        <>
                            <div
                                className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2rem] border border-blue-200/60 dark:border-blue-500/15 shadow-xl shadow-blue-950/10 p-6 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{activeQuiz.title}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            Questions: {activeQuiz.questions?.length || 0}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleUpdateQuiz}
                                        disabled={isSubmitting}
                                        className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-400 text-white font-bold transition-colors flex items-center space-x-2"
                                    >
                                        {isSubmitting && <Loader size={18} className="animate-spin"/>}
                                        <span>Save Quiz</span>
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Title
                                        *</label>
                                    <input
                                        type="text"
                                        value={quizFormData.title}
                                        onChange={(e) => setQuizFormData({...quizFormData, title: e.target.value})}
                                        className={`w-full px-4 py-3 rounded-lg border font-medium focus:outline-none focus:ring-2 ${
                                            formErrors.title
                                                ? 'border-red-500 focus:ring-red-500'
                                                : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-cyan-500'
                                        } bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm text-slate-900 dark:text-white`}
                                    />
                                    {formErrors.title &&
                                        <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.title}</p>}
                                </div>

                                <div>
                                    <label
                                        className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Instructions</label>
                                    <textarea
                                        value={quizFormData.instructions}
                                        onChange={(e) => setQuizFormData({
                                            ...quizFormData,
                                            instructions: e.target.value
                                        })}
                                        className="w-full px-4 py-3 rounded-lg border border-blue-200/60 dark:border-blue-500/15 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm text-slate-900 dark:text-white h-28"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Passing
                                            Score (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={quizFormData.passingScore}
                                            onChange={(e) => setQuizFormData({
                                                ...quizFormData,
                                                passingScore: Number(e.target.value)
                                            })}
                                            className={`w-full px-4 py-3 rounded-lg border font-medium focus:outline-none focus:ring-2 ${
                                                formErrors.passingScore
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-cyan-500'
                                            } bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm text-slate-900 dark:text-white`}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Time
                                            Limit (seconds)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={quizFormData.timeLimitSeconds}
                                            onChange={(e) => setQuizFormData({
                                                ...quizFormData,
                                                timeLimitSeconds: Number(e.target.value)
                                            })}
                                            className={`w-full px-4 py-3 rounded-lg border font-medium focus:outline-none focus:ring-2 ${
                                                formErrors.timeLimitSeconds
                                                    ? 'border-red-500 focus:ring-red-500'
                                                    : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-cyan-500'
                                            } bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm text-slate-900 dark:text-white`}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={quizFormData.randomizeQuestions}
                                            onChange={(e) => setQuizFormData({
                                                ...quizFormData,
                                                randomizeQuestions: e.target.checked
                                            })}
                                            className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-2 focus:ring-cyan-500"
                                        />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Randomize Questions</span>
                                    </label>
                                    <label className="flex items-center space-x-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={quizFormData.randomizeOptions}
                                            onChange={(e) => setQuizFormData({
                                                ...quizFormData,
                                                randomizeOptions: e.target.checked
                                            })}
                                            className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-2 focus:ring-cyan-500"
                                        />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Randomize Options</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                        Questions ({activeQuiz.questions?.length || 0})
                                    </h3>
                                    <button
                                        onClick={() => handleOpenCreateQuestion(activeQuiz)}
                                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-bold transition-transform hover:scale-105"
                                    >
                                        <Plus size={16}/>
                                        <span>Add Question</span>
                                    </button>
                                </div>

                                {(!activeQuiz.questions || activeQuiz.questions.length === 0) ? (
                                    <div
                                        className="bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                                        <p className="text-slate-600 dark:text-slate-400 font-medium">No questions
                                            yet</p>
                                        <button
                                            onClick={() => handleOpenCreateQuestion(activeQuiz)}
                                            className="mt-4 inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-bold transition-transform hover:scale-105 mx-auto"
                                        >
                                            <Plus size={20}/>
                                            <span>Add Question</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {activeQuiz.questions.map((question, idx) => (
                                            <div
                                                key={question.id}
                                                className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[1.5rem] border border-blue-200/60 dark:border-blue-500/15 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="text-sm font-black text-slate-900 dark:text-white">
                                                            <span>Q{idx + 1}: </span>
                                                            <MarkdownContent
                                                                content={question.prompt}
                                                                className="inline text-sm font-medium text-slate-900 dark:text-white [&_p]:my-0 [&_p]:inline [&_pre]:my-2"
                                                            />
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            Type: {question.questionType} | Points: {question.points}
                                                        </p>
                                                        {question.explanation && (
                                                            <MarkdownContent
                                                                content={question.explanation}
                                                                className="mt-3 text-sm text-slate-600 dark:text-slate-400 [&_p]:my-1 [&_pre]:my-2"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => handleOpenEditQuestion(question)}
                                                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16}/>
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setDeleteConfirm({
                                                                    type: 'question',
                                                                    id: question.id,
                                                                    name: question.prompt.substring(0, 40),
                                                                })
                                                            }
                                                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                </div>

                                                {question.questionType !== 'short_answer' && (
                                                    <div
                                                        className="mt-4 pt-4 border-t border-blue-200/60 dark:border-blue-500/15">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Options</p>
                                                            <button
                                                                onClick={() => handleOpenCreateOption(question)}
                                                                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                                                            >
                                                                + Add Option
                                                            </button>
                                                        </div>
                                                        {(!question.options || question.options.length === 0) ? (
                                                            <p className="text-xs text-slate-500 dark:text-slate-400">No
                                                                options</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {question.options.map((option) => (
                                                                    <div
                                                                        key={option.id}
                                                                        className="flex items-center justify-between bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50 p-3 rounded-lg text-sm"
                                                                    >
                                                                        <div className="flex items-center space-x-2">
                                                                            {option.isCorrect ? (
                                                                                <CheckCircle size={16}
                                                                                             className="text-green-600 dark:text-green-400"/>
                                                                            ) : (
                                                                                <Circle size={16}
                                                                                        className="text-slate-400"/>
                                                                            )}
                                                                            <MarkdownContent
                                                                                content={option.label}
                                                                                className={`text-sm [&_p]:my-0 [&_pre]:my-2 ${
                                                                                    option.isCorrect
                                                                                        ? 'text-green-700 dark:text-green-300 font-medium'
                                                                                        : 'text-slate-700 dark:text-slate-300'
                                                                                }`}
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center space-x-1">
                                                                            <button
                                                                                onClick={() => handleOpenEditOption(option, question)}
                                                                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded transition-colors"
                                                                            >
                                                                                <Edit2 size={14}/>
                                                                            </button>
                                                                            <button
                                                                                onClick={() =>
                                                                                    setDeleteConfirm({
                                                                                        type: 'option',
                                                                                        id: option.id,
                                                                                        name: option.label,
                                                                                    })
                                                                                }
                                                                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded transition-colors"
                                                                            >
                                                                                <Trash2 size={14}/>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div
                            className="bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                            <p className="text-slate-600 dark:text-slate-400 font-medium">No quiz for this unit yet</p>
                            <button
                                onClick={handleOpenCreateQuiz}
                                className="mt-4 flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-transform hover:scale-105 mx-auto"
                            >
                                <Plus size={20}/>
                                <span>Create Quiz</span>
                            </button>
                        </div>
                    )}
                </div>
            ) : selectedUnitId && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">Quizzes</h2>

                    {quizzes.length === 0 ? (
                        <div
                            className="bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                            <p className="text-slate-600 dark:text-slate-400 font-medium">No quizzes for this unit
                                yet</p>
                            <button
                                onClick={handleOpenCreateQuiz}
                                className="mt-4 flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-2 rounded-lg font-bold transition-transform hover:scale-105 mx-auto"
                            >
                                <Plus size={20}/>
                                <span>Create Quiz</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {quizzes.map((quiz) => (
                                <div key={quiz.id}
                                     className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-lg border border-blue-200/60 dark:border-blue-500/15 overflow-hidden">
                                    {/* Quiz Header */}
                                    <div
                                        onClick={() => setExpandedQuizId(expandedQuizId === quiz.id ? null : quiz.id)}
                                        className="p-4 cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-500/10 transition-colors flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{quiz.title}</h3>
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                Passing Score: {quiz.passingScore}% |
                                                Questions: {quiz.questions?.length || 0} | Time Limit:{' '}
                                                {Math.round(quiz.timeLimitSeconds / 60)} min
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditQuiz(quiz);
                                                }}
                                                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={18}/>
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfirm({type: 'quiz', id: quiz.id, name: quiz.title});
                                                }}
                                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                                            >
                                                <Trash2 size={18}/>
                                            </button>
                                            {expandedQuizId === quiz.id ? <ChevronUp size={20}/> :
                                                <ChevronDown size={20}/>}
                                        </div>
                                    </div>

                                    {/* Quiz Details */}
                                    {expandedQuizId === quiz.id && (
                                        <div
                                            className="border-t border-blue-200/60 dark:border-blue-500/15 p-4 space-y-4 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/30">
                                            {/* Instructions */}
                                            {quiz.instructions && (
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Instructions</p>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">{quiz.instructions}</p>
                                                </div>
                                            )}

                                            {/* Questions */}
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Questions</p>
                                                    <button
                                                        onClick={() => handleOpenCreateQuestion(quiz)}
                                                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-bold transition-transform hover:scale-105"
                                                    >
                                                        <Plus size={16}/>
                                                        <span>Add Question</span>
                                                    </button>
                                                </div>

                                                {(!quiz.questions || quiz.questions.length === 0) ? (
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">No
                                                        questions yet</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {quiz.questions.map((question, idx) => (
                                                            <div
                                                                key={question.id}
                                                                className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded border border-blue-200/60 dark:border-blue-500/15 p-3"
                                                            >
                                                                <div
                                                                    onClick={() =>
                                                                        setExpandedQuestionId(expandedQuestionId === question.id ? null : question.id)
                                                                    }
                                                                    className="cursor-pointer flex items-center justify-between"
                                                                >
                                                                    <div className="flex-1">
                                                                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                                                                            <span>Q{idx + 1}: </span>
                                                                            <MarkdownContent
                                                                                content={question.prompt}
                                                                                className="inline text-sm font-medium text-slate-900 dark:text-white [&_p]:my-0 [&_p]:inline [&_pre]:my-2"
                                                                            />
                                                                        </div>
                                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                            Type: {question.questionType} |
                                                                            Points: {question.points}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleOpenEditQuestion(question);
                                                                            }}
                                                                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded transition-colors"
                                                                        >
                                                                            <Edit2 size={16}/>
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setDeleteConfirm({
                                                                                    type: 'question',
                                                                                    id: question.id,
                                                                                    name: question.prompt.substring(0, 40),
                                                                                });
                                                                            }}
                                                                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded transition-colors"
                                                                        >
                                                                            <Trash2 size={16}/>
                                                                        </button>
                                                                        {expandedQuestionId === question.id ? (
                                                                            <ChevronUp size={16}/>
                                                                        ) : (
                                                                            <ChevronDown size={16}/>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Question Options */}
                                                                {expandedQuestionId === question.id && (
                                                                    <div
                                                                        className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-500/15 space-y-2">
                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Options</p>
                                                                        {(!question.options || question.options.length === 0) ? (
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400">No
                                                                                options</p>
                                                                        ) : (
                                                                            <div className="space-y-1">
                                                                                {question.options.map((option) => (
                                                                                    <div
                                                                                        key={option.id}
                                                                                        className="flex items-center justify-between bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50 p-2 rounded text-sm"
                                                                                    >
                                                                                        <div
                                                                                            className="flex items-center space-x-2">
                                                                                            {option.isCorrect ? (
                                                                                                <CheckCircle size={16}
                                                                                                             className="text-green-600 dark:text-green-400"/>
                                                                                            ) : (
                                                                                                <Circle size={16}
                                                                                                        className="text-slate-400"/>
                                                                                            )}
                                                                                            <MarkdownContent
                                                                                                content={option.label}
                                                                                                className={`text-sm [&_p]:my-0 [&_pre]:my-2 ${
                                                                                                    option.isCorrect
                                                                                                        ? 'text-green-700 dark:text-green-300 font-medium'
                                                                                                        : 'text-slate-700 dark:text-slate-300'
                                                                                                }`}
                                                                                            />
                                                                                        </div>
                                                                                        <div
                                                                                            className="flex items-center space-x-1">
                                                                                            <button
                                                                                                onClick={() => handleOpenEditOption(option, question)}
                                                                                                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded transition-colors"
                                                                                            >
                                                                                                <Edit2 size={14}/>
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() =>
                                                                                                    setDeleteConfirm({
                                                                                                        type: 'option',
                                                                                                        id: option.id,
                                                                                                        name: option.label,
                                                                                                    })
                                                                                                }
                                                                                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded transition-colors"
                                                                                            >
                                                                                                <Trash2 size={14}/>
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        {question.questionType !== 'short_answer' && (
                                                                            <button
                                                                                onClick={() => handleOpenCreateOption(question)}
                                                                                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline mt-2"
                                                                            >
                                                                                + Add Option
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Quiz Modal */}
            {(modalState === 'create-quiz' || modalState === 'edit-quiz') && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-[2rem] border border-blue-200/60 dark:border-blue-500/15 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div
                            className="flex items-center justify-between p-6 border-b border-blue-200/60 dark:border-blue-500/15 sticky top-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                {modalState === 'create-quiz' ? 'Create Quiz' : 'Edit Quiz'}
                            </h2>
                            <button
                                onClick={() => setModalState('closed')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Title
                                    *</label>
                                <input
                                    type="text"
                                    value={quizFormData.title}
                                    onChange={(e) => setQuizFormData({...quizFormData, title: e.target.value})}
                                    className={`w-full px-4 py-2 rounded-lg border font-medium focus:outline-none focus:ring-2 ${
                                        formErrors.title
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-cyan-500'
                                    } bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm text-slate-900 dark:text-white`}
                                    placeholder="Enter quiz title"
                                />
                                {formErrors.title &&
                                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.title}</p>}
                            </div>

                            {/* Instructions */}
                            <div>
                                <label
                                    className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Instructions</label>
                                <textarea
                                    value={quizFormData.instructions}
                                    onChange={(e) => setQuizFormData({...quizFormData, instructions: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-blue-200/60 dark:border-blue-500/15 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm text-slate-900 dark:text-white h-20"
                                    placeholder="Enter quiz instructions"
                                />
                            </div>

                            {/* Passing Score */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Passing
                                    Score (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={quizFormData.passingScore}
                                    onChange={(e) => setQuizFormData({
                                        ...quizFormData,
                                        passingScore: Number(e.target.value)
                                    })}
                                    className={`w-full px-4 py-2 rounded-lg border font-medium focus:outline-none focus:ring-2 ${
                                        formErrors.passingScore
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-cyan-500'
                                    } bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm text-slate-900 dark:text-white`}
                                />
                                {formErrors.passingScore && (
                                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.passingScore}</p>
                                )}
                            </div>

                            {/* Time Limit */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Time
                                    Limit (seconds)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={quizFormData.timeLimitSeconds}
                                    onChange={(e) => setQuizFormData({
                                        ...quizFormData,
                                        timeLimitSeconds: Number(e.target.value)
                                    })}
                                    className={`w-full px-4 py-2 rounded-lg border font-medium focus:outline-none focus:ring-2 ${
                                        formErrors.timeLimitSeconds
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-cyan-500'
                                    } bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm text-slate-900 dark:text-white`}
                                />
                                {formErrors.timeLimitSeconds && (
                                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.timeLimitSeconds}</p>
                                )}
                            </div>

                            {/* Randomize Options */}
                            <div className="space-y-3">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={quizFormData.randomizeQuestions}
                                        onChange={(e) => setQuizFormData({
                                            ...quizFormData,
                                            randomizeQuestions: e.target.checked
                                        })}
                                        className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <span
                                        className="font-medium text-slate-700 dark:text-slate-300">Randomize Questions</span>
                                </label>

                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={quizFormData.randomizeOptions}
                                        onChange={(e) => setQuizFormData({
                                            ...quizFormData,
                                            randomizeOptions: e.target.checked
                                        })}
                                        className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-2 focus:ring-cyan-500"
                                    />
                                    <span
                                        className="font-medium text-slate-700 dark:text-slate-300">Randomize Options</span>
                                </label>
                            </div>
                        </div>

                        {/* Modal Actions */}
                        <div
                            className="flex items-center justify-end space-x-3 p-6 border-t border-blue-200/60 dark:border-blue-500/15 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50">
                            <button
                                onClick={() => setModalState('closed')}
                                className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={modalState === 'create-quiz' ? handleCreateQuiz : handleUpdateQuiz}
                                disabled={isSubmitting}
                                className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-400 text-white font-bold transition-colors flex items-center space-x-2"
                            >
                                {isSubmitting && <Loader size={18} className="animate-spin"/>}
                                <span>{modalState === 'create-quiz' ? 'Create' : 'Update'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Question Modal */}
            {(modalState === 'create-question' || modalState === 'edit-question') && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div
                        className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div
                            className="flex items-center justify-between p-6 border-b border-blue-200/60 dark:border-blue-500/15 sticky top-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                {modalState === 'create-question' ? 'Create Question' : 'Edit Question'}
                            </h3>
                            <button
                                onClick={() => setModalState('closed')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
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
                                error={formErrors.prompt}
                            />

                            {/* Points */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Points
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={questionFormData.points}
                                    onChange={(e) =>
                                        setQuestionFormData({
                                            ...questionFormData,
                                            points: Math.max(1, Number(e.target.value) || 1),
                                        })
                                    }
                                    className={`w-full px-4 py-2 rounded-lg border font-medium focus:outline-none focus:ring-2 ${
                                        formErrors.points
                                            ? 'border-red-500 focus:ring-red-500'
                                            : 'border-blue-200/60 dark:border-blue-500/15 focus:ring-cyan-500'
                                    } bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm text-slate-900 dark:text-white`}
                                />
                                {formErrors.points &&
                                    <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.points}</p>}
                            </div>

                            <MarkdownEditor
                                label="Explanation"
                                value={questionFormData.explanation || ''}
                                onChange={(value) => setQuestionFormData({...questionFormData, explanation: value})}
                                height="180px"
                            />

                            {modalState === 'create-question' && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                            Options
                                        </label>
                                        <button
                                            type="button"
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
                                                    className="bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm p-4 rounded-lg border border-blue-200/60 dark:border-blue-500/15 space-y-3"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="inline-block px-2 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded">
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
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={option.isCorrect}
                                                                onChange={(e) =>
                                                                    updateOptionInQuestion(option.tempId, option.label, e.target.checked)
                                                                }
                                                                className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 accent-emerald-600 cursor-pointer"
                                                            />
                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                Mark as correct
                                                            </span>
                                                        </label>
                                                        <button
                                                            type="button"
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

                        {/* Modal Actions */}
                        <div
                            className="flex items-center justify-end space-x-3 p-6 border-t border-blue-200/60 dark:border-blue-500/15 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50">
                            <button
                                onClick={() => setModalState('closed')}
                                className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={modalState === 'create-question' ? handleCreateQuestion : handleUpdateQuestion}
                                disabled={isSubmitting}
                                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-400 text-white font-bold transition-colors flex items-center space-x-2"
                            >
                                {isSubmitting && <Loader size={18} className="animate-spin"/>}
                                <span>{modalState === 'create-question' ? 'Create' : 'Update'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Option Modal */}
            {(modalState === 'create-option' || modalState === 'edit-option') && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div
                            className="flex items-center justify-between p-6 border-b border-blue-200/60 dark:border-blue-500/15">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                {modalState === 'create-option' ? 'Create Option' : 'Edit Option'}
                            </h2>
                            <button
                                onClick={() => setModalState('closed')}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
                                error={formErrors.label}
                            />

                            {/* Is Correct */}
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={optionFormData.isCorrect}
                                    onChange={(e) => setOptionFormData({
                                        ...optionFormData,
                                        isCorrect: e.target.checked
                                    })}
                                    className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-2 focus:ring-green-500"
                                />
                                <span
                                    className="font-medium text-slate-700 dark:text-slate-300">Mark as Correct Answer</span>
                            </label>
                        </div>

                        {/* Modal Actions */}
                        <div
                            className="flex items-center justify-end space-x-3 p-6 border-t border-blue-200/60 dark:border-blue-500/15 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50">
                            <button
                                onClick={() => setModalState('closed')}
                                className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={modalState === 'create-option' ? handleCreateOption : handleUpdateOption}
                                disabled={isSubmitting}
                                className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-400 text-white font-bold transition-colors flex items-center space-x-2"
                            >
                                {isSubmitting && <Loader size={18} className="animate-spin"/>}
                                <span>{modalState === 'create-option' ? 'Create' : 'Update'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl rounded-xl shadow-xl max-w-md w-full">
                        <div className="p-6 space-y-4">
                            <div className="flex items-center space-x-3">
                                <div
                                    className="w-12 h-12 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center">
                                    <AlertCircle size={24}/>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Delete {deleteConfirm.type}?</h2>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">{deleteConfirm.name}</p>
                                </div>
                            </div>

                            <p className="text-slate-600 dark:text-slate-400">This action cannot be undone.</p>
                        </div>

                        {/* Modal Actions */}
                        <div
                            className="flex items-center justify-end space-x-3 p-6 border-t border-blue-200/60 dark:border-blue-500/15 bg-white/60 dark:bg-slate-950/50 backdrop-blur-sm/50">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (deleteConfirm.type === 'quiz') {
                                        handleDeleteQuiz(deleteConfirm.id);
                                    } else if (deleteConfirm.type === 'question') {
                                        handleDeleteQuestion(deleteConfirm.id);
                                    } else if (deleteConfirm.type === 'option') {
                                        handleDeleteOption(deleteConfirm.id);
                                    }
                                }}
                                disabled={isSubmitting}
                                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-slate-400 text-white font-bold transition-colors flex items-center space-x-2"
                            >
                                {isSubmitting && <Loader size={18} className="animate-spin"/>}
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            <div className="fixed bottom-6 right-6 space-y-3 z-40">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`px-6 py-3 rounded-lg font-medium shadow-lg text-white animate-in fade-in slide-in-from-bottom-4 ${
                            toast.type === 'success'
                                ? 'bg-emerald-600'
                                : toast.type === 'error'
                                    ? 'bg-red-600'
                                    : 'bg-blue-600'
                        }`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>
    );
}
