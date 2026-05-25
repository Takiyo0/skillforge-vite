import {useState, useEffect, useRef} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {CheckCircle2, Lock, Clock, FileText, Play, Zap, X, Paperclip, Bot} from 'lucide-react';
import Editor from '@monaco-editor/react';
import {apiClient} from '@skillforge/vite/lib/api';
import type {Unit, CourseProgress, SubmissionResponse, SubmissionFeedback} from '@skillforge/vite/lib/types';
import { getS3Url } from '@skillforge/vite/lib/s3';
import { MarkdownContent } from '@skillforge/vite/components/ui/MarkdownContent';
import { Breadcrumbs } from '@skillforge/vite/components/layout/Breadcrumbs';

export function UnitView() {
    const {courseId, unitId} = useParams<{ courseId: string; unitId: string }>();
    const navigate = useNavigate();

    const [unit, setUnit] = useState<Unit | null>(null);
    const [courseProgress, setCourseProgress] = useState<CourseProgress | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [completing, setCompleting] = useState(false);

    // Exercise submission state
    const [sourceCode, setSourceCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
    const [feedback, setFeedback] = useState<SubmissionFeedback | null>(null);
    const [submissions, setSubmissions] = useState<SubmissionResponse[]>([]);
    const [selectedSubmissionModal, setSelectedSubmissionModal] = useState<string | null>(null);
    const [askingAiExplanation, setAskingAiExplanation] = useState(false);
    const [aiExplanationError, setAiExplanationError] = useState<string | null>(null);
    const editorRef = useRef<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!courseId || !unitId) {
                setError('Missing course or unit ID');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const [unitData, progressData] = await Promise.all([
                    apiClient.getUnitDetail(unitId),
                    apiClient.getCourseProgress(courseId),
                ]);
                setUnit(unitData);
                setCourseProgress(progressData);
                if (unitData.type === 'exercise') {
                    const submissionsData = await apiClient.getUserUnitSubmissions(unitId);
                    setSubmissions(submissionsData);
                } else {
                    setSubmissions([]);
                }

                // Initialize exercise with starter code
                if (unitData.exercise?.starterCode) {
                    setSourceCode(unitData.exercise.starterCode);
                }

                // If unit is available, automatically start it
                const unitProgress = progressData.unitProgress.find((up) => up.unitId === unitId);
                if (unitProgress?.status === 'available') {
                    try {
                        await apiClient.startUnit(unitId);
                        // Refresh progress after starting
                        const updatedProgress = await apiClient.getCourseProgress(courseId);
                        setCourseProgress(updatedProgress);
                    } catch (err) {
                        console.error('Error starting unit:', err);
                    }
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

    // Poll submission status
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!submission?.id || ['finished', 'failed', 'passed'].includes(submission.status)) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            return;
        }

        pollIntervalRef.current = setInterval(async () => {
            try {
                const updated = await apiClient.getSubmissionStatus(submission.id);
                setSubmission(updated);

                if (['finished', 'failed', 'passed'].includes(updated.status)) {
                    // Get feedback when finished
                    try {
                        const feedbackData = await apiClient.getSubmissionFeedback(submission.id);
                        setFeedback(feedbackData);
                    } catch (err) {
                        console.error('Error fetching feedback:', err);
                    }

                    // Refresh submissions list to show new submission in history
                    if (unitId && unit?.type === 'exercise') {
                        try {
                            const updatedSubmissions = await apiClient.getUserUnitSubmissions(unitId);
                            setSubmissions(updatedSubmissions);
                        } catch (err) {
                            console.error('Error refreshing submissions:', err);
                        }
                    }

                    // Refresh course progress to update unit status
                    if (courseId) {
                        try {
                            const updatedProgress = await apiClient.getCourseProgress(courseId);
                            setCourseProgress(updatedProgress);
                        } catch (err) {
                            console.error('Error refreshing course progress:', err);
                        }
                    }

                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                }
            } catch (err) {
                console.error('Error polling submission status:', err);
            }
        }, 1000); // Poll every 1 second

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [submission?.id, courseId, unit?.type, unitId]);

    const getUnitProgress = () => {
        if (!courseProgress || !unitId) return null;
        return courseProgress.unitProgress.find((up) => up.unitId === unitId);
    };

    const unitProgress = getUnitProgress();
    const isLocked = unitProgress?.status === 'locked';
    const isCompleted = unitProgress?.status === 'completed';
    const selectedSubmission = submissions.find((s) => s.id === selectedSubmissionModal);

    const handleBack = () => {
        navigate(`/student/courses/${courseId}`);
    };

    const handleCompleteUnit = async () => {
        if (!unitId || isCompleted) return;

        try {
            setCompleting(true);
            await apiClient.completeUnit(unitId);
            // Refresh progress after completing
            if (courseId) {
                const updatedProgress = await apiClient.getCourseProgress(courseId);
                setCourseProgress(updatedProgress);
            }
        } catch (err) {
            const apiError = err as Error;
            setError(apiError.message || 'Failed to complete unit');
            console.error('Error completing unit:', err);
        } finally {
            setCompleting(false);
        }
    };

    const handleSubmitCode = async () => {
        if (!unitId || !unit?.exercise || !sourceCode.trim()) {
            setError('Please write some code before submitting');
            return;
        }

        try {
            setSubmitting(true);
            setSubmission(null);
            setFeedback(null);

            const isAdvanced = unit.exercise.difficulty === 'advanced';
            const response = isAdvanced
                ? await apiClient.submitAdvancedExerciseCode(
                    unitId,
                    unit.exercise.id,
                    sourceCode,
                    unit.exercise.language
                )
                : await apiClient.submitExerciseCode(
                    unitId,
                    unit.exercise.id,
                    sourceCode,
                    unit.exercise.language
                );

            setSubmission(response);
        } catch (err) {
            const apiError = err as Error;
            setError(apiError.message || 'Failed to submit code');
            console.error('Error submitting code:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAskAiExplanation = async () => {
        if (!selectedSubmission) return;

        try {
            setAskingAiExplanation(true);
            setAiExplanationError(null);
            const result = await apiClient.askAiSubmissionExplanation(selectedSubmission.id);
            setSubmissions((prev) =>
                prev.map((item) =>
                    item.id === selectedSubmission.id || !item.aiCodeExplanation
                        ? { ...item, aiCodeExplanation: result.aiCodeExplanation }
                        : item
                )
            );
            if (submission?.id === selectedSubmission.id) {
                setSubmission((prev) =>
                    prev ? { ...prev, aiCodeExplanation: result.aiCodeExplanation } : prev
                );
            }
        } catch (err) {
            const apiError = err as Error;
            setAiExplanationError(apiError.message || 'Failed to get AI explanation');
        } finally {
            setAskingAiExplanation(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div
                        className="inline-block w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-blue-500/30 animate-pulse mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">Loading unit content...</p>
                </div>
            </div>
        );
    }

    if (error || !unit) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-2xl p-6 max-w-md">
                    <p className="text-red-700 dark:text-red-300 font-medium">{error || 'Failed to load unit'}</p>
                    <button
                        onClick={handleBack}
                        className="mt-4 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold underline"
                    >
                        Back to Course
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                {/* Header with back button */}
                <div
                    className="sticky top-0 z-10 border-b border-white/20 dark:border-white/10 px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
                    <Breadcrumbs
                        items={[
                            { label: 'Courses', to: '/student/browse-courses' },
                            { label: unit.course.title, to: `/student/courses/${courseId}` },
                            { label: unit.title },
                        ]}
                    />
                </div>

                {/* Main Content */}
                <div className="p-3 sm:p-4 md:p-6 lg:p-8">
                    {/* Unit Type Badge */}
                    <div className="mb-3 sm:mb-4 md:mb-6">
						<span
                            className="inline-block px-2 sm:px-3 py-1 text-xs font-black uppercase tracking-widest rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
							{unit.type}
						</span>
                    </div>

                    {/* Unit Title */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-2 sm:mb-3 md:mb-4">
                        {unit.title}
                    </h1>

                    {/* Unit Summary */}
                    <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 mb-6 md:mb-8">{unit.summary}</p>

                    {/* Progress Status and Meta */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
                        {/* Status */}
                        <div className="glass-widget-surface rounded-2xl sm:rounded-2xl p-3 sm:p-4 md:p-5 flex items-center space-x-3 shadow-lg shadow-blue-950/5">
                            {isLocked ? (
                                <>
                                    <Lock className="text-slate-500 dark:text-slate-400 shrink-0" size={24}/>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Status</p>
                                        <p className="text-slate-900 dark:text-white font-bold">Locked</p>
                                    </div>
                                </>
                            ) : isCompleted ? (
                                <>
                                    <CheckCircle2 className="text-emerald-500 shrink-0" size={24}/>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Status</p>
                                        <p className="text-slate-900 dark:text-white font-bold">Completed</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <FileText className="text-blue-500 shrink-0" size={24}/>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Status</p>
                                        <p className="text-slate-900 dark:text-white font-bold">In Progress</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Duration */}
                        <div className="glass-widget-surface rounded-2xl sm:rounded-2xl p-3 sm:p-4 md:p-5 flex items-center space-x-3 shadow-lg shadow-blue-950/5">
                            <Clock className="text-slate-500 dark:text-slate-400 shrink-0" size={24}/>
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Duration</p>
                                <p className="text-slate-900 dark:text-white font-bold">{unit.estimatedMinutes} mins</p>
                            </div>
                        </div>

                        {/* Difficulty (for exercises) */}
                        {unit.exercise && (
                            <div className="glass-widget-surface rounded-2xl sm:rounded-2xl p-3 sm:p-4 md:p-5 flex items-center space-x-3 shadow-lg shadow-blue-950/5">
                                <Zap
                                    className={`shrink-0 ${
                                        unit.exercise.difficulty === 'advanced'
                                            ? 'text-orange-500'
                                            : 'text-green-500'
                                    }`}
                                    size={24}
                                />
                                <div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Difficulty</p>
                                    <p className="text-slate-900 dark:text-white font-bold capitalize">
                                        {unit.exercise.difficulty}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Lock status message */}
                    {isLocked && (
                        <div className="mb-6 md:mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl sm:rounded-2xl p-4 sm:p-6">
                            <p className="text-sm sm:text-base text-amber-700 dark:text-amber-200 font-medium">
                                This unit is locked. Complete the prerequisite units to unlock it.
                            </p>
                        </div>
                    )}

                    {/* Prerequisites */}
                    {unit.prerequisites.length > 0 && (
                        <div className="mb-6 md:mb-8">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-3 sm:mb-4">Prerequisites</h2>
                            <div className="space-y-2">
                                {unit.prerequisites.map((prereq) => (
                                    <div
                                        key={prereq.id}
                                        className="glass-widget-surface rounded-2xl p-4 shadow-lg shadow-blue-950/5 flex items-center space-x-3"
                                    >
                                        <CheckCircle2 size={20} className="text-emerald-500 shrink-0"/>
                                        <span
                                            className="text-slate-900 dark:text-white font-semibold">{prereq.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MODULE CONTENT */}
                    {unit.type === 'module' && unit.moduleContent && (
                        <div className="mb-6 md:mb-8">
                            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-4 md:mb-6">Course Content</h2>

                            {/* Article Markdown Content */}
                            {unit.moduleContent.articleMarkdown && (
                                <div
                                    className="glass-widget-surface rounded-2xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl shadow-blue-950/5 mb-4 sm:mb-6">
                                    {renderMarkdown(unit.moduleContent.articleMarkdown)}
                                </div>
                            )}

                            {/* Video Content */}
                            {unit.moduleContent.videoUrl && (
                                <div className="mb-4 sm:mb-6 bg-slate-900 rounded-2xl sm:rounded-2xl overflow-hidden shadow-xl shadow-blue-950/5">
                                    <div className="w-full aspect-video">
                                        {getYoutubeEmbedUrl(unit.moduleContent.videoUrl) ? (
                                            <iframe
                                                src={getYoutubeEmbedUrl(unit.moduleContent.videoUrl) || undefined}
                                                title="Module video"
                                                className="w-full h-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowFullScreen
                                            />
                                        ) : (
                                            <video
                                                src={unit.moduleContent.videoUrl}
                                                controls
                                                className="w-full h-full object-cover"
                                                controlsList="nodownload"
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        )}
                                    </div>
                                </div>
                            )}

							{unit.moduleResources && unit.moduleResources.length > 0 && (
								<div className="glass-widget-surface rounded-2xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl shadow-blue-950/5">
									<div className="flex items-center gap-2 mb-3 sm:mb-4">
										<Paperclip size={18} className="text-blue-600 dark:text-blue-400" />
										<h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white">Attachments</h3>
									</div>
									<div className="space-y-2">
										{unit.moduleResources.map((resource) => {
											const href = resource.url || getS3Url(resource.s3Key) || '#';
											return (
												<a
													key={resource.id}
													href={href}
													target="_blank"
													rel="noreferrer"
													className="block px-3 sm:px-4 py-2 sm:py-3 rounded-2xl sm:rounded-2xl glass-button-secondary transition-colors text-sm sm:text-base"
												>
													<p className="font-bold text-slate-900 dark:text-white">{resource.label}</p>
													<p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{resource.resourceType}</p>
												</a>
											);
										})}
									</div>
								</div>
							)}
                        </div>
                    )}

                    {/* EXERCISE CONTENT */}
                    {unit.type === 'exercise' && unit.exercise && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-6 md:mb-8">
                            {/* Left: Problem description */}
                            <div className="lg:col-span-1">
                                <div
                                    className="glass-widget-surface rounded-2xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl shadow-blue-950/5">
                                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mb-3 sm:mb-4">Problem</h2>
                                    <div className="prose dark:prose-invert prose-sm max-w-none text-sm sm:text-base">
                                        {renderMarkdown(unit.exercise.promptMarkdown)}
                                    </div>

                                    {/* Test Cases */}
                                    {unit.exercise.testCases.length > 0 && (
                                        <div className="mt-4 sm:mt-6">
                                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-2 sm:mb-3">
                                                Test Cases ({unit.exercise.testCases.length})
                                            </h3>
                                            <div className="space-y-2">
                                                {unit.exercise.testCases.map((tc, idx) => (
                                                    !tc.isHidden && (
                                                        <div
                                                            key={tc.id}
                                                            className="glass-widget-surface rounded-2xl p-2 sm:p-3 text-xs font-mono shadow-lg shadow-blue-950/5 overflow-x-auto"
                                                        >
                                                            <p className="text-slate-500 dark:text-slate-400 mb-1">
                                                                Test {idx + 1}
                                                            </p>
                                                            <p className="text-slate-900 dark:text-white break-all">
                                                                Input: {tc.inputText || '(empty)'}
                                                            </p>
                                                            <p className="text-emerald-600 dark:text-emerald-400 break-all">
                                                                Expected: {tc.expectedOutput}
                                                            </p>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hints */}
                                    {feedback?.hints && feedback.hints.length > 0 && (
                                        <div className="mt-4 sm:mt-6">
                                            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mb-2 sm:mb-3">
                                                💡 Hints
                                            </h3>
                                            <div className="space-y-2">
                                                {feedback.hints.map((hint) => (
                                                    <div
                                                        key={hint.position}
                                                        className={`rounded-2xl p-2 sm:p-3 text-xs sm:text-sm ${
                                                            hint.unlocked
                                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200'
                                                                : 'glass-widget-surface text-slate-500 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        <p className="font-semibold mb-1">Hint {hint.position}</p>
                                                        {hint.unlocked ? (
                                                            <p>{hint.hintText}</p>
                                                        ) : (
                                                            <p className="italic">Unlock by making more attempts</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Code Editor */}
                            <div className="lg:col-span-2 flex flex-col">
                                {/* Editor */}
                                <div className="glass-widget-surface text-slate-900 dark:text-white rounded-2xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-xl shadow-blue-950/5 flex-1 flex flex-col">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                                        <div>
                                            <p className="text-xs text-slate-400 uppercase font-bold">Language</p>
                                            <p className="font-bold capitalize text-sm sm:text-base">
                                                {unit.exercise.language}
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleSubmitCode}
                                            disabled={submitting || isLocked || isCompleted}
                                            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center sm:justify-start space-x-2 min-h-[44px]"
                                        >
                                            <Play size={16} fill="white"/>
                                            <span>{submitting ? 'Submitting...' : 'Submit Code'}</span>
                                        </button>
                                    </div>

                                    <Editor
                                        key={`${unit.id}-${unit.exercise.language}`}
                                        height="300px"
                                        language={unit.exercise.language?.toLowerCase()}
                                        defaultValue={sourceCode}
                                        onMount={(editor) => {
                                            editorRef.current = editor;
                                        }}
                                        onChange={(value) => setSourceCode(value || '')}
                                        theme="vs-dark"
                                        options={{
                                            minimap: {enabled: false},
                                            fontSize: 12,
                                            scrollBeyondLastLine: false,
                                            wordWrap: 'on',
                                            readOnly: isLocked,
                                        }}
                                    />

                                    <p className="text-xs text-slate-400 mt-2 sm:mt-3 overflow-x-auto">
                                        Limits: {unit.exercise.maxCpuMs}ms CPU, {unit.exercise.maxMemoryKb}KB Memory
                                    </p>
                                </div>

                                {/* Submission Results */}
                                {submission && (
                                    <div
                                        className="mt-4 sm:mt-6 glass-widget-surface rounded-2xl sm:rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl shadow-blue-950/5 overflow-x-auto">
                                        <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                                            {submission.status === 'queued' && (
                                                <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse"></div>
                                            )}
                                            {submission.status === 'running' && (
                                                <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                                            )}
                                            {(submission.status === 'finished' || submission.status === 'passed') && (
                                                <CheckCircle2 className="text-emerald-500" size={20}/>
                                            )}
                                            {submission.status === 'failed' && (
                                                <div className="text-red-500 font-bold">✗</div>
                                            )}
                                            <p className="font-bold text-slate-900 dark:text-white capitalize text-sm sm:text-base">
                                                {submission.status}
                                            </p>
                                        </div>

                                        {submission.compileOutput && (
                                            <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 overflow-x-auto">
                                                <p className="text-xs font-bold text-red-300 uppercase mb-2">
                                                    Compile Error
                                                </p>
                                                <p className="text-xs sm:text-sm text-red-700 dark:text-red-200 font-mono whitespace-pre-wrap break-words">
                                                    {submission.compileOutput}
                                                </p>
                                            </div>
                                        )}

                                        {submission.stderr && (
                                            <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 overflow-x-auto">
                                                <p className="text-xs font-bold text-red-300 uppercase mb-2">Error</p>
                                                <p className="text-xs sm:text-sm text-red-700 dark:text-red-200 font-mono whitespace-pre-wrap break-words">
                                                    {submission.stderr}
                                                </p>
                                            </div>
                                        )}

                                        {submission.stdout && (
                                            <div className="glass-widget-surface rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 shadow-lg shadow-blue-950/5 overflow-x-auto">
                                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                                                    Output
                                                </p>
                                                <p className="text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono whitespace-pre-wrap break-words">
                                                    {submission.stdout}
                                                </p>
                                            </div>
                                        )}

                                        {feedback?.testResults && feedback.testResults.length > 0 && (
                                            <div className="mt-3 sm:mt-4">
                                                <h3 className="font-bold text-slate-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">
                                                    Test Results
                                                </h3>
                                                <div className="space-y-2">
                                                    {feedback.testResults.map((result, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`rounded-2xl p-2 sm:p-3 border-l-4 text-xs sm:text-sm ${
                                                                result.passed
                                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-500'
                                                                    : 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-500'
                                                            }`}
                                                        >
                                                            <p
                                                                className={`font-bold ${
                                                                    result.passed
                                                                        ? 'text-emerald-700 dark:text-emerald-300'
                                                                        : 'text-red-700 dark:text-red-300'
                                                                }`}
                                                            >
                                                                 {result.passed ? '✓' : '✗'} Test {idx + 1}
                                                            </p>
                                                            {!result.passed && (
                                                                <div className="text-xs text-red-700 dark:text-slate-300 mt-2 font-mono break-all">
                                                                    <p>
                                                                        Expected:{' '}
                                                                        {result.expectedOutput}
                                                                    </p>
                                                                    <p>Actual: {result.actualOutput}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {submission.aiSummary && (
                                            <div
                                                className="mt-3 sm:mt-4 bg-blue-900/20 border border-blue-500/30 rounded-2xl p-3 sm:p-4">
                                                <p className="text-xs font-bold text-blue-300 uppercase mb-2">
                                                    AI Feedback
                                                </p>
                                                <p className="text-xs sm:text-sm text-blue-200 break-words">{submission.aiSummary}</p>
                                                {submission.aiScore !== undefined && (
                                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                                                        Score: {(isNaN(submission.aiScore) ? null : Number(submission.aiScore))?.toFixed(1)}%
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Submission History */}
                                {submissions && submissions.length > 0 && (
                                    <div className="mt-6 md:mt-8">
                                        <h3 className="font-bold text-slate-900 dark:text-white mb-2 sm:mb-3 text-sm sm:text-base">
                                            Previous Submissions ({submissions.length})
                                        </h3>
                                        <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
                                            {submissions.map((prev, idx) => (
                                                <div
                                                    key={prev.id}
                                                    className={`rounded-2xl p-3 sm:p-4 border-l-4 text-xs sm:text-sm ${
                                                        prev.status === 'passed'
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-500'
                                                            : prev.status === 'failed'
                                                                ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-500'
                                                        : 'glass-widget-surface'
                                                            }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                                        <p className="font-bold">
                                                            Submission #{submissions.length - idx}
                                                        </p>
                                                        <span
                                                            className={`text-xs font-bold px-2 py-1 rounded ${
                                                                prev.status === 'passed'
                                                                    ? 'bg-emerald-600 text-white'
                                                                    : prev.status === 'failed'
                                                                        ? 'bg-red-600 text-white'
                                                                        : 'bg-slate-400 text-slate-900'
                                                            }`}
                                                        >
																		{prev.status}
																	</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                                        {new Date(prev.finishedAt || prev.queuedAt).toLocaleString()}
                                                    </p>
                                                    <p className="text-sm mb-2">
																	<span className="font-semibold">
																		{prev.testsPassed}/{prev.totalTests}
																	</span>{' '}
                                                        tests passed
                                                    </p>
                                                    {prev.aiSummary && (
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                                                            {prev.aiSummary}
                                                        </p>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setAiExplanationError(null);
                                                            setSelectedSubmissionModal(prev.id);
                                                        }}
                                                        className="text-xs font-bold px-3 py-1 bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white rounded hover:bg-slate-400 dark:hover:bg-slate-600 transition-colors"
                                                    >
                                                        View Code
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ASSESSMENT/QUIZ CONTENT - Prepare Section */}
                    {(unit.type === 'assessment' && unit.quiz) && (
                        <div className="mb-6 md:mb-8">
                            <div
                                className="glass-widget-surface rounded-2xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl shadow-blue-950/5">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2 sm:mb-3">
                                    {unit.quiz.title}
                                </h2>
                                <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 mb-4 md:mb-6">{unit.quiz.instructions}</p>

                                {/* Preparation Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 md:mb-8">
                                    <div className="glass-widget-surface rounded-2xl sm:rounded-2xl p-3 sm:p-4 shadow-lg shadow-blue-950/5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Questions</p>
                                        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{unit.quiz.questions.length}</p>
                                    </div>
                                    <div className="glass-widget-surface rounded-2xl sm:rounded-2xl p-3 sm:p-4 shadow-lg shadow-blue-950/5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Time Limit</p>
                                        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{Math.floor(unit.quiz.timeLimitSeconds / 60)} min</p>
                                    </div>
                                    <div className="glass-widget-surface rounded-2xl sm:rounded-2xl p-3 sm:p-4 shadow-lg shadow-blue-950/5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Passing Score</p>
                                        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{unit.quiz.passingScore}%</p>
                                    </div>
                                </div>

                                {/* Start Button */}
                                <button
                                    onClick={() => navigate(`/student/courses/${courseId}/units/${unitId}/assessment`)}
                                    disabled={isCompleted}
                                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-2xl font-black text-sm sm:text-base md:text-lg transition-all hover:scale-[1.02] min-h-[44px] sm:min-h-auto"
                                >
                                    {isCompleted ? '✓ Completed' : 'Start Assessment'}
                                </button>
                            </div>

                            {/* Previous Submissions */}
                            {unit.quiz.submissions && unit.quiz.submissions.length > 0 && (
                                <div className="mt-6 md:mt-8">
                                    <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white mb-3 sm:mb-4">Previous Attempts</h3>
                                    <div className="space-y-2 sm:space-y-3">
                                        {unit.quiz.submissions.map((submission) => (
                                            <div
                                                key={submission.id}
                                                className={`border rounded-2xl sm:rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                                                    submission.isPassed
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                                                        : 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                                                }`}
                                            >
                                                <div className="text-sm">
                                                    <p className="font-bold text-slate-900 dark:text-white">Attempt {submission.attemptNumber}</p>
                                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                                        {new Date(submission.submittedAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="sm:text-right flex flex-col sm:items-end gap-2">
                                                    <p className={`text-xl sm:text-2xl font-black ${submission.isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
                                                        {submission.scorePercent}%
                                                    </p>
                                                    <p className={`text-xs font-bold uppercase ${submission.isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
                                                        {submission.isPassed ? 'Passed' : 'Failed'}
                                                    </p>
                                                    <button
                                                        onClick={() =>
                                                            navigate(
                                                                `/student/courses/${courseId}/units/${unitId}/assessment?reviewAttemptId=${submission.id}`,
                                                            )
                                                        }
                                                        className="text-xs font-bold px-3 py-1.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                                    >
                                                        Review Attempt
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FINAL EXAM CONTENT - Prepare Section */}
                    {unit.type === 'final_exam' && unit.finalExam && (
                        <div className="mb-6 md:mb-8">
                            <div
                                className="glass-widget-surface rounded-2xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl shadow-blue-950/5">
                                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2 sm:mb-3">
                                    {unit.finalExam.title}
                                </h2>

                                {/* Preparation Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 md:mb-8">
                                    <div className="glass-widget-surface rounded-2xl sm:rounded-2xl p-3 sm:p-4 shadow-lg shadow-blue-950/5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Max Attempts</p>
                                        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{unit.finalExam.maxAttempts}</p>
                                    </div>
                                    <div className="glass-widget-surface rounded-2xl sm:rounded-2xl p-3 sm:p-4 shadow-lg shadow-blue-950/5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Time Limit</p>
                                        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{Math.floor(unit.finalExam.timeLimitSeconds / 60)} min</p>
                                    </div>
                                    <div className="glass-widget-surface rounded-2xl sm:rounded-2xl p-3 sm:p-4 shadow-lg shadow-blue-950/5">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold mb-1">Passing Score</p>
                                        <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{unit.finalExam.passingScore}%</p>
                                    </div>
                                </div>

                                {/* In-Progress Attempt Info */}
                                {unit.finalExamAttemptProgress && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-2xl sm:rounded-2xl p-3 sm:p-4 mb-4 md:mb-6">
                                        <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-semibold">
                                            Attempt #{unit.finalExamAttemptProgress.attemptNumber} in progress
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                            Started: {new Date(unit.finalExamAttemptProgress.startedAt).toLocaleString()}
                                        </p>
                                    </div>
                                )}

                                {/* Start/Continue Button */}
                                <button
                                    onClick={() => navigate(`/student/courses/${courseId}/units/${unitId}/assessment`)}
                                    disabled={isCompleted}
                                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-2xl font-black text-sm sm:text-base md:text-lg transition-all hover:scale-[1.02] min-h-[44px] sm:min-h-auto"
                                >
                                    {isCompleted ? '✓ Completed' : unit.finalExamAttemptProgress ? 'Continue Final Exam' : 'Start Final Exam'}
                                </button>

                                {unit.finalExamSubmissions && unit.finalExamSubmissions.length > 0 && (
                                    <div className="mt-4 sm:mt-6">
                                        <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white mb-3 sm:mb-4">
                                            Submission History
                                        </h3>
                                        <div className="space-y-2 sm:space-y-3">
                                            {unit.finalExamSubmissions
                                                .slice()
                                                .sort((a, b) => b.attemptNumber - a.attemptNumber)
                                                .map((submission) => (
                                                    <div
                                                        key={submission.id}
                                                        className={`border rounded-2xl sm:rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${
                                                            submission.isPassed
                                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                                                                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                                                        }`}
                                                    >
                                                        <div className="text-sm">
                                                            <p className="font-bold text-slate-900 dark:text-white">
                                                                Attempt {submission.attemptNumber}
                                                            </p>
                                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                                                                {new Date(submission.submittedAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="sm:text-right flex flex-col sm:items-end gap-2">
                                                            <p className={`text-xl sm:text-2xl font-black ${submission.isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
                                                                {submission.scorePercent}%
                                                            </p>
                                                            <p className={`text-xs font-bold uppercase ${submission.isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-400'}`}>
                                                                {submission.isPassed ? 'Passed' : 'Failed'}
                                                            </p>
                                                            {submission.isPassed && (
                                                                <button
                                                                    onClick={() =>
                                                                        navigate(
                                                                            `/student/courses/${courseId}/units/${unitId}/assessment?reviewAttemptId=${submission.id}`,
                                                                        )
                                                                    }
                                                                    className="text-xs font-bold px-3 py-1.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                                                >
                                                                    Review Attempt
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* OTHER TYPES MESSAGE */}
                    {unit.type !== 'module' && unit.type !== 'exercise' && unit.type !== 'assessment' && unit.type !== 'final_exam' && (
                        <div className="mb-6 md:mb-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/20 dark:border-blue-400/20 rounded-2xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-center shadow-xl shadow-blue-950/5">
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium">
                                This unit type is not yet supported.
                            </p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {unit.type === 'module' && (
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 md:mt-12">
                            <button
                                onClick={handleBack}
                                className="flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-2xl sm:rounded-2xl font-black text-sm sm:text-base md:text-lg transition-all hover:scale-[1.02] min-h-[44px] sm:min-h-auto"
                            >
                                Back to Course
                            </button>
                            {!isLocked && !isCompleted && (
                                <button
                                    onClick={handleCompleteUnit}
                                    disabled={completing}
                                    className="flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-2xl sm:rounded-2xl font-black text-sm sm:text-base md:text-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-auto"
                                >
                                    {completing ? 'Completing...' : 'Mark as Complete'}
                                </button>
                            )}
                            {isCompleted && (
                                <div
                                    className="flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 bg-emerald-600 text-white rounded-2xl sm:rounded-2xl font-black text-sm sm:text-base md:text-lg flex items-center justify-center space-x-2 min-h-[44px] sm:min-h-auto">
                                    <CheckCircle2 size={20}/>
                                    <span>Completed</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Submission Code Viewer Modal */}
            {selectedSubmissionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
                    <div
                        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-blue-400/20 rounded-2xl sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div
                            className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/20 dark:border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-start sm:items-center gap-4">
                            <div className="flex-1">
                                <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                                    Submission Code
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    Status:{' '}
                                    <span
                                        className={`font-semibold ${
                                            selectedSubmission?.status === 'passed'
                                                ? 'text-emerald-600'
                                                : 'text-orange-600'
                                        }`}
                                    >
										{selectedSubmission?.status?.toUpperCase() || 'Unknown'}
									</span>
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setAiExplanationError(null);
                                    setSelectedSubmissionModal(null);
                                }}
                                className="flex-shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1"
                            >
                                <X size={24}/>
                            </button>
                        </div>

                        <div className="p-4 sm:p-6">
                            {selectedSubmission && (
                                <>
                                    <div className="mb-4 sm:mb-6">
                                        <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 sm:mb-3">
                                            Code
                                        </h3>
                                        <Editor
                                            height="300px"
                                            language={selectedSubmission.language || 'javascript'}
                                            defaultValue={selectedSubmission.sourceCode || ''}
                                            theme="vs-dark"
                                            options={{
                                                readOnly: true,
                                                minimap: {enabled: false},
                                                fontSize: 12,
                                                wordWrap: 'on',
                                            }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                Test Results
                                            </h3>
                                            <div className="space-y-2">
                                                {submissions
                                                    ?.find((s) => s.id === selectedSubmissionModal)?.testsPassed !== undefined && (
                                                    <div className="text-sm">
														<span className="text-emerald-600 font-semibold">
															{selectedSubmission.testsPassed}
														</span>
                                                        <span className="text-slate-600 dark:text-slate-400">
															{' '}
                                                            passed
														</span>
                                                    </div>
                                                )}
                                                {submissions
                                                    ?.find((s) => s.id === selectedSubmissionModal)?.totalTests !== undefined && (
                                                    <div className="text-sm">
														<span className="text-red-600 font-semibold">
															{(selectedSubmission.totalTests ?? 0) - (selectedSubmission.testsPassed ?? 0)}
														</span>
                                                        <span className="text-slate-600 dark:text-slate-400">
															{' '}
                                                            failed
														</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                Submitted At
                                            </h3>
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 break-words">
                                                {submissions
                                                    ?.find((s) => s.id === selectedSubmissionModal)?.queuedAt
                                                    ? new Date(
                                                        selectedSubmission.queuedAt || ''
                                                    ).toLocaleString()
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mb-4 sm:mb-6">
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                AI Code Explanation
                                            </h3>
                                            <button
                                                onClick={handleAskAiExplanation}
                                                disabled={askingAiExplanation || !!selectedSubmission.aiCodeExplanation}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-semibold transition-colors"
                                            >
                                                <Bot size={14} />
                                                {selectedSubmission.aiCodeExplanation
                                                    ? 'Already Used'
                                                    : askingAiExplanation
                                                        ? 'Analyzing...'
                                                        : "Ask AI What's Wrong"}
                                            </button>
                                        </div>

                                        {aiExplanationError && (
                                            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mb-2">{aiExplanationError}</p>
                                        )}

                                        {selectedSubmission.aiCodeExplanation ? (
                                            <div className="glass-widget-surface p-3 sm:p-4 rounded-2xl shadow-lg shadow-blue-950/5 text-sm text-slate-700 dark:text-slate-300">
                                                <MarkdownContent content={selectedSubmission.aiCodeExplanation} />
                                            </div>
                                        ) : (
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                                You can ask AI for explanation once for this submission.
                                            </p>
                                        )}
                                    </div>

                                    {selectedSubmission.stdout && (
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                Output
                                            </h3>
                                            <pre
                                                className="glass-widget-surface p-3 sm:p-4 rounded-2xl text-xs sm:text-sm text-slate-700 dark:text-slate-300 overflow-auto max-h-40 shadow-lg shadow-blue-950/5 break-words">
												{selectedSubmission.stdout}
											</pre>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple markdown to HTML converter
function renderMarkdown(markdown: string) {
    return <MarkdownContent content={markdown} />;
}

function getYoutubeEmbedUrl(input: string): string | null {
    if (!input) return null;
    try {
        const url = new URL(input);
        const host = url.hostname.replace(/^www\./, '');

        if (host === 'youtu.be') {
            const id = url.pathname.split('/').filter(Boolean)[0];
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }

        if (host === 'youtube.com' || host === 'm.youtube.com') {
            if (url.pathname === '/watch') {
                const id = url.searchParams.get('v');
                return id ? `https://www.youtube.com/embed/${id}` : null;
            }
            if (url.pathname.startsWith('/shorts/')) {
                const id = url.pathname.split('/')[2];
                return id ? `https://www.youtube.com/embed/${id}` : null;
            }
            if (url.pathname.startsWith('/embed/')) {
                const id = url.pathname.split('/')[2];
                return id ? `https://www.youtube.com/embed/${id}` : null;
            }
        }
    } catch {
        return null;
    }
    return null;
}







