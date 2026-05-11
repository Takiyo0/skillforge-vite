import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { apiClient } from '@skillforge/vite/lib/api';
import type {
    Unit,
    QuizSubmissionResponse,
    FinalExamSubmissionResponse,
    QuizAnswerDto,
    QuizQuestion,
} from '@skillforge/vite/lib/types';
import { MarkdownContent } from '@skillforge/vite/components/ui/MarkdownContent';

export function AssessmentPage() {
    const { courseId, unitId } = useParams<{ courseId: string; unitId: string }>();
    const navigate = useNavigate();

    const [unit, setUnit] = useState<Unit | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Quiz state - track as arrays for multiple selections
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string[]>>({});
    const [quizSubmitting, setQuizSubmitting] = useState(false);
    const [quizResult, setQuizResult] = useState<QuizSubmissionResponse | FinalExamSubmissionResponse | null>(null);
    const [examQuestions, setExamQuestions] = useState<QuizQuestion[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!courseId || !unitId) {
                setError('Missing course or unit ID');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const unitData = await apiClient.getUnitDetail(unitId);
                setUnit(unitData);
                
                // For final exams, start/resume attempt to get questions
                if (unitData.type === 'final_exam' && unitData.finalExam) {
                    const attemptResponse = await apiClient.startFinalExamAttempt(unitId, unitData.finalExam.unitId);
                    // Store questions separately from the unit
                    setExamQuestions(attemptResponse.questions);
                }
            } catch (err) {
                const apiError = err as Error;
                setError(apiError.message || 'Failed to load unit');
                console.error('Unit load error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [courseId, unitId]);

    const handleAnswerChange = (questionId: string, optionId: string, answerMultiple: boolean) => {
        if (quizResult) return;
        
        if (answerMultiple) {
            // Toggle for multiple selection
            setQuizAnswers((prev) => {
                const current = prev[questionId] || [];
                if (current.includes(optionId)) {
                    return {
                        ...prev,
                        [questionId]: current.filter((id) => id !== optionId),
                    };
                } else {
                    return {
                        ...prev,
                        [questionId]: [...current, optionId],
                    };
                }
            });
        } else {
            // Single selection - replace
            setQuizAnswers((prev) => ({
                ...prev,
                [questionId]: [optionId],
            }));
        }
    };

    const handleQuizSubmit = async () => {
        if (!unitId) return;

        setQuizSubmitting(true);
        try {
            const answers = Object.entries(quizAnswers).map(([questionId, selectedOptionIds]) => ({
                questionId,
                selectedOptionIds: Array.isArray(selectedOptionIds) ? selectedOptionIds : [selectedOptionIds],
            })) as QuizAnswerDto[];

            let result;
            if (unit?.type === 'final_exam' && unit?.finalExam) {
                // Submit to final exam endpoint - use unitId from finalExam object
                result = await apiClient.submitFinalExam(unitId, unit.finalExam.unitId, answers);
            } else if (unit?.type === 'assessment' && unit?.quiz) {
                // Submit to quiz endpoint
                result = await apiClient.submitQuiz(unitId, unit.quiz.id, answers);
            } else {
                throw new Error('Invalid unit type for submission');
            }

            setQuizResult(result);
        } catch (err) {
            const apiError = err as Error;
            setError(apiError.message || 'Failed to submit');
            console.error('Error submitting:', err);
        } finally {
            setQuizSubmitting(false);
        }
    };

    const handleNextQuestion = () => {
        const questions = unit?.type === 'final_exam' ? examQuestions : unit?.quiz?.questions;
        if (questions && currentQuestionIdx < questions.length - 1) {
            setCurrentQuestionIdx(currentQuestionIdx + 1);
        }
    };

    const handlePrevQuestion = () => {
        if (currentQuestionIdx > 0) {
            setCurrentQuestionIdx(currentQuestionIdx - 1);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-500/30 animate-pulse mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Loading assessment...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 max-w-md">
                    <p className="text-red-300 font-medium">{error}</p>
                    <button
                        onClick={() => navigate(`/student/courses/${courseId}`)}
                        className="mt-4 text-red-400 hover:text-red-300 font-bold underline"
                    >
                        Back to Course
                    </button>
                </div>
            </div>
        );
    }

    if (!unit?.quiz && !unit?.finalExam) {
        return <div className="flex-1 flex items-center justify-center text-slate-400">Assessment not found</div>;
    }

    // Use examQuestions for final exams, quiz questions for assessments
    const questions = unit.type === 'final_exam' ? examQuestions : unit.quiz?.questions || [];
    
    if (!questions.length) {
        return <div className="flex-1 flex items-center justify-center text-slate-400">Loading questions...</div>;
    }

    const currentQuestion = questions[currentQuestionIdx];
    const allAnswered = questions.every((q) => quizAnswers[q.id]);

    if (quizResult) {
        return (
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto mx-auto px-2 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10">
                    <div className="text-center mb-8 sm:mb-10 md:mb-12">
                        <div className="inline-block mb-4 sm:mb-5 md:mb-6">
                            <div className={`text-4xl sm:text-5xl md:text-6xl font-black ${quizResult.isPassed ? 'text-emerald-600' : 'text-orange-600'}`}>
                                {quizResult.scorePercent}%
                            </div>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">
                            {quizResult.isPassed ? '🎉 You Passed!' : 'Try Again'}
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 mb-6 sm:mb-7 md:mb-8 px-2">
                            {quizResult.isPassed
                                ? `Great job! You scored ${quizResult.scorePercent}%. You're ready to move forward.`
                                : `You scored ${quizResult.scorePercent}%. You need ${unit.type === 'final_exam' ? unit.finalExam!.passingScore : unit.quiz!.passingScore}% to pass. Review and try again!`}
                        </p>

                        <div className="space-y-2 sm:space-y-2.5 md:space-y-3 mb-6 sm:mb-7 md:mb-8">
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                <span className="font-semibold">Attempt #{quizResult.attemptNumber}</span>
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                                {new Date(quizResult.submittedAt).toLocaleString()}
                            </p>
                        </div>

                        <button
                            onClick={() => navigate(
                                quizResult.isPassed 
                                    ? `/student/courses/${courseId}`
                                    : `/student/courses/${courseId}/units/${unitId}`
                            )}
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-xl sm:rounded-2xl font-black text-sm sm:text-base md:text-lg transition-all hover:scale-[1.02]"
                        >
                            {quizResult.isPassed ? 'Back to Course' : 'Back to Unit'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl border-b border-white/20 dark:border-white/10 px-2 sm:px-4 md:px-6 py-3 sm:py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            onClick={() => navigate(`/student/courses/${courseId}/units/${unitId}`)}
                            className="glass-button-secondary inline-flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl text-slate-900 dark:text-white font-bold transition-colors text-sm sm:text-base"
                        >
                            <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                            <span>Exit Assessment</span>
                        </button>
                        <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 text-sm sm:text-base">
                            <Clock size={16} className="sm:w-4.5 sm:h-4.5" />
                            <span className="font-semibold">
                                {Math.floor((unit.type === 'final_exam' ? unit.finalExam!.timeLimitSeconds : unit.quiz!.timeLimitSeconds) / 60)} min
                            </span>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="px-2 sm:px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-3 sm:pb-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-2">
                        <h2 className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Question {currentQuestionIdx + 1} of {questions.length}
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-500">
                            {Object.keys(quizAnswers).length} / {questions.length} answered
                        </span>
                    </div>
                    <div className="w-full bg-blue-500/15 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-blue-600 to-cyan-600 h-2 rounded-full transition-all"
                            style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                        ></div>
                    </div>
                </div>
                {/* Question Content */}
                <div className="px-2 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
                    <div className="glass-widget-surface rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-6 md:p-8 mb-4 sm:mb-6 md:mb-8 shadow-xl shadow-blue-950/5">
                        {/* Question Title */}
                        <div className="mb-4 sm:mb-5 md:mb-6">
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                <div className="bg-blue-600 text-white rounded-full w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center font-black flex-shrink-0 text-sm sm:text-base">
                                    {currentQuestionIdx + 1}
                                </div>
                                <div>
                                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 uppercase font-bold">Question</p>
                                    <p className="font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                                        {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>

                            <MarkdownContent content={currentQuestion.prompt} className="text-base sm:text-lg md:text-xl" />
                        </div>

                        {/* Options */}
                        <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
                            {currentQuestion.options.map((option) => {
                                const isSelected = (quizAnswers[currentQuestion.id] || []).includes(option.id);

                                return (
                                    <label
                                        key={option.id}
                                        className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition-all min-h-[44px] sm:min-h-[48px] ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <input
                                            type={currentQuestion.answerMultiple ? 'checkbox' : 'radio'}
                                            name={currentQuestion.id}
                                            value={option.id}
                                            checked={isSelected}
                                            onChange={() => handleAnswerChange(currentQuestion.id, option.id, currentQuestion.answerMultiple)}
                                            className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-1 cursor-pointer"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <MarkdownContent content={option.label} className="text-xs sm:text-sm md:text-base" />
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Navigation and Submit */}
                    <div className="flex gap-2 sm:gap-3 md:gap-4">
                        <button
                            onClick={handlePrevQuestion}
                            disabled={currentQuestionIdx === 0}
                            className="glass-button-secondary flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 dark:text-white rounded-lg sm:rounded-xl font-bold transition-all text-xs sm:text-sm md:text-base whitespace-nowrap"
                        >
                            <ChevronLeft size={16} className="sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
                            <span className="hidden sm:inline">Previous</span>
                            <span className="sm:hidden">Prev</span>
                        </button>

                        {currentQuestionIdx < questions.length - 1 ? (
                            <button
                                onClick={handleNextQuestion}
                                className="glass-button-secondary flex-1 flex items-center gap-1.5 sm:gap-2 justify-center px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-slate-900 dark:text-white rounded-lg sm:rounded-xl font-bold transition-all text-xs sm:text-sm md:text-base"
                            >
                                Next
                                <ChevronRight size={16} className="sm:w-4.5 sm:h-4.5 md:w-5 md:h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleQuizSubmit}
                                disabled={quizSubmitting || !allAnswered}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl font-black transition-all hover:scale-[1.02] text-xs sm:text-sm md:text-base whitespace-nowrap"
                            >
                                {quizSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
