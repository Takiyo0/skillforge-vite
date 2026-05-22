export interface ApiError {
	message: string;
	statusCode?: number;
	timestamp?: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	pagination?: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

export interface LoginRequest {
	email: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
	displayName: string;
}

export interface AuthResponse {
	accessToken: string;
	user: User;
}

export interface UserPreference {
	userId: string;
	darkModeEnabled: boolean;
	preferredLocale: string;
	onboardingCompleted: boolean;
	updatedAt: string;
}

export interface UserBadge {
	badgeId: string;
	code: string;
	name: string;
	description: string;
	iconS3Key: string | null;
	awardedAt: string;
}

export interface User {
	id: string;
	email: string;
	displayName: string;
	bio?: string;
	avatarS3Key: string | null;
	level: number;
	totalXp: number;
	roles: string[];
	preference: UserPreference;
	badges: UserBadge[];
	createdAt: string;
	lastLoginAt?: string;
	updatedAt?: string;
}

export interface XpSummary {
	userId: string;
	level: number;
	totalXp: number;
	xpForCurrentLevel: number;
	xpForNextLevel: number;
	xpIntoCurrentLevel: number;
	xpNeededForNextLevel: number;
	progressPercent: number;
	maxLevel: number;
	isMaxLevel: boolean;
	byEventType: Record<string, number>;
	recentEvents: Array<{
		eventType: string;
		points: number;
		sourceType: string;
		sourceId: string;
		createdAt: string;
	}>;
}

export interface Streak {
	userId: string;
	currentStreakDays: number;
	longestStreakDays: number;
	lastActivityDate: string;
}

export interface Badge {
	id: string;
	name: string;
	description: string;
	icon: string;
	unlockedAt: string;
}

export interface UserBadgesResponse {
	userId: string;
	totalBadges: number;
	badges: Array<{
		badgeId: string;
		code: string;
		name: string;
		description: string;
		iconS3Key: string | null;
		awardedAt: string;
	}>;
}

export type BadgeCriteriaType = 'first_course' | 'xp_milestone';

export interface BadgeCriteriaFieldOption {
	value: string | number;
	label: string;
}

export interface BadgeCriteriaFieldDefinition {
	key: string;
	label: string;
	type: 'select' | 'number';
	required: boolean;
	options?: BadgeCriteriaFieldOption[];
	min?: number;
	step?: number;
	helperText?: string;
}

export interface BadgeCriteriaMetadata {
	type: BadgeCriteriaType;
	label: string;
	description: string;
	fields: BadgeCriteriaFieldDefinition[];
}

export interface BadgeCriteria {
	type: BadgeCriteriaType;
	language?: string;
	xp?: number;
}

export interface AdminBadge {
	id: string;
	code: string;
	name: string;
	description: string;
	iconS3Key: string | null;
	criteria: BadgeCriteria;
	createdAt: string;
	updatedAt?: string;
}

export interface CreateBadgeRequest {
	code: string;
	name: string;
	description?: string;
	iconS3Key?: string | null;
	criteriaType: BadgeCriteriaType;
	language?: string;
	xp?: number;
}

export interface UpdateBadgeRequest {
	code?: string;
	name?: string;
	description?: string;
	iconS3Key?: string | null;
	criteriaType?: BadgeCriteriaType;
	language?: string;
	xp?: number;
}

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type UnitType = 'module' | 'exercise' | 'assessment' | 'final_exam';
export type UnitStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface CourseCreator {
	id: string;
	displayName: string;
	bio?: string;
}

export interface Course {
	id: string;
	slug: string;
	title: string;
	subtitle: string;
	description: string;
	thumbnailS3Key: string | null;
	trailerUrl: string | null;
	level: CourseLevel;
	language: string;
	priceCents: number;
	currencyCode: string;
	unitCount: number;
	isPublished?: boolean;
	creator: CourseCreator;
	createdAt: string;
	updatedAt: string;
	// enrollment fields (present in /courses/enrolled response)
	enrolled?: boolean;
	enrollmentStatus?: 'active' | 'completed' | 'dropped';
	progressPercent?: string;
	enrolledAt?: string;
	units?: UnitPreview[];
}

export interface CourseUnitsResponse {
	courseId: string;
	units: UnitPreview[];
}

export interface UnitPreview {
	id: string;
	title: string;
	summary: string;
	type: UnitType;
	estimatedMinutes: number;
	position: number;
	isPublished?: boolean;
	prerequisites?: Prerequisite[];
	requiredFor?: Prerequisite[];
}

export interface Prerequisite {
	id: string;
	title: string;
	type?: UnitType;
	position?: number;
}

export interface ModuleContent {
	contentKind: string;
	videoUrl?: string;
	articleMarkdown?: string;
	subtitleS3Key?: string;
	playbackSpeeds?: number[];
	supportsPip?: boolean;
}

export interface ModuleResource {
	id: string;
	unitId: string;
	label: string;
	resourceType: string;
	s3Key: string;
	url?: string;
	createdAt: string;
}

export interface TestCase {
	id: string;
	inputText: string;
	expectedOutput: string;
	isHidden: boolean;
	weight: number;
}

export interface Hint {
	id: string;
	hintText: string;
	unlockAfterFailedAttempts: number;
	position: number;
}

export interface ExerciseSubmission {
	id: string;
	userId: string;
	language: string;
	sourceCode: string;
	status: string;
	aiScore: number | null;
	aiSummary: string | null;
	aiCodeExplanation?: string | null;
	testsPassed: number;
	testsFailed: number;
	stdout: string;
	stderr: string;
	queuedAt: string;
	finishedAt: string;
}

export interface ExerciseDetails {
	id: string;
	difficulty: 'normal' | 'advanced';
	title: string;
	promptMarkdown: string;
	language: string;
	starterCode: string;
	maxCpuMs: number;
	maxMemoryKb: number;
	createdAt: string;
	testCases: TestCase[];
	hints: Hint[];
	submissions: ExerciseSubmission[];
}

export interface QuizOption {
	id: string;
	label: string;
	isCorrect?: boolean;
	position?: number;
}

export interface QuizQuestion {
	id: string;
	questionType: 'single_choice' | 'multiple_choice' | 'short_answer';
	prompt: string;
	explanation: string;
	points: number;
	position: number;
	answerMultiple: boolean;
	options: QuizOption[];
}

export interface QuizSubmissionHistory {
	id: string;
	attemptNumber: number;
	scorePercent: string;
	isPassed: boolean;
	startedAt: string;
	submittedAt: string;
}

export interface Quiz {
	id: string;
	title: string;
	instructions: string;
	passingScore: number;
	timeLimitSeconds: number;
	randomizeQuestions: boolean;
	randomizeOptions: boolean;
	createdAt: string;
	questions: QuizQuestion[];
	submissions?: QuizSubmissionHistory[];
}

export interface FinalExamSubmissionHistory {
	id: string;
	attemptNumber: number;
	scorePercent: string;
	isPassed: boolean;
	startedAt: string;
	submittedAt: string;
}

export interface FinalExam {
	unitId: string;
	title: string;
	passingScore: number;
	maxAttempts: number;
	timeLimitSeconds: number;
	createdAt: string;
	questions?: QuizQuestion[];
	submissions?: FinalExamSubmissionHistory[];
	components?: Array<{
		id: string;
		type: string;
		questionType: string;
		prompt: string;
		explanation?: string;
		points: number;
		position: number;
		answerMultiple?: boolean;
		options?: Array<{
			id: string;
			label: string;
			isCorrect: boolean;
		}>;
	}>;
}

export interface FinalExamWithQuestions extends FinalExam {
	questions: QuizQuestion[];
}

export interface FinalExamAttemptProgress {
	attemptId: string;
	attemptNumber: number;
	startedAt: string;
	timeElapsedSeconds: number;
}

export interface CourseInfo {
	id: string;
	slug: string;
	title: string;
	subtitle: string;
	description: string;
	level: CourseLevel;
	language: string;
	isPublished: boolean;
}

export interface Unit {
	id: string;
	courseId: string;
	course: CourseInfo;
	title: string;
	summary: string;
	type: UnitType;
	position: number;
	estimatedMinutes: number;
	isPublished: boolean;
	createdAt: string;
	updatedAt: string;
	prerequisites: Prerequisite[];
	requiredFor: Prerequisite[];
	moduleContent: ModuleContent | null;
	moduleResources?: ModuleResource[];
	exercise: ExerciseDetails | null;
	quiz: Quiz | null;
	finalExam?: FinalExam | null;
	finalExamSubmissions?: FinalExamSubmissionHistory[];
	finalExamAttemptProgress?: FinalExamAttemptProgress | null;
}

export interface UnitProgress {
	unitId: string;
	title: string;
	type: UnitType;
	position: number;
	status: UnitStatus;
	lastScorePercent: number | null;
	startedAt: string | null;
	completedAt: string | null;
}

export interface CourseProgress {
	courseId: string;
	courseTitle: string;
	enrollmentStatus: string;
	progressPercent: string;
	unitProgress: UnitProgress[];
	completedUnits: number;
	totalUnits: number;
}

export interface SubmitCodeRequest {
	exerciseId: string;
	language: string;
	sourceCode: string;
}

export interface SubmissionTestResult {
	testCaseId: string;
	passed: boolean;
	actualOutput: string;
	expectedOutput: string;
	executionTimeMs: number;
	memoryKb: number;
}

export interface SubmissionResponse {
	id: string;
	status: string;
	kind: string;
	language: string;
	sourceCode?: string;
	attemptNumber: number;
	queuedAt: string;
	finishedAt?: string | null;
	stdout?: string;
	stderr?: string;
	compileOutput?: string;
	aiSummary?: string;
	aiScore?: number;
	aiCodeExplanation?: string;
	testsPassed?: number;
	totalTests?: number;
	testResults?: SubmissionTestResult[];
}

export interface HintDto {
	hintText: string;
	unlocked: boolean;
	position: number;
}

export interface FeedbackTestResult {
	passed: boolean;
	actualOutput: string;
	expectedOutput: string;
}

export interface SubmissionFeedback {
	submissionId: string;
	status: string;
	testsPassed: number;
	totalTests: number;
	hints: HintDto[];
	testResults: FeedbackTestResult[];
}

export interface ExerciseSubmissionResponse {
	submissionId: string;
	status: string;
	passed?: boolean;
	testResults?: TestResult[];
}

export interface TestResult {
	testName: string;
	passed: boolean;
	error?: string;
}

export interface QuizAnswerDto {
	questionId: string;
	selectedOptionIds: string[];
	answerText?: string;
}

export interface QuizAnswerResultDto {
	questionId: string;
	selectedOptionIds: string[];
	isCorrect: boolean;
	scoreAwarded: number;
	correctOptionIds?: string[];
	explanation?: string;
}

export interface QuizSubmissionResponse {
	attemptId: string;
	quizId: string;
	scorePercent: number;
	isPassed: boolean;
	attemptNumber: number;
	submittedAt: string;
	answers: QuizAnswerResultDto[];
}

export interface AttemptReviewQuestion {
	questionId: string;
	questionType: 'single_choice' | 'multiple_choice' | 'short_answer';
	prompt: string;
	points: number;
	selectedOptionIds: string[];
	isCorrect?: boolean;
	explanation?: string;
	correctOptionIds?: string[];
	options: QuizOption[];
}

export interface AttemptReviewResponse {
	attempt: {
		id: string;
		attemptNumber: number;
		scorePercent: number;
		isPassed: boolean;
		startedAt: string;
		submittedAt: string;
	};
	revealAnswerDetails: boolean;
	questions: AttemptReviewQuestion[];
}

export interface FinalExamAttemptStartResponse {
	attemptId: string;
	attemptNumber: number;
	startedAt: string;
	timeElapsedSeconds: number;
	exam: FinalExam;
	questions: QuizQuestion[];
}

export interface FinalExamSubmissionResponse {
	attemptId: string;
	attemptNumber: number;
	scorePercent: number;
	isPassed: boolean;
	submittedAt: string;
	message: string;
}

export interface QuizQuestion {
	id: string;
	question: string;
	options: QuizOption[];
	type: 'MULTIPLE_CHOICE' | 'SINGLE_CHOICE';
}

export interface QuizOption {
	id: string;
	text: string;
}

export interface CourseRecommendation {
	courseId: string;
	title: string;
	reason: string;
	relevanceScore: number;
}

export interface CertificateCompletionSnapshot {
	userName: string;
	courseName: string;
	totalUnits: number;
	completedAt: string;
	courseLevel: string;
}

export interface QrPayload {
	userId: string;
	courseId: string;
	issuedAt: string;
	certificateCode: string;
	verificationCode: string;
}

export interface Certificate {
	id: string;
	certificateCode: string;
	courseId: string;
	issuedAt: string;
	qrPayload: QrPayload;
	pdfS3Key: string;
	verificationCode: string;
	isRevoked: boolean;
	revokedAt: string | null;
	user: User;
	course: Course;
}

export interface CertificateDownloadResponse {
	downloadUrl: string;
}

export interface CertificateVerificationInfo {
	id: string;
	certificateCode: string;
	userName: string;
	courseName: string;
	courseLevel: string;
	issuedAt: string;
	completedAt: string;
}

export interface CertificateVerificationResponse {
	isValid: boolean;
	certificate?: CertificateVerificationInfo;
	message?: string;
}

export interface LearningPathCourse {
	courseId: string;
	courseName: string;
	courseSlug: string;
	courseLevel: CourseLevel;
	courseLanguage: string;
	courseDescription: string;
	courseThumbnail: string | null;
	position: number;
	id?: string;
	title?: string;
	description?: string | null;
	level?: CourseLevel;
	language?: string;
	thumbnailS3Key?: string | null;
	progressPercent?: number;
	completed?: boolean;
}

export interface LearningPathCriteria {
	languages?: string[];
	alreadyKnow?: string[];
	wantToLearn?: string[];
}

export interface LearningPath {
	id: string;
	slug: string;
	title: string;
	description: string;
	criteria: LearningPathCriteria;
	courses: LearningPathCourse[];
	createdAt: string;
}

export interface LearningPathResponse {
	message?: string;
	id?: string;
	slug?: string;
	title?: string;
	description?: string;
	criteria?: LearningPathCriteria;
	courses?: LearningPathCourse[];
	createdAt?: string;
}

export interface JoinLearningPathResponse {
	message: string;
	learningPathId: string;
}

export interface LeaveLearningPathResponse {
	message: string;
}

export interface UserCourseProgress {
	completedUnits: number;
	totalUnits: number;
	progressPercent: string;
}

export interface UserEnrolledCourse {
	courseId: string;
	courseTitle: string;
	courseSlug: string;
	courseLevel: string;
	enrolledAt: string;
	status: string;
	progress: UserCourseProgress;
}

export interface UserCertificate {
	certificateId: string;
	certificateCode: string;
	courseName: string;
	issuedAt: string;
	pdfS3Key: string;
}

export interface RecentActivity {
	createdAt: string;
	eventCount: number;
	totalPoints: number;
}

export interface UserProfile {
	id: string;
	displayName: string;
	avatarS3Key: string | null;
	bio: string | null;
	level: number;
	totalXp: number;
	currentStreak: number;
	badges: UserBadge[];
	enrolledCourses: UserEnrolledCourse[];
	certificates: UserCertificate[];
	recentActivity: RecentActivity[];
}

export interface SandboxLanguage {
	id: string;
	name: string;
	baseCode?: string;
}

export interface SandboxTestCaseRequest {
	input?: string;
	output?: string;
}

export interface SandboxRunResultItem {
	index: number;
	input: string;
	expectedOutput?: string;
	actualOutput: string;
	stderr?: string;
	compileOutput?: string;
	exitCode: number;
	isCorrect: boolean | null;
	passed: boolean;
}

export interface SandboxRunResponse {
	language: string;
	results: SandboxRunResultItem[];
}

// ============================================================================
// Admin API Types - Learning Paths
// ============================================================================

export interface CreateLearningPathRequest {
	slug: string;
	title: string;
	description: string;
	criteria?: {
		wantToLearn?: string[];
		languages?: string[];
		alreadyKnow?: string[];
	};
	isPublic?: boolean;
}

export interface UpdateLearningPathRequest {
	slug?: string;
	title?: string;
	description?: string;
	criteria?: {
		wantToLearn?: string[];
		languages?: string[];
		alreadyKnow?: string[];
	};
	isPublic?: boolean;
}

export interface AddCoursesToPathRequest {
	courseIds: string[];
}

export interface ReorderCoursesInPathRequest {
	courseIds: string[];
}

// ============================================================================
// Admin API Types - Courses
// ============================================================================

export interface CreateCourseRequest {
	title: string;
	subtitle: string;
	description: string;
	level: CourseLevel;
	language: string;
	priceCents: number;
	currencyCode: string;
}

export interface UpdateCourseRequest {
	title?: string;
	subtitle?: string;
	description?: string;
	level?: CourseLevel;
	language?: string;
	priceCents?: number;
	currencyCode?: string;
	isPublished?: boolean;
}

// ============================================================================
// Admin API Types - Units
// ============================================================================

export interface CreateUnitRequest {
	title: string;
	type: UnitType;
	position: number;
	summary: string;
	estimatedMinutes: number;
}

export interface UpdateUnitRequest {
	title?: string;
	type?: UnitType;
	position?: number;
	summary?: string;
	estimatedMinutes?: number;
	isPublished?: boolean;
}

export interface AddUnitPrerequisiteRequest {
	prerequisiteUnitId: string;
}

// ============================================================================
// Admin API Types - Exercises
// ============================================================================

export interface CreateExerciseRequest {
	title: string;
	promptMarkdown: string;
	difficulty: 'normal' | 'advanced';
	language: string;
	starterCode: string;
	maxCpuMs: number;
	maxMemoryKb: number;
}

export interface UpdateExerciseRequest {
	title?: string;
	promptMarkdown?: string;
	difficulty?: 'normal' | 'advanced';
	language?: string;
	starterCode?: string;
	maxCpuMs?: number;
	maxMemoryKb?: number;
}

export interface CreateTestCaseRequest {
	inputText: string;
	expectedOutput: string;
}

export interface UpdateTestCaseRequest {
	inputText?: string;
	expectedOutput?: string;
}

export interface CreateHintRequest {
	content: string;
	requiredFailedAttempts: number;
}

export interface UpdateHintRequest {
	content?: string;
	requiredFailedAttempts?: number;
}

// ============================================================================
// Admin API Types - Quizzes
// ============================================================================

export interface CreateQuizRequest {
	title: string;
	instructions: string;
	passingScore: number;
	timeLimitSeconds: number;
	randomizeQuestions: boolean;
	randomizeOptions: boolean;
}

export interface UpdateQuizRequest {
	title?: string;
	instructions?: string;
	passingScore?: number;
	timeLimitSeconds?: number;
	randomizeQuestions?: boolean;
	randomizeOptions?: boolean;
}

export interface CreateQuizOptionRequest {
	label: string;
	isCorrect: boolean;
}

export interface UpdateQuizOptionRequest {
	label?: string;
	isCorrect?: boolean;
}

export interface CreateQuizQuestionRequest {
	prompt: string;
	questionType: 'single_choice' | 'multiple_choice' | 'short_answer';
	points: number;
	position: number;
	options: CreateQuizOptionRequest[];
}

export interface UpdateQuizQuestionRequest {
	prompt?: string;
	questionType?: 'single_choice' | 'multiple_choice' | 'short_answer';
	points?: number;
	position?: number;
	options?: UpdateQuizOptionRequest[];
}

// ============================================================================
// Admin API Types - Module Content
// ============================================================================

export interface CreateModuleContentRequest {
	contentKind: string;
	videoUrl?: string;
	articleMarkdown?: string;
	subtitleS3Key?: string;
	playbackSpeeds?: number[];
	supportsPip?: boolean;
}

export interface UpdateModuleContentRequest {
	contentKind?: string;
	videoUrl?: string;
	articleMarkdown?: string;
	subtitleS3Key?: string;
	playbackSpeeds?: number[];
	supportsPip?: boolean;
}

// ============================================================================
// Admin API Types - Final Exam
// ============================================================================

export interface CreateFinalExamRequest {
	title: string;
	passingScore: number;
	maxAttempts: number;
	timeLimitSeconds: number;
}

export interface UpdateFinalExamRequest {
	title?: string;
	passingScore?: number;
	maxAttempts?: number;
	timeLimitSeconds?: number;
}
