import React, { useCallback, useEffect, useState } from 'react';
import { Users, BookOpen, Activity, BarChart3, X, Loader2, Database, RefreshCw, BrainCircuit, AlertTriangle, CheckCircle, XCircle, FileQuestion, HelpCircle, Maximize2, ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react';
import {
    api,
    dashboardApi,
    chatApi,
    moodleApi,
    studentApi,
    teacherApi,
    type DashboardAnalytics,
    type MoodleCourse,
    type StudentProfile,
    type StudentAnalytics,
    type PendingQuiz
} from '../api/client';
import { actionButtonClass, cn } from '../lib/utils';
import { SimpleMarkdown } from "./SimpleMarkdown";

interface LearningPathWeaknessDetail {
    topic: string;
    average_score: number;
    severity: 'high' | 'medium';
    quizzes: { name: string; score: number }[];
}

interface LearningPath {
    status: string;
    message?: string;
    weaknesses?: string[];
    weakness_details?: LearningPathWeaknessDetail[];
    study_plan?: string;
    recommendations?: string[];
    pinned_recommendations?: string[];
}

interface KnowledgeBaseSource {
    name: string;
    type: string;
    chunks: number;
    section?: string;
    cmid?: number | null;
    moodle_path?: string | null;
}

interface KnowledgeBaseData {
    course_id: number;
    document_count: number;
    sources: KnowledgeBaseSource[];
}

interface TeacherDashboardProps {
    initialCourseId?: number;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ initialCourseId }) => {
    const [courseId, setCourseId] = useState(initialCourseId || 101);
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [courses, setCourses] = useState<MoodleCourse[]>([]);
    const [isIngesting, setIsIngesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgressPercent, setSyncProgressPercent] = useState<number | null>(null);
    const [lastAnalyticsSyncedAt, setLastAnalyticsSyncedAt] = useState<Date | null>(null);
    const [analyticsHighlight, setAnalyticsHighlight] = useState(false);
    const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const toastTimerRef = React.useRef<number | null>(null);
    const [lastAnalyticsDetails, setLastAnalyticsDetails] = useState<string | null>(null);
    const [isSyncHelpOpen, setIsSyncHelpOpen] = useState(false);
    const [kbCoverage, setKbCoverage] = useState<{ documentCount: number; sourceCount: number; qbankChunks: number } | null>(null);
    const [isKbCoverageLoading, setIsKbCoverageLoading] = useState(false);
    const [moodleReturnUrl, setMoodleReturnUrl] = useState<string | null>(null);
    const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);
    const [isEmbedded, setIsEmbedded] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [teacherModeDetailsOpen, setTeacherModeDetailsOpen] = useState(false);
    const teacherModeDetailsTouchedRef = React.useRef(false);
    const headerNavRowRef = React.useRef<HTMLDivElement | null>(null);
    const headerActionsRowRef = React.useRef<HTMLDivElement | null>(null);
    const [navCanScrollLeft, setNavCanScrollLeft] = useState(false);
    const [navCanScrollRight, setNavCanScrollRight] = useState(false);
    const [actionsCanScrollLeft, setActionsCanScrollLeft] = useState(false);
    const [actionsCanScrollRight, setActionsCanScrollRight] = useState(false);
    const syncProgressIntervalRef = React.useRef<number | null>(null);
    const syncTimeoutRef = React.useRef<number | null>(null);
    const syncRequestIdRef = React.useRef(0);
    const timedOutSyncRequestIdsRef = React.useRef<Set<number>>(new Set());

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);
    const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
    const [isLoadingPath, setIsLoadingPath] = useState(false);
    const [pinnedRecommendations, setPinnedRecommendations] = useState<string[]>([]);
    const [newRecommendation, setNewRecommendation] = useState<string>('');

    // Knowledge Base State
    const [isKbOpen, setIsKbOpen] = useState(false);
    const [kbData, setKbData] = useState<KnowledgeBaseData | null>(null);
    const [isLoadingKb, setIsLoadingKb] = useState(false);
    const [isClearingKb, setIsClearingKb] = useState(false);
    const [isClearKbConfirmOpen, setIsClearKbConfirmOpen] = useState(false);
    const [clearKbConfirmText, setClearKbConfirmText] = useState("");
    const [kbSearch, setKbSearch] = useState("");
    const [kbTypeFilters, setKbTypeFilters] = useState<Record<string, boolean>>({
        forum: true,
        page: true,
        quiz: true,
        qbank: true,
        url: true,
        assignment: true,
    });

    const [isChatLogOpen, setIsChatLogOpen] = useState(false);
    const [chatLogAdminToken, setChatLogAdminToken] = useState("");
    const [chatLogStudentId, setChatLogStudentId] = useState<number | null>(null);
    const [chatLogLimit, setChatLogLimit] = useState(200);
    const [chatLogRows, setChatLogRows] = useState<Array<{ id: number; role: 'user' | 'assistant'; content: string; created_at: string }>>([]);
    const [chatLogError, setChatLogError] = useState<string | null>(null);
    const [isChatLogLoading, setIsChatLogLoading] = useState(false);
    const [chatLogSearch, setChatLogSearch] = useState("");
    const [chatLogRoleFilter, setChatLogRoleFilter] = useState<"" | "user" | "assistant">("");

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profileStudent, setProfileStudent] = useState<{ id: number; name: string } | null>(null);
    const [profileForm, setProfileForm] = useState<{ learningStyle: string; strengths: string; weaknesses: string }>({
        learningStyle: 'General',
        strengths: '',
        weaknesses: ''
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Quiz Management State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'quizzes'>('dashboard');
    const [quizSubTab, setQuizSubTab] = useState<'pending' | 'approved'>('pending');
    const [pendingQuizzes, setPendingQuizzes] = useState<PendingQuiz[]>([]);
    const [approvedQuizzes, setApprovedQuizzes] = useState<PendingQuiz[]>([]);
    const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
    const [generateTopic, setGenerateTopic] = useState('');
    const [previewStudentId, setPreviewStudentId] = useState<number | null>(null);
    const [pendingQuizTopicFilter, setPendingQuizTopicFilter] = useState<string>("");
    const [pendingQuizSort, setPendingQuizSort] = useState<"newest" | "oldest" | "topic_az" | "topic_za">("newest");

    useEffect(() => {
        if (initialCourseId) {
            setCourseId(initialCourseId);
        }
        const fetchCourses = async () => {
            try {
                const data = await moodleApi.getCourses();
                setCourses(data);
                if (!initialCourseId && data.length > 0 && !data.find(c => c.id === courseId)) {
                    setCourseId(data[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch courses", error);
            }
        };
        fetchCourses();
    }, [initialCourseId, courseId]);

    useEffect(() => {
        const key = `aiTutor:moodleReturn:${courseId}`;
        try {
            const stored = window.localStorage.getItem(key);
            if (stored) {
                setMoodleReturnUrl(stored);
                return;
            }
        } catch {
            void 0;
        }

        try {
            const ref = document.referrer ? String(document.referrer) : "";
            if (!ref) return;
            if (!/^https?:\/\//i.test(ref)) return;
            window.localStorage.setItem(key, ref);
            setMoodleReturnUrl(ref);
        } catch {
            void 0;
        }
    }, [courseId]);

    useEffect(() => {
        try {
            setIsEmbedded(window.self !== window.top);
        } catch {
            setIsEmbedded(true);
        }

        try {
            const url = new URL(window.location.href);
            url.searchParams.set("mode", "fullscreen");
            setFullScreenUrl(url.toString());
        } catch {
            setFullScreenUrl(null);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const mq = window.matchMedia("(max-width: 639px)");
        const update = () => setIsSmallScreen(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        if (teacherModeDetailsTouchedRef.current) return;
        setTeacherModeDetailsOpen(false);
    }, [isEmbedded]);

    useEffect(() => {
        return () => {
            if (toastTimerRef.current) {
                window.clearTimeout(toastTimerRef.current);
            }
            if (syncProgressIntervalRef.current) {
                window.clearInterval(syncProgressIntervalRef.current);
            }
            if (syncTimeoutRef.current) {
                window.clearTimeout(syncTimeoutRef.current);
            }
        };
    }, []);

    const getAnalyticsSnapshot = (a: DashboardAnalytics) => {
        const totalStudents = Number(a.total_students) || 0;
        const activeStudents =
            typeof a.active_students === 'number'
                ? a.active_students
                : (a.students || []).filter((s: StudentAnalytics) => (Number(s.avg_score) || 0) > 0).length;
        const averageScore = Number(a.average_score) || 0;
        const atRisk = (a.students || []).filter((s: StudentAnalytics) => {
            if (s.risk_level) return s.risk_level === 'at_risk';
            return (Number(s.avg_score) || 0) < 50;
        }).length;
        const quizzesTakenTotal = (a.students || []).reduce((sum: number, s: StudentAnalytics) => sum + (Number(s.quizzes_taken) || 0), 0);
        const aiQuizzesTakenTotal = (a.students || []).reduce((sum: number, s: StudentAnalytics) => sum + (Number(s.ai_quizzes_taken) || 0), 0);
        const modulesCompletedTotal = (a.students || []).reduce(
            (sum: number, s: StudentAnalytics) => sum + (Number(s.completed_modules_count) || 0),
            0
        );
        return { totalStudents, activeStudents, averageScore, atRisk, quizzesTakenTotal, aiQuizzesTakenTotal, modulesCompletedTotal };
    };

    const extractChecklistFromStudyPlan = (studyPlan?: string) => {
        if (!studyPlan) return [];
        const out: string[] = [];
        const seen = new Set<string>();
        const lines = studyPlan.split(/\r?\n/);
        for (const line of lines) {
            const t = line.trim();
            if (!t) continue;
            const stepMatch = t.match(/^\*\*Step\s*\d+:\s*([^*]+)\*\*$/i) || t.match(/^Step\s*\d+:\s*(.+)$/i);
            if (stepMatch) {
                const v = stepMatch[1].trim();
                if (v && !seen.has(v)) {
                    seen.add(v);
                    out.push(v);
                }
                continue;
            }
            const bulletMatch = t.match(/^[-*]\s+(.*)$/);
            if (bulletMatch) {
                const v = bulletMatch[1].trim();
                if (v && v.length <= 140 && !seen.has(v)) {
                    seen.add(v);
                    out.push(v);
                }
            }
        }
        return out.slice(0, 6);
    };

    const normalizeKbType = (t?: string) => {
        const v = String(t || "").toLowerCase();
        if (v.includes("forum")) return "forum";
        if (v.includes("page")) return "page";
        if (v.includes("assign")) return "assignment";
        if (v.includes("qbank") || v.includes("question")) return "qbank";
        if (v.includes("quiz")) return "quiz";
        if (v.includes("url")) return "url";
        return "other";
    };

    const getFilteredKbSources = (data: KnowledgeBaseData) => {
        const search = kbSearch.trim().toLowerCase();
        return (data.sources || []).filter((s) => {
            const normalized = normalizeKbType(s.type);
            const enabled = normalized === "other" ? true : !!kbTypeFilters[normalized];
            if (!enabled) return false;
            if (!search) return true;
            const hay = `${s.name} ${s.type} ${s.section || ""}`.toLowerCase();
            return hay.includes(search);
        });
    };

    const getSafeMoodleActivityHref = (source: KnowledgeBaseSource) => {
        const base = api.defaults.baseURL || "";
        const tryParseCmid = () => {
            const raw = source.moodle_path;
            if (!raw) return null;
            const s = String(raw);
            const q = s.includes("?") ? s.split("?")[1] : "";
            if (!q) return null;
            const params = new URLSearchParams(q);
            const id = params.get("id");
            if (!id) return null;
            const n = Number(id);
            return Number.isFinite(n) ? n : null;
        };
        const cmid = source.cmid ?? tryParseCmid();
        if (!cmid) return null;
        return `${base}/moodle/activity-link?course_id=${encodeURIComponent(String(courseId))}&cmid=${encodeURIComponent(String(cmid))}`;
    };

    const updateHeaderRowScrollState = useCallback(() => {
        const update = (
            el: HTMLDivElement | null,
            setLeft: (v: boolean) => void,
            setRight: (v: boolean) => void
        ) => {
            if (!el) return;
            const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
            const left = el.scrollLeft;
            setLeft(left > 2);
            setRight(left < maxScrollLeft - 2);
        };
        update(headerNavRowRef.current, setNavCanScrollLeft, setNavCanScrollRight);
        update(headerActionsRowRef.current, setActionsCanScrollLeft, setActionsCanScrollRight);
    }, []);

    const scrollHeaderRowBy = useCallback((row: "nav" | "actions", delta: number) => {
        const el = row === "nav" ? headerNavRowRef.current : headerActionsRowRef.current;
        if (!el) return;
        el.scrollBy({ left: delta, behavior: "smooth" });
        window.setTimeout(() => updateHeaderRowScrollState(), 60);
    }, [updateHeaderRowScrollState]);

    useEffect(() => {
        updateHeaderRowScrollState();
        const onResize = () => updateHeaderRowScrollState();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [updateHeaderRowScrollState, isEmbedded, isSmallScreen, isSyncing, syncProgressPercent, isSyncHelpOpen, teacherModeDetailsOpen]);

    const downloadKbCsv = () => {
        if (!kbData) return;
        const id = kbData.course_id ?? courseId;
        const course = courses.find(c => c.id === id);
        const courseShort = course?.shortname ? String(course.shortname) : "";
        const courseFull = course?.fullname ? String(course.fullname) : "";

        const rows = getFilteredKbSources(kbData);
        const header = ["course_id", "course_shortname", "course_fullname", "section", "name", "type", "chunks"];
        const escapeCell = (v: unknown) => {
            const s = String(v ?? "");
            const needsQuotes = /[",\r\n]/.test(s);
            const escaped = s.replace(/"/g, '""');
            return needsQuotes ? `"${escaped}"` : escaped;
        };

        const lines = [
            header.join(","),
            ...rows.map((r) =>
                [
                    escapeCell(id),
                    escapeCell(courseShort),
                    escapeCell(courseFull),
                    escapeCell(r.section || ""),
                    escapeCell(r.name),
                    escapeCell(r.type),
                    escapeCell(r.chunks),
                ].join(",")
            ),
        ];
        const csv = lines.join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const date = new Date().toISOString().slice(0, 10);
        const baseName = courseShort ? courseShort.replace(/[^A-Za-z0-9_-]+/g, "_") : `course_${id}`;
        a.href = url;
        a.download = `kb_summary_${baseName}_${date}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const loadDashboard = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await dashboardApi.getAnalytics(courseId);
            setAnalytics(data);
        } catch (error) {
            console.error("Failed to load dashboard", error);
        } finally {
            setIsLoading(false);
        }
    }, [courseId]);

    const loadKbCoverage = useCallback(async () => {
        setIsKbCoverageLoading(true);
        try {
            const data = await chatApi.getKnowledgeBase(courseId);
            const documentCount = Number(data?.document_count) || 0;
            const sourceCount = Array.isArray(data?.sources) ? data.sources.length : 0;
            const qbankChunks = Array.isArray(data?.sources)
                ? data.sources.reduce((sum: number, s: { type?: string; chunks?: number }) => {
                      const t = String(s?.type || "").toLowerCase();
                      const isQbank = t.includes("qbank") || t.includes("question");
                      return sum + (isQbank ? Number(s?.chunks) || 0 : 0);
                  }, 0)
                : 0;
            setKbCoverage({ documentCount, sourceCount, qbankChunks });
        } catch (error) {
            console.error("Failed to load KB coverage", error);
            setKbCoverage(null);
        } finally {
            setIsKbCoverageLoading(false);
        }
    }, [courseId]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        loadKbCoverage();
    }, [loadKbCoverage]);

    const loadPendingQuizzes = useCallback(async () => {
        try {
            setIsLoadingQuizzes(true);
            const data = await teacherApi.getPendingQuizzes(courseId);
            setPendingQuizzes(data);
        } catch (error) {
            console.error("Failed to load pending quizzes", error);
        } finally {
            setIsLoadingQuizzes(false);
        }
    }, [courseId]);

    const loadApprovedQuizzes = useCallback(async () => {
        try {
            setIsLoadingQuizzes(true);
            const data = await teacherApi.getApprovedQuizzes(courseId);
            setApprovedQuizzes(data);
        } catch (error) {
            console.error("Failed to load approved quizzes", error);
        } finally {
            setIsLoadingQuizzes(false);
        }
    }, [courseId]);

    useEffect(() => {
        if (activeTab === 'quizzes') {
            if (quizSubTab === "pending") loadPendingQuizzes();
            else loadApprovedQuizzes();
        }
    }, [activeTab, quizSubTab, loadPendingQuizzes, loadApprovedQuizzes]);

    useEffect(() => {
        if (previewStudentId) return;
        const firstStudentId = analytics?.students?.[0]?.id;
        if (typeof firstStudentId === "number") {
            setPreviewStudentId(firstStudentId);
        }
    }, [analytics, previewStudentId]);

    const handleApproveQuiz = async (quizId: string) => {
        try {
            await teacherApi.approveQuiz(courseId, quizId);
            const approvedItem = pendingQuizzes.find(q => q.id === quizId);
            setPendingQuizzes(prev => prev.filter(q => q.id !== quizId));
            if (approvedItem) {
                setApprovedQuizzes(prev => [{ ...approvedItem, status: "approved" }, ...prev]);
            }
            if (quizSubTab === "approved") {
                await loadApprovedQuizzes();
            }
        } catch {
            alert("Failed to approve quiz");
        }
    };

    const handleRejectQuiz = async (quizId: string) => {
        try {
            await teacherApi.rejectQuiz(courseId, quizId);
            setPendingQuizzes(prev => prev.filter(q => q.id !== quizId));
        } catch {
            alert("Failed to reject quiz");
        }
    };

    const handleGenerateQuizzes = async () => {
        if (!generateTopic) return;
        try {
            setIsLoadingQuizzes(true);
            // Generate 3 candidates at a time
            await teacherApi.generateQuizCandidates(courseId, generateTopic, 3);
            await loadPendingQuizzes();
            setGenerateTopic('');
        } catch {
            alert("Failed to generate quizzes");
        } finally {
            setIsLoadingQuizzes(false);
        }
    };

    const encodePreviewQuizParam = (quiz: PendingQuiz) => {
        try {
            const payload = JSON.stringify({
                question: quiz.question,
                options: quiz.options,
                correct_answer: quiz.correct_answer,
                explanation: quiz.explanation,
                hint: quiz.hint,
            });
            const bytes = new TextEncoder().encode(payload);
            let bin = "";
            bytes.forEach((b) => {
                bin += String.fromCharCode(b);
            });
            const b64 = window.btoa(bin);
            return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
        } catch {
            return null;
        }
    };

    const buildStudentPreviewUrl = (quiz: PendingQuiz) => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set("role", "student");
            url.searchParams.set("courseId", String(courseId));
            url.searchParams.set("studentId", String(previewStudentId || 3));
            const encoded = encodePreviewQuizParam(quiz);
            if (encoded) {
                url.searchParams.set("previewQuiz", encoded);
            }
            if (quiz.topic) {
                url.searchParams.set("previewTopic", quiz.topic);
            }
            return url.toString();
        } catch {
            return null;
        }
    };

    const handleViewPlan = async (studentId: number, studentName: string) => {
        setSelectedStudent({ id: studentId, name: studentName });
        setLearningPath(null);
        setIsLoadingPath(true);
        setPinnedRecommendations([]);
        setNewRecommendation('');

        try {
            const data = await chatApi.getLearningPath(courseId, studentId);
            setLearningPath(data);
            setPinnedRecommendations(data.pinned_recommendations || []);
        } catch (error) {
            console.error("Failed to fetch learning path", error);
        } finally {
            setIsLoadingPath(false);
        }
    };

    const closeModal = () => {
        setSelectedStudent(null);
        setLearningPath(null);
        setPinnedRecommendations([]);
        setNewRecommendation('');
    };

    const handleSync = async () => {
        const requestId = ++syncRequestIdRef.current;
        if (isSyncing) return;
        try {
            setIsSyncing(true);
            setSyncProgressPercent(5);
            if (syncProgressIntervalRef.current) window.clearInterval(syncProgressIntervalRef.current);
            if (syncTimeoutRef.current) window.clearTimeout(syncTimeoutRef.current);

            const startedAt = Date.now();
            syncProgressIntervalRef.current = window.setInterval(() => {
                const elapsedMs = Date.now() - startedAt;
                const estimatedMs = 12000;
                const pct = Math.min(90, Math.round((elapsedMs / estimatedMs) * 90));
                setSyncProgressPercent((prev) => {
                    if (prev === null) return pct;
                    return Math.max(prev, pct);
                });
            }, 300);

            syncTimeoutRef.current = window.setTimeout(() => {
                timedOutSyncRequestIdsRef.current.add(requestId);
                setIsSyncing(false);
                setSyncProgressPercent(null);
                setToast({ tone: 'error', message: 'Sync is taking longer than expected. Click Retry to try again.' });
                if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                toastTimerRef.current = window.setTimeout(() => setToast(null), 4500);
            }, 15000);

            const before = analytics ? getAnalyticsSnapshot(analytics) : null;
            const data = await dashboardApi.syncAnalytics(courseId);
            if (timedOutSyncRequestIdsRef.current.has(requestId)) return;
            if (requestId !== syncRequestIdRef.current) return;

            setAnalytics(data);
            const syncedAt = new Date();
            setLastAnalyticsSyncedAt(syncedAt);
            setAnalyticsHighlight(true);
            const after = getAnalyticsSnapshot(data);
            const parts: string[] = [];
            if (before) {
                parts.push(`Class avg: ${before.averageScore.toFixed(1)}% → ${after.averageScore.toFixed(1)}%`);
                parts.push(`At risk: ${before.atRisk} → ${after.atRisk}`);
                parts.push(`Active: ${before.activeStudents} → ${after.activeStudents}`);
                const deltaQuizResults = after.quizzesTakenTotal - before.quizzesTakenTotal;
                const deltaAiQuizResults = after.aiQuizzesTakenTotal - before.aiQuizzesTakenTotal;
                const deltaCompletions = after.modulesCompletedTotal - before.modulesCompletedTotal;
                parts.push(`New quiz results ingested: ${deltaQuizResults >= 0 ? `+${deltaQuizResults}` : String(deltaQuizResults)}`);
                parts.push(`New completions ingested: ${deltaCompletions >= 0 ? `+${deltaCompletions}` : String(deltaCompletions)}`);
                parts.push(`New AI quizzes ingested: ${deltaAiQuizResults >= 0 ? `+${deltaAiQuizResults}` : String(deltaAiQuizResults)}`);
            } else {
                parts.push(`Class avg: ${after.averageScore.toFixed(1)}%`);
                parts.push(`At risk: ${after.atRisk}`);
                parts.push(`Active: ${after.activeStudents}`);
                parts.push(`Quiz results tracked: ${after.quizzesTakenTotal}`);
                parts.push(`Completions tracked: ${after.modulesCompletedTotal}`);
                parts.push(`AI quizzes tracked: ${after.aiQuizzesTakenTotal}`);
            }
            setLastAnalyticsDetails(`Updated based on latest sync. ${parts.join(' • ')}`);
            setToast({ tone: 'success', message: 'Class analytics updated successfully.' });
            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
            toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
            window.setTimeout(() => setAnalyticsHighlight(false), 1800);
            setSyncProgressPercent(100);
            window.setTimeout(() => setSyncProgressPercent(null), 600);
            loadKbCoverage();
            try {
                window.localStorage.setItem(`aiTutor:teacherAnalyticsUpdatedAt:${courseId}`, String(syncedAt.getTime()));
            } catch {
                void 0;
            }
        } catch (error: unknown) {
            console.error("Failed to sync analytics:", error);
            const err = error as { response?: { data?: { detail?: string } }; message?: string };
            const detail = err.response?.data?.detail || err.message || "Unknown error";
            const normalizedDetail = String(detail || "");
            const isTokenMissing =
                normalizedDetail.toLowerCase().includes("moodle_token") &&
                normalizedDetail.toLowerCase().includes("not configured");
            const isTokenInvalid =
                normalizedDetail.toLowerCase().includes("invalidtoken") ||
                normalizedDetail.toLowerCase().includes("invalid token") ||
                normalizedDetail.toLowerCase().includes("token not found");
            setToast({
                tone: 'error',
                message: isTokenMissing
                    ? "Sync failed: Moodle token is missing. Set MOODLE_TOKEN in your .env and restart the backend."
                    : isTokenInvalid
                        ? "Sync failed: Moodle token is invalid/expired. Generate a new Moodle Web Services token, update MOODLE_TOKEN, then restart the backend."
                    : `Sync failed: ${normalizedDetail}. Click Retry to try again.`
            });
            setLastAnalyticsDetails(null);
            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
            toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
        } finally {
            if (syncProgressIntervalRef.current) {
                window.clearInterval(syncProgressIntervalRef.current);
                syncProgressIntervalRef.current = null;
            }
            if (syncTimeoutRef.current) {
                window.clearTimeout(syncTimeoutRef.current);
                syncTimeoutRef.current = null;
            }
            setIsSyncing(false);
        }
    };

    const handleViewKb = async () => {
        setIsKbOpen(true);
        setIsLoadingKb(true);
        try {
            const data = await chatApi.getKnowledgeBase(courseId);
            setKbData(data);
        } catch (error) {
            console.error("Failed to load knowledge base", error);
        } finally {
            setIsLoadingKb(false);
        }
    };

    const closeKbModal = () => {
        setIsKbOpen(false);
        setKbData(null);
        setIsClearKbConfirmOpen(false);
        setClearKbConfirmText("");
        setKbSearch("");
    };

    const openChatLogs = () => {
        const firstStudentId = previewStudentId ?? analytics?.students?.[0]?.id ?? null;
        setChatLogStudentId(firstStudentId);
        setChatLogRows([]);
        setChatLogError(null);
        setChatLogSearch("");
        setChatLogRoleFilter("");
        setIsChatLogOpen(true);
    };

    const closeChatLogs = () => {
        setIsChatLogOpen(false);
        setChatLogRows([]);
        setChatLogError(null);
        setIsChatLogLoading(false);
    };

    const loadChatLogs = async () => {
        if (!chatLogStudentId) {
            setChatLogError("Select a student to view chat history.");
            return;
        }
        if (!chatLogAdminToken.trim()) {
            setChatLogError("Enter ADMIN_TOKEN to view chat history.");
            return;
        }
        try {
            setIsChatLogLoading(true);
            setChatLogError(null);
            const rows = await teacherApi.getChatHistoryAdmin(courseId, chatLogStudentId, chatLogAdminToken.trim(), chatLogLimit);
            setChatLogRows(rows);
        } catch (error: unknown) {
            const err = error as { response?: { data?: { detail?: string } }; message?: string };
            const detail = err.response?.data?.detail || err.message || "Failed to load chat history.";
            setChatLogError(detail);
        } finally {
            setIsChatLogLoading(false);
        }
    };

    const handleClearKb = async () => {
        if (!courseId) return;
        try {
            setIsClearingKb(true);
            await chatApi.clearKnowledgeBase(courseId);
            setKbData({
                course_id: courseId,
                document_count: 0,
                sources: []
            });
            setIsClearKbConfirmOpen(false);
            setClearKbConfirmText("");
        } catch (error) {
            console.error('Failed to clear knowledge base', error);
            alert('Failed to clear knowledge base.');
        } finally {
            setIsClearingKb(false);
        }
    };

    const handleEditProfile = async (studentId: number, studentName: string) => {
        setProfileStudent({ id: studentId, name: studentName });
        try {
            const profile: StudentProfile = await studentApi.getProfile(studentId);
            setProfileForm({
                learningStyle: profile.learning_style || 'General',
                strengths: (profile.strengths || []).join(', '),
                weaknesses: (profile.weaknesses || []).join(', ')
            });
            setIsProfileModalOpen(true);
        } catch (error) {
            console.error('Failed to load student profile', error);
            alert('Failed to load student profile.');
        }
    };

    const handleSaveProfile = async () => {
        if (!profileStudent) return;
        try {
            setIsSavingProfile(true);
            const strengths = profileForm.strengths
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            const weaknesses = profileForm.weaknesses
                .split(',')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            const updated = await studentApi.updateProfile(profileStudent.id, {
                learning_style: profileForm.learningStyle,
                strengths,
                weaknesses
            });
            setAnalytics(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    students: prev.students.map((s: StudentAnalytics) =>
                        s.id === profileStudent.id
                            ? { ...s, learning_style: updated.learning_style }
                            : s
                    )
                };
            });
            setIsProfileModalOpen(false);
        } catch (error) {
            console.error('Failed to save student profile', error);
            alert('Failed to save student profile.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleIngest = async () => {
        if (!courseId) return;
        setIsIngesting(true);
        try {
            setIsIngesting(true);
            await chatApi.ingestCourse(courseId);
            alert("Course content (including files) ingested successfully!");
        } catch (error: unknown) {
            console.error("Failed to ingest course", error);
            const err = error as { response?: { data?: { detail?: string } }; message?: string };
            const detail =
                err?.response?.data?.detail ||
                err?.message ||
                "Unknown error";
            alert(`Failed to ingest course content: ${detail}`);
        } finally {
            setIsIngesting(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50 sm:max-w-6xl sm:mx-auto sm:border-x sm:border-gray-200">
            <header className="bg-white border-b border-gray-200 px-4 py-4 sm:p-6 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-white" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
                            <p className="text-sm text-gray-500">Monitor student progress and AI interactions</p>
                            <div className="mt-1">
                                <span
                                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border bg-indigo-50 border-indigo-200 text-indigo-800"
                                    title="Teacher view: monitor class analytics, review quiz candidates, manage KB coverage, and validate student experience via preview."
                                >
                                    Role: Teacher
                                </span>
                            </div>
                            <details
                                className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                                open={teacherModeDetailsOpen}
                                onToggle={(e) => {
                                    teacherModeDetailsTouchedRef.current = true;
                                    setTeacherModeDetailsOpen((e.currentTarget as HTMLDetailsElement).open);
                                }}
                            >
                                <summary className="cursor-pointer select-none">
                                    <span className="font-semibold text-gray-900">Teacher mode enabled</span>
                                    <span className="ml-2 text-blue-700 underline underline-offset-2 font-semibold">
                                        {teacherModeDetailsOpen ? "Hide" : "Show"}
                                    </span>
                                </summary>
                                <div className="mt-2">
                                    Features: Sync Class Analytics • View Knowledge Base • Refresh Content • Pending Quizzes review • Preview student view • View/Pin Learning Paths
                                </div>
                            </details>
                            <div className="mt-1 text-xs text-gray-500">
                                {isKbCoverageLoading ? (
                                    <span>Knowledge Base: checking coverage…</span>
                                ) : kbCoverage ? (
                                    <span>
                                        {isEmbedded
                                            ? `KB: ${kbCoverage.documentCount} ch • ${kbCoverage.sourceCount} src • Qbank ${kbCoverage.qbankChunks}`
                                            : `Knowledge Base coverage: ${kbCoverage.documentCount} chunks • ${kbCoverage.sourceCount} sources • Qbank: ${kbCoverage.qbankChunks} chunks`}
                                    </span>
                                ) : (
                                    <span>Knowledge Base coverage: unavailable</span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 sm:items-end">
                      <div className="relative w-full sm:w-auto">
                        {(isEmbedded || isSmallScreen) && navCanScrollLeft && (
                          <button
                            type="button"
                            onClick={() => scrollHeaderRowBy("nav", -260)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700"
                            title="Scroll left"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                        {(isEmbedded || isSmallScreen) && navCanScrollRight && (
                          <button
                            type="button"
                            onClick={() => scrollHeaderRowBy("nav", 260)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700"
                            title="Scroll right"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                        <div
                          ref={headerNavRowRef}
                          onScroll={updateHeaderRowScrollState}
                          className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:justify-end sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0 scroll-smooth"
                          style={{ paddingLeft: (isEmbedded || isSmallScreen) ? 44 : undefined, paddingRight: (isEmbedded || isSmallScreen) ? 44 : undefined }}
                        >
                        <button
                            type="button"
                            onClick={() => setIsSyncHelpOpen(v => !v)}
                            className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
                            title="Help: what each button does"
                        >
                            <HelpCircle className="w-4 h-4" />
                        </button>
                        {(isEmbedded && fullScreenUrl) && (
                            <a
                                href={fullScreenUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 flex-shrink-0"
                                title="Open full-screen view"
                            >
                                <Maximize2 className="w-4 h-4" />
                                Full screen
                            </a>
                        )}
                        {moodleReturnUrl && (
                            <a
                                href={moodleReturnUrl}
                                target="_top"
                                rel="noreferrer"
                                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0"
                                title="Back to your Moodle course page"
                            >
                                Back to Moodle
                            </a>
                        )}
                        </div>
                      </div>

                      <div className="relative w-full sm:w-auto">
                        {(isEmbedded || isSmallScreen) && actionsCanScrollLeft && (
                          <button
                            type="button"
                            onClick={() => scrollHeaderRowBy("actions", -260)}
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700"
                            title="Scroll left"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                        {(isEmbedded || isSmallScreen) && actionsCanScrollRight && (
                          <button
                            type="button"
                            onClick={() => scrollHeaderRowBy("actions", 260)}
                            className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700"
                            title="Scroll right"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                        <div
                          ref={headerActionsRowRef}
                          onScroll={updateHeaderRowScrollState}
                          className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:justify-end sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0 scroll-smooth"
                          style={{ paddingLeft: (isEmbedded || isSmallScreen) ? 44 : undefined, paddingRight: (isEmbedded || isSmallScreen) ? 44 : undefined }}
                        >
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className={cn(actionButtonClass("info"), "!w-auto flex-shrink-0")}
                            title="Sync class analytics from Moodle (students, quizzes, engagement) and refresh the dashboard."
                        >
                            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                            {isSyncing && syncProgressPercent !== null ? `Syncing… ${syncProgressPercent}%` : (isSyncing ? 'Syncing…' : 'Sync Class Analytics')}
                        </button>

                        <button
                            onClick={handleViewKb}
                            className={cn(actionButtonClass("primary"), "!w-auto flex-shrink-0")}
                            title="View what course materials are currently ingested and available for AI grounded answers."
                        >
                            <BookOpen className="w-4 h-4" />
                            View Knowledge Base
                        </button>

                        <button
                            type="button"
                            onClick={openChatLogs}
                            className={cn(actionButtonClass("secondary"), "!w-auto flex-shrink-0")}
                            title="View persisted chat history (SQLite) for a student and course."
                        >
                            <MessageSquareText className="w-4 h-4" />
                            View Chat Logs
                        </button>

                        <button
                            onClick={handleIngest}
                            disabled={isIngesting}
                            className={cn(actionButtonClass("success"), "!w-auto flex-shrink-0")}
                            title="Refresh Content updates the AI knowledge base by extracting and indexing this course’s Moodle materials (does not change Moodle content). Included activity types: Page, URL, Assignment, Quiz, Forum (titles/provenance)."
                        >
                            {isIngesting ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Database className="w-4 h-4" />
                            )}
                            {isIngesting ? 'Refreshing…' : 'Refresh Content'}
                        </button>
                        </div>
                      </div>
                        {isSyncing && syncProgressPercent !== null && (
                            <div className="w-full">
                                <div className="flex items-center justify-between text-[11px] text-gray-500">
                                    <span>Syncing…</span>
                                    <span>{syncProgressPercent}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                                    <div
                                        className="h-full bg-blue-500 transition-all"
                                        style={{ width: `${syncProgressPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        <details className="w-full text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2" open={!isEmbedded}>
                          <summary className="cursor-pointer select-none font-semibold text-gray-700">
                            Analytics notes
                            <span className="ml-2 text-blue-700 underline underline-offset-2">
                              {isEmbedded ? "Show" : "Hide"}
                            </span>
                          </summary>
                          <div className="mt-2 space-y-2">
                            <div>
                              Sync Class Analytics refreshes teacher dashboard metrics. For the latest student progress, have students run Sync My Progress first, then run this sync.
                            </div>
                            <div>
                              Analytics update cadence: some metrics may not change immediately after a single student action. Risk is influenced by patterns such as low quiz performance, missing completions, and limited engagement over time.
                            </div>
                          </div>
                        </details>
                        <button
                          type="button"
                          onClick={() => setIsSyncHelpOpen(v => !v)}
                          className={cn(
                            "w-full sm:w-auto text-xs font-semibold text-blue-700 underline underline-offset-2 text-left sm:text-right",
                            isEmbedded && "hidden"
                          )}
                        >
                          {isSyncHelpOpen ? "Hide help" : "What do these do?"}
                        </button>
                        {isSyncHelpOpen && (
                          <div className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            <div className="font-semibold text-gray-900 mb-1">Quick help</div>
                            <ul className="list-disc pl-5 space-y-1">
                              <li><span className="inline-flex items-center gap-1 font-semibold"><RefreshCw className="w-3 h-3" /> Sync Class Analytics</span> updates teacher dashboard metrics from Moodle activity data.</li>
                              <li><span className="inline-flex items-center gap-1 font-semibold"><Database className="w-3 h-3" /> Refresh Content</span> rebuilds the AI knowledge base for this course (does not change Moodle content).</li>
                              <li><span className="inline-flex items-center gap-1 font-semibold"><BookOpen className="w-3 h-3" /> View Knowledge Base</span> shows what materials are currently ingested and available for grounded answers.</li>
                              <li><span className="font-semibold">Student precondition</span>: students should run Sync My Progress first for freshest analytics.</li>
                            </ul>
                            <details className="mt-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                              <summary className="cursor-pointer text-xs font-semibold text-gray-700">
                                Moodle placement tips
                              </summary>
                              <div className="mt-2 space-y-1">
                                <div><span className="font-semibold">Teacher dashboard block</span>: place this dashboard where instructors monitor class progress.</div>
                                <div><span className="font-semibold">Course page</span>: add a link or block entry so teachers can jump between the course and dashboard quickly.</div>
                                <div><span className="font-semibold">Recommended demo flow</span>: Refresh Content → student Sync My Progress → teacher Sync Class Analytics → View Plan/KB.</div>
                              </div>
                            </details>
                          </div>
                        )}
                        {lastAnalyticsDetails && (
                            <div className="w-full text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                {lastAnalyticsDetails}
                            </div>
                        )}
                        {toast && (
                            <div
                              className={cn(
                                "w-full text-xs font-medium px-3 py-2 rounded-lg border",
                                toast.tone === "success"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                  : "bg-red-50 border-red-200 text-red-800"
                              )}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span>{toast.message}</span>
                                {toast.tone === "error" && (
                                  <button
                                    type="button"
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    className="text-xs font-semibold underline underline-offset-2 disabled:opacity-50"
                                  >
                                    Retry
                                  </button>
                                )}
                              </div>
                            </div>
                        )}
                        {lastAnalyticsSyncedAt && (
                            <div className="w-full sm:w-auto text-xs text-gray-500 sm:text-right">
                              <span title={lastAnalyticsSyncedAt.toLocaleString()}>
                                Updated at {lastAnalyticsSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                        )}
                    </div>

                        {!initialCourseId && (
                            <div className="flex flex-col gap-1 w-full sm:w-auto">
                                <div className="text-[11px] text-gray-500">
                                    {(() => {
                                        const selected = courses.find(c => c.id === courseId);
                                        if (!selected) return `Course (ID: ${courseId})`;
                                        const left = selected.shortname ? selected.shortname : `Course ${selected.id}`;
                                        const right = selected.fullname ? selected.fullname : "";
                                        return right ? `${left} — ${right} (ID: ${selected.id})` : `${left} (ID: ${selected.id})`;
                                    })()}
                                </div>
                                <select 
                                    value={courseId}
                                    onChange={(e) => setCourseId(Number(e.target.value))}
                                    className="p-2 border rounded-md text-sm bg-white shadow-sm"
                                    aria-label="Select course"
                                >
                                    {courses.length > 0 ? (
                                        courses.map(course => (
                                            <option key={course.id} value={course.id}>
                                                {course.fullname} (ID: {course.id})
                                            </option>
                                        ))
                                    ) : (
                                        <>
                                            <option value={101}>Intro to AI (Course 101)</option>
                                            <option value={102}>Advanced Python (Course 102)</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        )}
                    </div>

                <div className="flex gap-4 border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === 'dashboard' 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('quizzes')}
                        className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === 'quizzes' 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Quizzes
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6">
                {activeTab === 'quizzes' ? (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">AI Question Generator</h2>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={generateTopic}
                                    onChange={(e) => setGenerateTopic(e.target.value)}
                                    placeholder="Enter a topic (e.g., 'Python Functions', 'Course Introduction')"
                                    className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                                />
                                <button
                                    onClick={handleGenerateQuizzes}
                                    disabled={isLoadingQuizzes || !generateTopic}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isLoadingQuizzes ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                                    Generate Candidates
                                </button>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setQuizSubTab("pending")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-semibold border",
                                        quizSubTab === "pending"
                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                    )}
                                >
                                    Pending ({pendingQuizzes.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuizSubTab("approved")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-sm font-semibold border",
                                        quizSubTab === "approved"
                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                    )}
                                >
                                    Approved ({approvedQuizzes.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (quizSubTab === "pending") loadPendingQuizzes();
                                        else loadApprovedQuizzes();
                                    }}
                                    className="ml-auto text-xs font-semibold text-blue-700 underline underline-offset-2"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="text-xs font-semibold text-gray-600">Preview student view as</div>
                                <select
                                    value={previewStudentId ?? ''}
                                    onChange={(e) => setPreviewStudentId(e.target.value ? Number(e.target.value) : null)}
                                    className="p-2 border border-gray-300 rounded-md text-sm w-full sm:w-auto"
                                    disabled={!analytics || !analytics.students || analytics.students.length === 0}
                                >
                                    {(analytics?.students && analytics.students.length > 0) ? (
                                        analytics.students.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} (ID: {s.id})
                                            </option>
                                        ))
                                    ) : (
                                        <option value="">Load students to preview</option>
                                    )}
                                </select>
                            </div>


                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FileQuestion className="w-5 h-5 text-gray-500" />
                                {quizSubTab === "pending"
                                    ? `Pending Review (${pendingQuizzes.length})`
                                    : `Approved Quizzes (${approvedQuizzes.length})`}
                            </h2>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-900">
                                <span className="font-semibold">Teacher note:</span> Pop Quiz generates a fresh question from course materials. Approved quizzes are used when students ask for a quiz on a specific topic (e.g., “give me a quiz about SQL joins”).
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <div className="text-xs font-semibold text-gray-600">Topic</div>
                                    <select
                                        value={pendingQuizTopicFilter}
                                        onChange={(e) => setPendingQuizTopicFilter(e.target.value)}
                                        className="p-2 border border-gray-300 rounded-md text-sm w-full sm:w-auto"
                                    >
                                        <option value="">All topics</option>
                                        {Array.from(
                                            new Set((quizSubTab === "pending" ? pendingQuizzes : approvedQuizzes).map(q => q.topic))
                                        ).sort((a, b) => a.localeCompare(b)).map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    <div className="sm:ml-auto flex items-center gap-2">
                                        <div className="text-xs font-semibold text-gray-600">Sort</div>
                                        <select
                                            value={pendingQuizSort}
                                            onChange={(e) => setPendingQuizSort(e.target.value as typeof pendingQuizSort)}
                                            className="p-2 border border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="newest">Newest first</option>
                                            <option value="oldest">Oldest first</option>
                                            <option value="topic_az">Topic A→Z</option>
                                            <option value="topic_za">Topic Z→A</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                    {(() => {
                                        const list = quizSubTab === "pending" ? pendingQuizzes : approvedQuizzes;
                                        const filteredCount = list.filter(q => !pendingQuizTopicFilter || q.topic === pendingQuizTopicFilter).length;
                                        return quizSubTab === "pending"
                                            ? `Showing ${filteredCount} of ${list.length} pending quizzes`
                                            : `Showing ${filteredCount} of ${list.length} approved quizzes`;
                                    })()}
                                </div>
                            </div>
                            
                            {(() => {
                                const list = quizSubTab === "pending" ? pendingQuizzes : approvedQuizzes;
                                if (isLoadingQuizzes && list.length === 0) {
                                    return <div className="text-center py-10 text-gray-500">Loading quizzes...</div>;
                                }
                                if (list.length === 0) {
                                    return (
                                        <div className="text-center py-10 bg-white rounded-xl border border-gray-200 text-gray-500">
                                            {quizSubTab === "pending"
                                                ? "No pending quizzes. Generate some above!"
                                                : "No approved quizzes yet. Approve candidates to publish them to students."}
                                        </div>
                                    );
                                }
                                return list
                                    .filter((q) => !pendingQuizTopicFilter || q.topic === pendingQuizTopicFilter)
                                    .sort((a, b) => {
                                        if (pendingQuizSort === "newest") return Number(b.created_at) - Number(a.created_at);
                                        if (pendingQuizSort === "oldest") return Number(a.created_at) - Number(b.created_at);
                                        if (pendingQuizSort === "topic_az") return String(a.topic).localeCompare(String(b.topic));
                                        if (pendingQuizSort === "topic_za") return String(b.topic).localeCompare(String(a.topic));
                                        return 0;
                                    })
                                    .map((quiz) => (
                                        <div key={quiz.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="inline-block px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-md mb-2 font-medium">
                                                        {quiz.topic}
                                                    </span>
                                                    <h3 className="text-lg font-medium text-gray-900">{quiz.question}</h3>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {(() => {
                                                        const previewUrl = buildStudentPreviewUrl(quiz);
                                                        if (!previewUrl) return null;
                                                        return (
                                                            <a
                                                                href={previewUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-2 py-1 text-sm font-medium text-indigo-700 hover:text-indigo-900 underline underline-offset-2"
                                                                title="Preview how this quiz appears in Student View (does not save results)"
                                                            >
                                                                Preview student view
                                                            </a>
                                                        );
                                                    })()}
                                                    {quizSubTab === "pending" ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleApproveQuiz(quiz.id)}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="Approve"
                                                            >
                                                                <CheckCircle className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleRejectQuiz(quiz.id)}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Reject"
                                                            >
                                                                <XCircle className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-md font-semibold">
                                                            Approved
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                                {quiz.options.map((option, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-3 rounded-lg border text-sm ${
                                                            option === quiz.correct_answer
                                                                ? 'bg-green-50 border-green-200 text-green-800 font-medium'
                                                                : 'bg-gray-50 border-gray-200 text-gray-700'
                                                        }`}
                                                    >
                                                        {option}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-2 text-sm">
                                                <div className="flex gap-2">
                                                    <span className="font-semibold text-gray-700">Explanation:</span>
                                                    <span className="text-gray-600">{quiz.explanation}</span>
                                                </div>
                                                {quiz.hint && (
                                                    <div className="flex gap-2">
                                                        <span className="font-semibold text-gray-700">Hint:</span>
                                                        <span className="text-gray-600 italic">{quiz.hint}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ));
                            })()}
                        </div>
                    </div>
                ) : (
                isLoading ? (
                    <div className="text-center py-20 text-gray-500">Loading analytics...</div>
                ) : analytics ? (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div
                          className={cn(
                            "rounded-xl transition-colors",
                            analyticsHighlight && "bg-emerald-50/60 ring-2 ring-emerald-200 p-1"
                          )}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Total Students</p>
                                        <p className="text-xl font-bold text-gray-900">{analytics.total_students}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-50 rounded-lg">
                                        <Activity className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Active Students</p>
                                        <p className="text-xl font-bold text-gray-900">{analytics.active_students ?? analytics.students.filter(s => s.avg_score > 0).length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-50 rounded-lg">
                                        <BrainCircuit className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Class Average</p>
                                        <p className="text-xl font-bold text-gray-900">{analytics.average_score}%</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-50 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">At Risk</p>
                                        <p className="text-xl font-bold text-gray-900">
                                            {analytics.students?.filter((s: StudentAnalytics) => {
                                                if (s.risk_level) return s.risk_level === 'at_risk';
                                                return (Number(s.avg_score) || 0) < 50;
                                            }).length || 0}
                                        </p>
                                    </div>
                                </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900">Data</h2>
                                    <p className="text-sm text-gray-500">Single-click links for the panel demo (KB + chat database)</p>
                                </div>
                                <div className="text-xs text-gray-500 text-right">
                                    <div>KB: ChromaDB (persisted)</div>
                                    <div>Chat: SQLite (persisted)</div>
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={handleViewKb}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50"
                                >
                                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        <BookOpen className="w-4 h-4 text-indigo-600" />
                                        View Knowledge Base
                                    </span>
                                    <span className="text-xs font-semibold text-blue-700 underline underline-offset-2">
                                        Open
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={openChatLogs}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:bg-gray-50"
                                >
                                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        <MessageSquareText className="w-4 h-4 text-indigo-600" />
                                        View Chat Logs
                                    </span>
                                    <span className="text-xs font-semibold text-blue-700 underline underline-offset-2">
                                        Open
                                    </span>
                                </button>
                            </div>

                            <div className="mt-3 text-xs text-gray-500">
                                Suggested demo flow: Refresh Content → View Knowledge Base → Student asks question → View Chat Logs (stored messages).
                            </div>
                        </div>

                        {/* Top Weaknesses */}
                        {analytics.top_weaknesses && analytics.top_weaknesses.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                                    Common Struggle Areas
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {analytics.top_weaknesses.map((w, idx) => (
                                        <div key={idx} className="bg-orange-50 border border-orange-100 p-3 rounded-lg flex justify-between items-center">
                                            <span className="font-medium text-orange-800 text-sm truncate" title={w.topic}>{w.topic}</span>
                                            <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-orange-600 border border-orange-100">
                                                {w.count} students
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Student List */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-lg font-bold text-gray-900">Student Performance</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b text-gray-500 text-sm">
                                            <th className="px-6 pb-3">Student Name</th>
                                            <th className="px-6 pb-3">Learning Style</th>
                                            <th className="px-6 pb-3">Avg Score</th>
                                            <th className="px-6 pb-3">Status</th>
                                            <th className="px-6 pb-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {analytics.students?.map((student: StudentAnalytics) => (
                                            <tr key={student.id} className="group hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium text-gray-900">
                                                    {student.name}
                                                </td>
                                                <td className="px-6 py-3 text-sm text-gray-600">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs ${
                                                            (student.learning_style as string) === 'Visual'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : (student.learning_style as string) === 'Auditory'
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : (student.learning_style as string) === 'Textual'
                                                                ? 'bg-indigo-100 text-indigo-800'
                                                                : (student.learning_style as string) === 'Kinesthetic'
                                                                ? 'bg-emerald-100 text-emerald-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                    >
                                                        {String(student.learning_style || 'General')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-sm">
                                                    <div className="font-medium text-gray-900">{student.avg_score}%</div>
                                                    <div className="mt-1 h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500"
                                                            style={{ width: `${Math.max(0, Math.min(100, Number(student.avg_score) || 0))}%` }}
                                                        />
                                                    </div>
                                                    {student.quiz_scores && Object.keys(student.quiz_scores).length > 0 && (
                                                        <div className="text-xs text-gray-500 mt-1 space-y-0.5 max-h-32 overflow-y-auto scrollbar-thin">
                                                            {/* Separate Moodle and AI scores */}
                                                            {(() => {
                                                                const scores = Object.entries(student.quiz_scores);
                                                                const moodleScores = scores.filter(([k]) => !k.startsWith('[AI]'));
                                                                const aiScores = scores.filter(([k]) => k.startsWith('[AI]'));
                                                                
                                                                // Calculate average for AI quizzes if many
                                                                const aiAvg = aiScores.length > 0 
                                                                    ? aiScores.reduce((acc, [, val]) => acc + Number(val), 0) / aiScores.length 
                                                                    : 0;

                                                                return (
                                                                    <>
                                                                        {moodleScores.map(([quiz, score]) => (
                                                                            <div key={quiz} className="flex justify-between gap-2">
                                                                                <span className="font-medium text-gray-600 truncate max-w-[150px]" title={quiz}>{quiz}:</span>
                                                                                <span>{String(score)}%</span>
                                                                            </div>
                                                                        ))}
                                                                        
                                                                        {aiScores.length > 0 && (
                                                                            <div className="mt-1 pt-1 border-t border-gray-100">
                                                                                <div className="flex justify-between gap-2 text-indigo-600 font-medium">
                                                                                    <span>AI Pop Quizzes ({aiScores.length}):</span>
                                                                                    <span>{Math.round(aiAvg)}% Avg</span>
                                                                                </div>
                                                                                {/* Collapsible detail could go here, but let's keep it simple for now */}
                                                                                <div className="text-[10px] text-gray-400 pl-2 border-l-2 border-indigo-100 mt-0.5">
                                                                                    Last: {aiScores[aiScores.length-1][1]}%
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-sm">
                                                    {(() => {
                                                        const score = Number(student.avg_score) || 0;
                                                        const risk = student.risk_level;
                                                        const reasons = (student.risk_reasons || []).join(' ');

                                                        let label = "At Risk";
                                                        let classes = "bg-red-50 text-red-700 border-red-200";

                                                        if (risk === 'no_data') {
                                                            label = "No Data";
                                                            classes = "bg-gray-50 text-gray-700 border-gray-200";
                                                        } else if (risk === 'on_track') {
                                                            label = "On Track";
                                                            classes = "bg-green-50 text-green-700 border-green-200";
                                                        } else if (risk === 'needs_support') {
                                                            label = "Needs Support";
                                                            classes = "bg-yellow-50 text-yellow-700 border-yellow-200";
                                                        } else if (risk === 'at_risk') {
                                                            label = "At Risk";
                                                            classes = "bg-red-50 text-red-700 border-red-200";
                                                        } else {
                                                            if (score >= 80) {
                                                                label = "On Track";
                                                                classes = "bg-green-50 text-green-700 border-green-200";
                                                            } else if (score >= 50) {
                                                                label = "Needs Support";
                                                                classes = "bg-yellow-50 text-yellow-700 border-yellow-200";
                                                            }
                                                        }

                                                        return (
                                                            <span
                                                                className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${classes}`}
                                                                title={reasons || undefined}
                                                            >
                                                                {label}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-3 text-sm">
                                                    <button 
                                                        onClick={() => handleViewPlan(student.id, student.name)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                    >
                                                        View Plan
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditProfile(student.id, student.name)}
                                                        className="ml-4 text-sm text-gray-600 hover:text-gray-900"
                                                    >
                                                        Edit Profile
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">No data available</div>
                ))}
            </div>

            {/* Learning Path Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Personalized Learning Path</h3>
                                <p className="text-sm text-gray-500">For {selectedStudent.name}</p>
                            </div>
                            <button 
                                onClick={closeModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {isLoadingPath ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                    <p>Generating personalized plan...</p>
                                </div>
                            ) : learningPath ? (
                                <div className="space-y-6">
                                    {learningPath.status === 'start' && (
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                            <h4 className="font-semibold text-blue-900 mb-2">👋 Welcome!</h4>
                                            <p className="text-blue-800 text-sm">{learningPath.message}</p>
                                        </div>
                                    )}
                                    
                                    {learningPath.status === 'on_track' && (
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                            <h4 className="font-semibold text-green-900 mb-2">🌟 Great Progress!</h4>
                                            <p className="text-green-800 text-sm">{learningPath.message}</p>
                                        </div>
                                    )}

                                    {learningPath.weaknesses && learningPath.weaknesses.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Identified Weaknesses</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {learningPath.weaknesses.map((w: string, i: number) => (
                                                    <span key={i} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                                        {w}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {learningPath.weakness_details && learningPath.weakness_details.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Performance by Topic</h4>
                                            <div className="space-y-2">
                                                {learningPath.weakness_details.map((w) => (
                                                    <div key={w.topic} className="flex items-start justify-between text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{w.topic}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {w.quizzes.map(q => `${q.name}: ${q.score}%`).join(' • ')}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-sm font-semibold text-gray-900">{w.average_score}%</span>
                                                            <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                w.severity === 'high'
                                                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                                                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                            }`}>
                                                                {w.severity === 'high' ? 'High Priority' : 'Medium Priority'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {learningPath.study_plan && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Recommended Study Plan</h4>
                                            {(() => {
                                                const checklist = extractChecklistFromStudyPlan(learningPath.study_plan);
                                                return (
                                                    <div className="space-y-3">
                                                        {checklist.length > 0 && (
                                                            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4">
                                                                <div className="text-xs font-semibold text-gray-900 mb-2">Student action checklist</div>
                                                                <div className="space-y-2">
                                                                    {checklist.map((step) => (
                                                                        <label key={step} className="flex items-start gap-2 text-sm text-gray-800">
                                                                            <input type="checkbox" disabled className="mt-0.5" />
                                                                            <span className="leading-relaxed">{step}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <details className="bg-white border border-gray-200 rounded-xl px-4 py-3">
                                                            <summary className="cursor-pointer text-xs font-semibold text-gray-700 py-1">
                                                                Optional details
                                                            </summary>
                                                            <SimpleMarkdown className="mt-2" text={learningPath.study_plan} />
                                                        </details>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {pinnedRecommendations.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                                Teacher Pinned Recommendations
                                            </h4>
                                            <ul className="space-y-2">
                                                {pinnedRecommendations.map((rec) => (
                                                    <li key={rec} className="flex items-start gap-3 text-sm text-gray-700">
                                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900">{rec}</div>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {learningPath.recommendations && learningPath.recommendations.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Next Steps</h4>
                                            <ul className="space-y-2">
                                                {learningPath.recommendations.map((rec: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700 justify-between">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                                            <span>{rec}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="ml-4 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                                            onClick={async () => {
                                                                if (!selectedStudent) return;
                                                                const updated = Array.from(new Set([...pinnedRecommendations, rec]));
                                                                setPinnedRecommendations(updated);
                                                                try {
                                                                    await dashboardApi.setLearningPathOverrides(
                                                                        selectedStudent.id,
                                                                        courseId,
                                                                        updated
                                                                    );
                                                                } catch (error) {
                                                                    console.error('Failed to save pinned recommendation', error);
                                                                }
                                                            }}
                                                        >
                                                            Pin
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="border-t border-gray-100 pt-4 mt-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                            Add Teacher Recommendation
                                        </h4>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="text"
                                                value={newRecommendation}
                                                onChange={(e) => setNewRecommendation(e.target.value)}
                                                placeholder="E.g., Schedule a 1:1 review on Topic 1 this week"
                                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                            />
                                            <button
                                                type="button"
                                                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                                disabled={!newRecommendation.trim() || !selectedStudent}
                                                onClick={async () => {
                                                    if (!selectedStudent) return;
                                                    const trimmed = newRecommendation.trim();
                                                    if (!trimmed) return;
                                                    const updated = Array.from(new Set([...pinnedRecommendations, trimmed]));
                                                    setPinnedRecommendations(updated);
                                                    setNewRecommendation('');
                                                    try {
                                                        await dashboardApi.setLearningPathOverrides(
                                                            selectedStudent.id,
                                                            courseId,
                                                            updated
                                                        );
                                                    } catch (error) {
                                                        console.error('Failed to save teacher recommendation', error);
                                                    }
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    Failed to load learning path.
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                            <button 
                                onClick={closeModal}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isChatLogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Chat History</h3>
                                <p className="text-sm text-gray-500">Read-only view of persisted messages (SQLite)</p>
                                <p className="text-xs text-gray-400 mt-1">Course ID: {courseId}</p>
                            </div>
                            <button
                                onClick={closeChatLogs}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-900">
                                This view requires ADMIN_TOKEN configured on the backend. Do not share the token publicly.
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">ADMIN_TOKEN</label>
                                    <input
                                        type="password"
                                        value={chatLogAdminToken}
                                        onChange={(e) => setChatLogAdminToken(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        placeholder="Enter admin token"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Student</label>
                                    <select
                                        value={chatLogStudentId ?? ""}
                                        onChange={(e) => setChatLogStudentId(e.target.value ? Number(e.target.value) : null)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">Select a student</option>
                                        {(analytics?.students || []).map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} (ID: {s.id})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Limit</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={500}
                                        value={chatLogLimit}
                                        onChange={(e) => setChatLogLimit(Math.max(1, Math.min(500, Number(e.target.value) || 200)))}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Role</label>
                                    <select
                                        value={chatLogRoleFilter}
                                        onChange={(e) => setChatLogRoleFilter(e.target.value as typeof chatLogRoleFilter)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                    >
                                        <option value="">All</option>
                                        <option value="user">User</option>
                                        <option value="assistant">Assistant</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Search</label>
                                    <input
                                        type="text"
                                        value={chatLogSearch}
                                        onChange={(e) => setChatLogSearch(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                        placeholder="Search message text"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={loadChatLogs}
                                    disabled={isChatLogLoading}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 inline-flex items-center gap-2"
                                >
                                    {isChatLogLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareText className="w-4 h-4" />}
                                    Load
                                </button>
                                {chatLogStudentId && chatLogAdminToken.trim() && (
                                    <a
                                        href={`${api.defaults.baseURL || ""}/ai/chat/history/view?course_id=${encodeURIComponent(String(courseId))}&student_id=${encodeURIComponent(String(chatLogStudentId))}&limit=${encodeURIComponent(String(chatLogLimit))}&admin_token=${encodeURIComponent(chatLogAdminToken.trim())}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-semibold text-blue-700 underline underline-offset-2"
                                    >
                                        Open full view
                                    </a>
                                )}
                                <div className="ml-auto text-xs text-gray-500">
                                    {(() => {
                                        const q = chatLogSearch.trim().toLowerCase();
                                        const filtered = chatLogRows.filter((r) => {
                                            if (chatLogRoleFilter && r.role !== chatLogRoleFilter) return false;
                                            if (!q) return true;
                                            return String(r.content || "").toLowerCase().includes(q);
                                        });
                                        return `Showing ${filtered.length} of ${chatLogRows.length}`;
                                    })()}
                                </div>
                            </div>

                            {chatLogError && (
                                <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                    {chatLogError}
                                </div>
                            )}

                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 w-24">Role</th>
                                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600">Content</th>
                                            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 w-44">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {(() => {
                                            const q = chatLogSearch.trim().toLowerCase();
                                            const filtered = chatLogRows.filter((r) => {
                                                if (chatLogRoleFilter && r.role !== chatLogRoleFilter) return false;
                                                if (!q) return true;
                                                return String(r.content || "").toLowerCase().includes(q);
                                            });
                                            if (filtered.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                                                            No messages to show.
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            return filtered.map((r) => {
                                                const text = String(r.content || "");
                                                const preview = text.length > 280 ? `${text.slice(0, 280)}…` : text;
                                                return (
                                                    <tr key={r.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-xs font-semibold text-gray-700 capitalize">
                                                            {r.role}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-800 whitespace-pre-wrap align-top">
                                                            {preview}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs text-gray-500 align-top">
                                                            {new Date(r.created_at).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                            <button
                                onClick={closeChatLogs}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Knowledge Base Modal */}
            {isKbOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Course Knowledge Base</h3>
                                <p className="text-sm text-gray-500">Ingested content available for AI</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {(() => {
                                        const id = kbData?.course_id ?? courseId;
                                        const course = courses.find(c => c.id === id);
                                        const name = course ? `${course.shortname} — ${course.fullname}` : `Course ${id}`;
                                        return `${name} (ID: ${id})`;
                                    })()}
                                </p>
                            </div>
                            <button 
                                onClick={closeKbModal}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {isLoadingKb ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                    <p>Loading knowledge base...</p>
                                </div>
                            ) : kbData ? (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <div className="bg-indigo-100 p-2 rounded-lg">
                                            <Database className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Total Documents</p>
                                            <p className="text-2xl font-bold text-gray-900">{kbData.document_count} Chunks</p>
                                        </div>
                                        <div className="ml-auto text-right">
                                            <p className="text-sm text-gray-500">Qbank</p>
                                            <p className="text-2xl font-bold text-gray-900">
                                                {kbData.sources.reduce((sum: number, s: KnowledgeBaseSource) => {
                                                    const t = normalizeKbType(s.type);
                                                    return sum + (t === "qbank" ? Number(s.chunks) || 0 : 0);
                                                }, 0)}{" "}
                                                Chunks
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Sources</h4>
                                        {kbData.sources && kbData.sources.length > 0 ? (
                                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                                <div className="p-4 border-b border-gray-100 bg-white">
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex flex-wrap gap-2">
                                                            {(() => {
                                                                const totals = kbData.sources.reduce((acc: Record<string, number>, s) => {
                                                                    const t = normalizeKbType(s.type);
                                                                    acc[t] = (acc[t] || 0) + 1;
                                                                    return acc;
                                                                }, {});
                                                                const order: Array<[string, string]> = [
                                                                    ["forum", "Forum"],
                                                                    ["page", "Page"],
                                                                    ["quiz", "Quiz"],
                                                                    ["qbank", "Qbank"],
                                                                    ["url", "URL"],
                                                                    ["assignment", "Assignment"],
                                                                ];
                                                                return order
                                                                    .filter(([k]) => (totals[k] || 0) > 0)
                                                                    .map(([k, label]) => (
                                                                        <span
                                                                            key={k}
                                                                            className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-gray-50 border-gray-200 text-gray-700"
                                                                        >
                                                                            {label} ({totals[k]})
                                                                        </span>
                                                                    ));
                                                            })()}
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                            <input
                                                                value={kbSearch}
                                                                onChange={(e) => setKbSearch(e.target.value)}
                                                                placeholder="Search sources…"
                                                                className="w-full sm:flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                                            />
                                                            {kbSearch.trim().length > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setKbSearch("")}
                                                                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                                >
                                                                    Clear
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {([
                                                                ["forum", "Forum"],
                                                                ["page", "Page"],
                                                                ["quiz", "Quiz"],
                                                                ["qbank", "Qbank"],
                                                                ["url", "URL"],
                                                                ["assignment", "Assignment"],
                                                            ] as Array<[string, string]>).map(([key, label]) => (
                                                                <button
                                                                    key={key}
                                                                    type="button"
                                                                    onClick={() => setKbTypeFilters((prev) => ({ ...prev, [key]: !prev[key] }))}
                                                                    className={cn(
                                                                        "px-3 py-1.5 rounded-full text-xs font-semibold border",
                                                                        kbTypeFilters[key]
                                                                            ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                                                                            : "bg-white border-gray-200 text-gray-500"
                                                                    )}
                                                                >
                                                                    {label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {(() => {
                                                                const filtered = getFilteredKbSources(kbData);
                                                                return `Showing ${filtered.length} of ${kbData.sources.length} sources`;
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open</th>
                                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Chunks</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {getFilteredKbSources(kbData).map((source: KnowledgeBaseSource, i: number) => (
                                                            <tr key={i} className="hover:bg-gray-50">
                                                                <td className="px-6 py-4">
                                                                    <div className="text-sm font-medium text-gray-900">{source.name}</div>
                                                                    {source.section && (
                                                                        <div className="text-xs text-gray-500 mt-1">
                                                                            {source.section}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-500 capitalize">{source.type}</td>
                                                                <td className="px-6 py-4 text-sm">
                                                                    {(() => {
                                                                        const href = getSafeMoodleActivityHref(source);
                                                                        if (!href) return <span className="text-gray-400 text-xs">—</span>;
                                                                        return (
                                                                            <a
                                                                                href={href}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="text-indigo-700 hover:text-indigo-900 underline underline-offset-2 text-xs font-semibold"
                                                                                title="Open the Moodle activity (permission checked)"
                                                                            >
                                                                                Open in Moodle
                                                                            </a>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-gray-500 text-right">{source.chunks}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                                No content found. Try ingesting the course.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-500">
                                    Failed to load knowledge base.
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex flex-col gap-3">
                            {isClearKbConfirmOpen && (
                                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-900">
                                    <div className="font-semibold">This will clear the AI Knowledge Base for this course.</div>
                                    <ul className="mt-2 list-disc pl-5 space-y-1 text-red-900/90">
                                        <li>Removes all ingested chunks/sources used for grounded answers in this course.</li>
                                        <li>Does not change Moodle content or student grades.</li>
                                        <li>Students may see fewer/no sources until Refresh Content is run again.</li>
                                    </ul>
                                    <div className="mt-3">
                                        <label className="block text-xs font-semibold text-red-900/90 mb-1">
                                            Type CLEAR to confirm
                                        </label>
                                        <input
                                            value={clearKbConfirmText}
                                            onChange={(e) => setClearKbConfirmText(e.target.value)}
                                            className="w-full bg-white border border-red-200 rounded-lg px-3 py-2 text-sm"
                                            placeholder="CLEAR"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center">
                                {isClearKbConfirmOpen ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsClearKbConfirmOpen(false);
                                                setClearKbConfirmText("");
                                            }}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClearKb}
                                            disabled={isClearingKb || clearKbConfirmText.trim().toUpperCase() !== "CLEAR"}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                                isClearingKb || clearKbConfirmText.trim().toUpperCase() !== "CLEAR"
                                                    ? 'bg-red-50 border-red-200 text-red-300 cursor-not-allowed'
                                                    : 'bg-white border-red-300 text-red-600 hover:bg-red-50'
                                            }`}
                                        >
                                            {isClearingKb ? 'Clearing...' : 'Confirm Clear'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={downloadKbCsv}
                                            disabled={!kbData || !kbData.sources || kbData.sources.length === 0}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                        >
                                            Download CSV
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsClearKbConfirmOpen(true);
                                                setClearKbConfirmText("");
                                            }}
                                            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors bg-white border-red-300 text-red-600 hover:bg-red-50"
                                        >
                                            Clear Knowledge Base
                                        </button>
                                        <button
                                            onClick={closeKbModal}
                                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Close
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isProfileModalOpen && profileStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Edit Student Profile</h3>
                                <p className="text-sm text-gray-500">{profileStudent.name}</p>
                            </div>
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Learning Style</label>
                                <select
                                    value={profileForm.learningStyle}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, learningStyle: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="General">General</option>
                                    <option value="Visual">Visual</option>
                                    <option value="Textual">Textual</option>
                                    <option value="Auditory">Auditory</option>
                                    <option value="Kinesthetic">Kinesthetic</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Strengths (comma separated)</label>
                                <input
                                    type="text"
                                    value={profileForm.strengths}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, strengths: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Weaknesses (comma separated)</label>
                                <input
                                    type="text"
                                    value={profileForm.weaknesses}
                                    onChange={(e) => setProfileForm(prev => ({ ...prev, weaknesses: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                            <button
                                onClick={() => setIsProfileModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile}
                                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${isSavingProfile ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} transition-colors`}
                            >
                                {isSavingProfile ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
