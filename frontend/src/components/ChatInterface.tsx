import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Loader2, User, Bot, BrainCircuit, RefreshCw, MessageSquareText, Link as LinkIcon, FileText, ClipboardList, HelpCircle, Database, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, chatApi, moodleApi, type ChatResponse, type QuizResponse, type MoodleCourse } from '../api/client';
import { actionButtonClass, cn } from '../lib/utils';
import { SimpleMarkdown } from "./SimpleMarkdown";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatResponse['sources'];
  quiz?: QuizResponse;
  quizTopic?: string;
  quizPreview?: boolean;
  quizNote?: string;
  learningPath?: {
    title: string;
    summary?: string[];
    checklist: string[];
    detailsText?: string;
    teacherNote?: string[];
  };
  context?: {
    courseId: number;
    studentId: number;
  };
}

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

const parseStructuredAnswer = (content: string) => {
    const lines = content.split(/\r?\n/);
    const sections: Record<string, string[]> = {};
    let current: string | null = null;

    const normalizeHeader = (raw: string) =>
        raw
            .replace(/^\*\*/, "")
            .replace(/\*\*$/, "")
            .replace(/:\s*$/, "")
            .trim()
            .toLowerCase();

    for (const line of lines) {
        const trimmed = line.trim();
        let candidate = trimmed;
        if (candidate.startsWith("**") && candidate.endsWith("**")) {
            candidate = candidate.slice(2, -2).trim();
        }
        const isHeader = /^[A-Za-z][A-Za-z\s]+:\s*$/.test(candidate);
        if (isHeader) {
            current = normalizeHeader(candidate);
            if (!sections[current]) sections[current] = [];
            continue;
        }
        if (!current) continue;
        sections[current].push(line);
    }

    const toBullets = (rawLines?: string[]) => {
        const out: string[] = [];
        if (!rawLines) return out;
        for (const l of rawLines) {
            const t = l.trim();
            if (!t) continue;
            const m = t.match(/^[-*]\s+(.*)$/);
            if (m) out.push(m[1].trim());
            else out.push(t);
        }
        return out;
    };

    const summary = toBullets(sections["summary"]);
    const details = toBullets(sections["details"]);
    const nextStep = toBullets(sections["next step"]);
    const sourceCheck = toBullets(sections["source check"]);

    const hasStructure = summary.length > 0 || details.length > 0 || nextStep.length > 0 || sourceCheck.length > 0;
    return { hasStructure, summary, details, nextStep, sourceCheck };
};

const StructuredAnswer = ({ content }: { content: string }) => {
    const parsed = parseStructuredAnswer(content);
    if (!parsed.hasStructure) {
        return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
    }
    return (
        <div className="space-y-3">
            {parsed.nextStep.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-3">
                    <div className="text-xs font-semibold text-gray-900 mb-2">Action checklist</div>
                    <div className="space-y-2">
                        {parsed.nextStep.map((step, idx) => (
                            <label key={idx} className="flex items-start gap-2 text-sm text-gray-800">
                                <input type="checkbox" disabled className="mt-0.5" />
                                <span className="leading-relaxed">{step}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {parsed.summary.length > 0 && (
                <div>
                    <div className="text-xs font-semibold text-gray-500 mb-1">Summary</div>
                    <ul className="space-y-1">
                        {parsed.summary.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-800 flex items-start gap-2">
                                <span className="inline-block w-1.5 h-1.5 bg-gray-300 rounded-full mt-2" />
                                <span className="leading-relaxed">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {parsed.details.length > 0 && (
                <details className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-700 py-1">
                        Optional details
                    </summary>
                    <ul className="space-y-1 mt-2">
                        {parsed.details.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="inline-block w-1.5 h-1.5 bg-gray-300 rounded-full mt-2" />
                                <span className="leading-relaxed">{item}</span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            {parsed.sourceCheck.length > 0 && (
                <div className="text-xs text-gray-500">
                    {parsed.sourceCheck.join(" ")}
                </div>
            )}
        </div>
    );
};

const LearningPathCard = ({ data }: { data: NonNullable<Message["learningPath"]> }) => {
    const [checked, setChecked] = useState<boolean[]>(() => data.checklist.map(() => false));

    return (
        <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-4">
                <div className="text-sm font-semibold text-gray-900">{data.title}</div>
                {data.summary && data.summary.length > 0 && (
                    <ul className="mt-2 space-y-1">
                        {data.summary.map((s, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="inline-block w-1.5 h-1.5 bg-gray-300 rounded-full mt-2" />
                                <span className="leading-relaxed">{s}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {data.checklist.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-4">
                    <div className="text-xs font-semibold text-gray-900 mb-2">Action checklist</div>
                    <div className="space-y-2">
                        {data.checklist.map((step, idx) => (
                            <label key={idx} className="flex items-start gap-2 text-sm text-gray-800">
                                <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={checked[idx] || false}
                                    onChange={(e) =>
                                        setChecked(prev => {
                                            const next = [...prev];
                                            next[idx] = e.target.checked;
                                            return next;
                                        })
                                    }
                                />
                                <span className="leading-relaxed">{step}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {data.detailsText && (
                <details className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <summary className="cursor-pointer text-xs font-semibold text-gray-700 py-1">
                        Optional details
                    </summary>
                    <SimpleMarkdown className="mt-2" text={data.detailsText} />
                </details>
            )}

            {data.teacherNote && data.teacherNote.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <div className="text-xs font-semibold text-amber-900 mb-1">Teacher’s note</div>
                    <ul className="space-y-1">
                        {data.teacherNote.map((n, idx) => (
                            <li key={idx} className="text-sm text-amber-900 leading-relaxed">
                                {n}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

const QuizCard = ({
    quiz,
    context,
    onResultSaved,
    onResultSaveFailed,
    onPracticeAgain,
    practiceTopic,
    isBusy,
    previewNote,
}: {
    quiz: QuizResponse;
    context?: { courseId: number; studentId: number };
    onResultSaved?: () => void;
    onResultSaveFailed?: () => void;
    onPracticeAgain?: (topic: string) => void;
    practiceTopic?: string;
    isBusy?: boolean;
    previewNote?: string;
}) => {
    const [selected, setSelected] = useState<string | null>(null);
    const [pending, setPending] = useState<string | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [showHint, setShowHint] = useState(false);
    
    const handlePick = (option: string) => {
        if (showFeedback) return;
        setPending(option);
        setShowHint(false);
    };

    const handleConfirm = () => {
        if (!pending) return;
        const option = pending;
        setSelected(option);
        setShowFeedback(true);
        setShowHint(false); // Hide hint if answer is selected
        
        if (context) {
            const isCorrect = option === quiz.correct_answer;
            chatApi
                .submitQuizResult(context.courseId, context.studentId, "Pop Quiz", isCorrect)
                .then(() => onResultSaved?.())
                .catch(() => onResultSaveFailed?.());
        }
    };

    const handleChangeAnswer = () => {
        if (showFeedback) return;
        setPending(null);
    };

    const handlePracticeAgain = () => {
        const topic = practiceTopic || "General Course Review";
        onPracticeAgain?.(topic);
    };

    return (
        <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="w-5 h-5 text-purple-600" />
                <p className="font-semibold text-gray-900">Pop Quiz</p>
            </div>
            {previewNote && (
                <div className="mb-3 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    {previewNote}
                </div>
            )}
            <p className="text-gray-800 mb-4 font-medium">{quiz.question}</p>
            <div className="space-y-2">
                {quiz.options.map((option, idx) => {
                    const isSelected = (showFeedback ? selected : pending) === option;
                    const isCorrect = option === quiz.correct_answer;
                    let btnClass = "w-full text-left p-3 rounded-lg border text-sm transition-all duration-200 ";
                    
                    if (showFeedback) {
                        if (isCorrect) btnClass += "bg-green-100 border-green-500 text-green-800 font-medium";
                        else if (isSelected) btnClass += "bg-red-100 border-red-500 text-red-800";
                        else btnClass += "border-gray-200 opacity-50 bg-gray-50";
                    } else {
                        if (isSelected) btnClass += "bg-blue-50 border-blue-300 shadow-sm";
                        else btnClass += "border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm";
                    }
                    
                    return (
                        <button 
                            key={idx}
                            disabled={showFeedback}
                            className={btnClass}
                            onClick={() => handlePick(option)}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>

            {!showFeedback && (
                <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                        {pending ? "Selected answer is not submitted yet. Confirm to lock." : "Select an answer, then confirm to submit."}
                    </p>
                    <div className="flex items-center gap-2">
                        {pending && (
                            <button
                                type="button"
                                onClick={handleChangeAnswer}
                                className="text-xs font-semibold text-gray-600 underline underline-offset-2"
                            >
                                Change
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!pending}
                            className={cn(
                                "text-xs font-semibold px-3 py-2 rounded-lg border",
                                pending
                                    ? "bg-blue-600 border-blue-600 text-white"
                                    : "bg-gray-100 border-gray-200 text-gray-400"
                            )}
                        >
                            Confirm answer
                        </button>
                    </div>
                </div>
            )}

            {!showFeedback && quiz.hint && (
                <div className="mt-3">
                    <button 
                        onClick={() => setShowHint(!showHint)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                        <BrainCircuit className="w-3 h-3" />
                        {showHint ? "Hide Hint" : "Need a Hint?"}
                    </button>
                    {showHint && (
                        <div className="mt-2 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100 italic">
                            💡 {quiz.hint}
                        </div>
                    )}
                </div>
            )}

            {showFeedback && (
                <div className={cn(
                    "mt-4 p-4 rounded-lg text-sm border",
                    selected === quiz.correct_answer 
                        ? "bg-green-50 border-green-100 text-green-800" 
                        : "bg-red-50 border-red-100 text-red-800"
                )}>
                    <p className="font-bold mb-1">{selected === quiz.correct_answer ? 'Correct!' : 'Incorrect'}</p>
                    <p className="leading-relaxed">{quiz.explanation}</p>
                    {onPracticeAgain && (
                        <button
                            type="button"
                            onClick={handlePracticeAgain}
                            disabled={isBusy}
                            className={cn(
                                "mt-3 text-xs font-semibold px-3 py-2 rounded-lg border",
                                isBusy
                                    ? "bg-gray-100 border-gray-200 text-gray-400"
                                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            Practice again on this topic
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

interface ChatInterfaceProps {
    initialCourseId?: number;
    initialStudentId?: number;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialCourseId, initialStudentId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCourseId, setActiveCourseId] = useState(initialCourseId || 2); // Default to Course 2 (Intro to AI Tutor)
  const [activeStudentId, setActiveStudentId] = useState(initialStudentId || 3); // Default to Alice (ID 3 in Moodle)
  const [courses, setCourses] = useState<MoodleCourse[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgressPercent, setSyncProgressPercent] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncHighlight, setSyncHighlight] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [lastSyncDetails, setLastSyncDetails] = useState<string | null>(null);
  const [progressSummary, setProgressSummary] = useState<{ quizCount: number; aiQuizCount: number; avgScore: number } | null>(null);
  const [lastProgressComparison, setLastProgressComparison] = useState<{
    before: { quizCount: number; aiQuizCount: number; avgScore: number } | null;
    after: { quizCount: number; aiQuizCount: number; avgScore: number };
  } | null>(null);
  const [teacherAnalyticsUpdatedAt, setTeacherAnalyticsUpdatedAt] = useState<number | null>(null);
  const [showTeacherAnalyticsPrompt, setShowTeacherAnalyticsPrompt] = useState(false);
  const [isStudentHelpOpen, setIsStudentHelpOpen] = useState(false);
  const toastTimerRef = useRef<number | null>(null);
  const teacherPromptTimerRef = useRef<number | null>(null);
  const syncProgressIntervalRef = useRef<number | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);
  const syncRequestIdRef = useRef(0);
  const timedOutSyncRequestIdsRef = useRef<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [sourcesOpen, setSourcesOpen] = useState<Record<string, boolean>>({});
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [previewQuizFromUrl, setPreviewQuizFromUrl] = useState<{ quiz: QuizResponse; topic?: string } | null>(null);
  const previewInjectedRef = useRef(false);
  const [moodleReturnUrl, setMoodleReturnUrl] = useState<string | null>(null);
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [startHereOpen, setStartHereOpen] = useState(false);
  const startHereTouchedRef = useRef(false);
  const [actionBarCanScrollLeft, setActionBarCanScrollLeft] = useState(false);
  const [actionBarCanScrollRight, setActionBarCanScrollRight] = useState(false);

  useEffect(() => {
    if (initialCourseId) setActiveCourseId(initialCourseId);
    if (initialStudentId) setActiveStudentId(initialStudentId);
  }, [initialCourseId, initialStudentId]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await moodleApi.getCourses();
        setCourses(data);
        if (!initialCourseId && data.length > 0 && !data.find(c => c.id === activeCourseId)) {
          setActiveCourseId(data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch courses", error);
      }
    };
    fetchCourses();
  }, [initialCourseId, activeCourseId]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await chatApi.getHistory(activeCourseId, activeStudentId);
        if (history.length > 0) {
          const baseMessages = history.map((m) => {
              if (m.role === 'assistant') {
                const marker = ":::JSON_QUIZ:::";
                if (typeof m.content === "string" && m.content.includes(marker)) {
                  const [prefix, jsonPart] = m.content.split(marker);
                  const text = (prefix || "").trim() || "I've generated a practice quiz for you.";
                  let quiz: QuizResponse | null = null;
                  let quizOrigin: QuizResponse["origin"] | undefined = undefined;
                  let quizRequestedTopic: string | undefined = undefined;
                  try {
                    const parsed = JSON.parse(jsonPart || "") as Partial<QuizResponse> & { options?: unknown };
                    if (
                      parsed &&
                      typeof parsed.question === "string" &&
                      Array.isArray(parsed.options) &&
                      typeof parsed.correct_answer === "string"
                    ) {
                      quizOrigin = parsed.origin as QuizResponse["origin"] | undefined;
                      quizRequestedTopic = typeof parsed.requested_topic === "string" ? parsed.requested_topic : undefined;
                      quiz = {
                        question: parsed.question,
                        options: parsed.options.map((o) => String(o)),
                        correct_answer: parsed.correct_answer,
                        explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
                        hint: typeof parsed.hint === "string" ? parsed.hint : undefined,
                        origin: quizOrigin,
                        requested_topic: quizRequestedTopic,
                        matched_topic: typeof parsed.matched_topic === "string" ? parsed.matched_topic : null,
                      };
                    }
                  } catch {
                    quiz = null;
                  }

                  const topicMatch = text.match(/quiz\s+for\s+you\s+(?:on|about)\s+(.+)$/i);
                  const quizTopic = topicMatch ? topicMatch[1].trim() : undefined;

                  if (quiz) {
                    const requested = quiz.requested_topic || quizTopic;
                    const quizNote =
                      quiz.origin === "rag" && requested && requested.toLowerCase() !== "general course review"
                        ? `No teacher-approved quiz matched “${requested}”, so this practice quiz was generated from your course materials.`
                        : undefined;
                    return {
                      id: String(m.id),
                      role: 'assistant',
                      content: text,
                      quiz,
                      quizTopic,
                      quizNote,
                      context: { courseId: activeCourseId, studentId: activeStudentId },
                    } as Message;
                  }

                  return {
                    id: String(m.id),
                    role: 'assistant',
                    content: text,
                  } as Message;
                }

                let parsed: unknown = null;
                try {
                  parsed = JSON.parse(m.content);
                } catch {
                  parsed = null;
                }

                if (parsed && typeof parsed === 'object') {
                  const obj = parsed as Record<string, unknown>;
                  if (obj.type === 'quiz' && obj.quiz) {
                  const quizObj = obj.quiz as QuizResponse;
                  const requested = typeof obj.topic === "string" ? obj.topic : quizObj.requested_topic;
                  const quizNote =
                    quizObj && quizObj.origin === "rag" && requested && requested.toLowerCase() !== "general course review"
                      ? `No teacher-approved quiz matched “${requested}”, so this practice quiz was generated from your course materials.`
                      : undefined;
                  return {
                    id: String(m.id),
                    role: 'assistant',
                    content: 'Here is a practice question based on your course content:',
                    quiz: quizObj,
                    quizTopic: typeof obj.topic === "string" ? obj.topic : undefined,
                    quizNote,
                    context: { courseId: activeCourseId, studentId: activeStudentId },
                  } as Message;
                  }
                }
              }

              return {
                id: String(m.id),
                role: m.role,
                content: m.content,
              } as Message;
            });

          const withPreview = [...baseMessages];
          if (previewQuizFromUrl && !previewInjectedRef.current) {
            previewInjectedRef.current = true;
            withPreview.push({
              id: `preview-quiz-${Date.now()}`,
              role: 'assistant',
              content: 'Preview: this is how the quiz will appear to students. Answers are not saved in preview mode.',
              quiz: previewQuizFromUrl.quiz,
              quizTopic: previewQuizFromUrl.topic,
              quizPreview: true,
            });
          }

          setMessages(withPreview);
        } else {
          const base = [
            {
              id: 'welcome-1',
              role: 'assistant',
              content:
                'Hello! I am your AI Tutor. I can help you with your course materials. What would you like to know today?',
            },
          ] as Message[];

          if (previewQuizFromUrl && !previewInjectedRef.current) {
            previewInjectedRef.current = true;
            base.push({
              id: `preview-quiz-${Date.now()}`,
              role: 'assistant',
              content: 'Preview: this is how the quiz will appear to students. Answers are not saved in preview mode.',
              quiz: previewQuizFromUrl.quiz,
              quizTopic: previewQuizFromUrl.topic,
              quizPreview: true,
            });
          }

          setMessages(base);
        }
      } catch (error) {
        console.error('Failed to load chat history', error);
        setMessages((prev) =>
          prev.length > 0
            ? prev
            : [
                {
                  id: 'welcome-1',
                  role: 'assistant',
                  content:
                    'Hello! I am your AI Tutor. I can help you with your course materials. What would you like to know today?',
                },
              ]
        );
      }
    };

    loadHistory();
  }, [activeCourseId, activeStudentId, previewQuizFromUrl]);

  useEffect(() => {
    const key = `aiTutor:moodleReturn:${activeCourseId}`;
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
  }, [activeCourseId]);

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
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("previewQuiz");
      const topic = params.get("previewTopic") || undefined;
      if (!raw) return;
      const b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
      const bin = window.atob(b64 + pad);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const json = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(json) as Partial<QuizResponse> & { options?: unknown };
      if (!parsed || typeof parsed.question !== "string" || !Array.isArray(parsed.options) || typeof parsed.correct_answer !== "string") {
        return;
      }
      const quiz: QuizResponse = {
        question: parsed.question,
        options: parsed.options.map((o) => String(o)),
        correct_answer: parsed.correct_answer,
        explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
        hint: typeof parsed.hint === "string" ? parsed.hint : undefined,
      };
      setPreviewQuizFromUrl({ quiz, topic });
    } catch {
      void 0;
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (teacherPromptTimerRef.current) {
        window.clearTimeout(teacherPromptTimerRef.current);
      }
      if (syncProgressIntervalRef.current) {
        window.clearInterval(syncProgressIntervalRef.current);
      }
      if (syncTimeoutRef.current) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showTeacherAnalyticsPrompt) return;
    if (teacherPromptTimerRef.current) {
      window.clearTimeout(teacherPromptTimerRef.current);
    }
    teacherPromptTimerRef.current = window.setTimeout(() => {
      setShowTeacherAnalyticsPrompt(false);
    }, 5000);
    return () => {
      if (teacherPromptTimerRef.current) {
        window.clearTimeout(teacherPromptTimerRef.current);
        teacherPromptTimerRef.current = null;
      }
    };
  }, [showTeacherAnalyticsPrompt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setIsSmallScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    updateActionBarScrollState();
    const onResize = () => updateActionBarScrollState();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isEmbedded, isSmallScreen, isSyncing, syncProgressPercent, startHereOpen]);

  useEffect(() => {
    if (startHereTouchedRef.current) return;
    setStartHereOpen(false);
  }, [isEmbedded, isSmallScreen]);

  const toggleStartHere = () => {
    startHereTouchedRef.current = true;
    setStartHereOpen((v) => !v);
  };

  const updateActionBarScrollState = () => {
    const el = actionBarRef.current;
    if (!el) return;
    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = el.scrollLeft;
    setActionBarCanScrollLeft(left > 2);
    setActionBarCanScrollRight(left < maxScrollLeft - 2);
  };

  const scrollActionBarBy = (delta: number) => {
    const el = actionBarRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
    window.setTimeout(updateActionBarScrollState, 60);
  };

  useEffect(() => {
    const key = `aiTutor:teacherAnalyticsUpdatedAt:${activeCourseId}`;
    const readTeacherSync = () => {
      try {
        const raw = window.localStorage.getItem(key);
        const value = raw ? Number(raw) : null;
        if (value && Number.isFinite(value)) {
          setTeacherAnalyticsUpdatedAt(value);
        }
      } catch {
        void 0;
      }
    };

    readTeacherSync();

    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      const value = e.newValue ? Number(e.newValue) : null;
      if (value && Number.isFinite(value)) {
        setTeacherAnalyticsUpdatedAt(value);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [activeCourseId]);

  useEffect(() => {
    if (!teacherAnalyticsUpdatedAt) return;
    const studentSyncAt = lastSyncedAt ? lastSyncedAt.getTime() : 0;
    if (teacherAnalyticsUpdatedAt > studentSyncAt) {
      setShowTeacherAnalyticsPrompt(true);
    }
  }, [teacherAnalyticsUpdatedAt, lastSyncedAt]);

  const showToast = (tone: 'success' | 'error', message: string) => {
    setToast({ tone, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3500);
  };

  const getSourceIcon = (type?: string) => {
    const t = String(type || "").toLowerCase();
    if (t.includes("forum")) return MessageSquareText;
    if (t.includes("url")) return LinkIcon;
    if (t.includes("page")) return FileText;
    if (t.includes("assign")) return ClipboardList;
    if (t.includes("quiz") || t.includes("qbank") || t.includes("question")) return HelpCircle;
    return BookOpen;
  };

  const getSourceTypeLabel = (type?: string) => {
    const t = String(type || "").trim();
    if (!t) return "Source";
    if (t.toLowerCase() === "url") return "Instructor-provided Moodle URL";
    return t;
  };

  const getSourceLabel = (source: { source?: string; module?: string; section?: string }) => {
    const section = source.section ? String(source.section).trim() : "";
    const module = source.module ? String(source.module).trim() : "";
    if (section && module) return { section, title: module };
    const raw = source.source ? String(source.source) : "";
    const parts = raw.split(" - ");
    if (parts.length >= 2) {
      const s = parts[0].trim();
      const m = parts.slice(1).join(" - ").trim();
      return { section: section || s, title: module || m };
    }
    return { section, title: module || raw };
  };

  const getRelatedWeekTopic = (sources?: Array<{ section?: string; source?: string; module?: string }>) => {
    if (!sources || sources.length === 0) return null;
    const sections = sources
      .map(s => getSourceLabel(s).section)
      .map(s => (s || "").trim())
      .filter(Boolean);
    const unique = Array.from(new Set(sections));
    if (unique.length === 0) return null;
    if (unique.length === 1) return unique[0];
    return `${unique[0]}, ${unique[1]}${unique.length > 2 ? "…" : ""}`;
  };

  const getSafeMoodleActivityHref = (source: ChatResponse["sources"][number]) => {
    const courseId = source.course_id ?? activeCourseId;
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

  const handleIngest = async () => {
    try {
      setIsLoading(true);
      await chatApi.ingestCourse(activeCourseId);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Successfully ingested content for Course ${activeCourseId}. I am now ready to answer questions about it!`
      }]);
    } catch (error) {
      console.error(error);
      alert('Failed to ingest course content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuiz = async (topicOverride?: string) => {
    try {
      setIsLoading(true);
      const topic = topicOverride || "General Course Review";
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Generating a quick quiz for you..."
      }]);
      
      const quiz = await chatApi.generateQuiz(activeCourseId, topic, activeStudentId);
      const quizNote =
        quiz?.origin === "rag" && topic.toLowerCase() !== "general course review"
          ? `No teacher-approved quiz matched “${topic}”, so this practice quiz was generated from your course materials.`
          : undefined;
      
      setMessages(prev => {
        // Replace the "Generating..." message or append new one
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg.content === "Generating a quick quiz for you...") {
            newMsgs.pop();
        }
        return [...newMsgs, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Here is a practice question based on your course content:",
            quiz: quiz,
            quizTopic: topic,
            quizNote,
            context: {
                courseId: activeCourseId,
                studentId: activeStudentId
            }
        }];
      });
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Sorry, I couldn't generate a quiz right now."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLearningPath = async () => {
    try {
        setIsLoading(true);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Analyzing your progress to generate a personalized learning path..."
        }]);

        const path = await chatApi.getLearningPath(activeCourseId, activeStudentId);
        
        setMessages(prev => {
            const newMsgs = [...prev];
            newMsgs.pop(); // Remove "Analyzing..." message

            const title =
                path.status === "on_track"
                    ? "My Learning Path (On Track)"
                    : path.status === "start"
                      ? "My Learning Path (Getting Started)"
                      : "My Learning Path";

            const checklist =
                (Array.isArray(path.recommendations) && path.recommendations.length > 0
                    ? path.recommendations
                    : extractChecklistFromStudyPlan(path.study_plan)) || [];

            const summary: string[] = [];
            if (path.message) summary.push(String(path.message));
            if (Array.isArray(path.weaknesses) && path.weaknesses.length > 0) {
                summary.push(`Focus areas: ${path.weaknesses.join(", ")}`);
            }

            return [...newMsgs, {
                id: Date.now().toString(),
                role: 'assistant',
                content: "",
                learningPath: {
                    title,
                    summary: summary.length > 0 ? summary : undefined,
                    checklist: checklist.length > 0 ? checklist : ["Review the Moodle items in your related week/topic sources, then ask a follow-up question."],
                    detailsText: path.study_plan || undefined,
                    teacherNote: path.pinned_recommendations && path.pinned_recommendations.length > 0 ? path.pinned_recommendations : undefined,
                }
            }];
        });

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Sorry, I couldn't generate a learning path right now."
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleSyncProgress = async () => {
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
          showToast('error', 'Sync is taking longer than expected. Click Retry to try again.');
        }, 15000);

        const before = progressSummary;
        const progress = await chatApi.syncProgress(activeCourseId, activeStudentId);
        if (timedOutSyncRequestIdsRef.current.has(requestId)) return;
        if (requestId !== syncRequestIdRef.current) return;

        const quizScores: Record<string, number> = (progress?.quiz_scores as Record<string, number>) || {};
        const values = Object.values(quizScores).map(v => Number(v)).filter(v => Number.isFinite(v));
        const quizCount = Object.keys(quizScores).length;
        const aiQuizCount = Object.keys(quizScores).filter(k => String(k).startsWith('[AI] ')).length;
        const avgScore = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const after = { quizCount, aiQuizCount, avgScore };
        setProgressSummary(after);
        setLastProgressComparison({ before, after });
        setLastSyncedAt(new Date());
        setSyncHighlight(true);
        showToast('success', 'Progress synced successfully.');
        window.setTimeout(() => setSyncHighlight(false), 1800);
        setSyncProgressPercent(100);
        window.setTimeout(() => setSyncProgressPercent(null), 600);
        const parts: string[] = [];
        if (before) {
          const deltaQuiz = after.quizCount - before.quizCount;
          const deltaAi = after.aiQuizCount - before.aiQuizCount;
          const deltaAvg = after.avgScore - before.avgScore;
          parts.push(`Quizzes tracked: ${after.quizCount}${deltaQuiz === 0 ? '' : ` (${deltaQuiz > 0 ? '+' : ''}${deltaQuiz})`}`);
          parts.push(`Avg score: ${after.avgScore.toFixed(1)}%${Math.abs(deltaAvg) < 0.05 ? '' : ` (${deltaAvg > 0 ? '+' : ''}${deltaAvg.toFixed(1)})`}`);
          parts.push(`AI quizzes: ${after.aiQuizCount}${deltaAi === 0 ? '' : ` (${deltaAi > 0 ? '+' : ''}${deltaAi})`}`);
        } else {
          parts.push(`Quizzes tracked: ${after.quizCount}`);
          parts.push(`Avg score: ${after.avgScore.toFixed(1)}%`);
          parts.push(`AI quizzes: ${after.aiQuizCount}`);
        }
        setLastSyncDetails(`Updated based on latest sync. ${parts.join(' • ')}`);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "I've synced your latest progress from Moodle. Your learning path will now reflect your most recent quiz scores."
        }]);
    } catch (error) {
        console.error('Failed to sync progress:', error);
        showToast('error', 'Sync failed. Click Retry to try again.');
        setLastSyncDetails(null);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Sync failed. Click Retry above to try again."
        }]);
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    console.log('Sending question:', input);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('Calling API...');
      const response = await chatApi.askQuestion(activeCourseId, userMessage.content, activeStudentId);
      console.log('API Response:', response);
      
      let botMessage: Message;

      const marker = ":::JSON_QUIZ:::";
      const normalizeQuiz = (raw: unknown): QuizResponse | null => {
        if (!raw || typeof raw !== "object") return null;
        const obj = raw as Record<string, unknown>;
        if (typeof obj.question !== "string") return null;
        if (!Array.isArray(obj.options)) return null;
        if (typeof obj.correct_answer !== "string") return null;
        const origin = typeof obj.origin === "string" ? (obj.origin as QuizResponse["origin"]) : undefined;
        const requested_topic = typeof obj.requested_topic === "string" ? obj.requested_topic : undefined;
        const matched_topic = typeof obj.matched_topic === "string" ? obj.matched_topic : null;
        return {
          question: obj.question,
          options: obj.options.map((o) => String(o)),
          correct_answer: obj.correct_answer,
          explanation: typeof obj.explanation === "string" ? obj.explanation : "",
          hint: typeof obj.hint === "string" ? obj.hint : undefined,
          origin,
          requested_topic,
          matched_topic,
        };
      };

      const getTopicMismatchNote = (quiz: QuizResponse, fallbackTopic?: string) => {
        const requested = quiz.requested_topic || fallbackTopic;
        if (quiz.origin !== "rag") return undefined;
        if (!requested) return undefined;
        if (requested.toLowerCase() === "general course review") return undefined;
        return `No teacher-approved quiz matched “${requested}”, so this practice quiz was generated from your course materials.`;
      };

      const tryStructuredAnswer = (): { text: string; quiz: QuizResponse; topic?: string } | null => {
        if (typeof response.answer !== "string") return null;
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(response.answer);
        } catch {
          parsed = null;
        }
        if (!parsed || typeof parsed !== "object") return null;
        const obj = parsed as Record<string, unknown>;
        if (obj.type === "quiz" && obj.quiz) {
          const rawQuiz = obj.quiz as Record<string, unknown>;
          const quiz = normalizeQuiz(rawQuiz);
          if (!quiz) return null;
          const topic = typeof obj.topic === "string" ? obj.topic : undefined;
          const text =
            typeof obj.text === "string"
              ? obj.text
              : topic
                ? `I've generated a quiz for you on ${topic}.`
                : "I've generated a quiz for you.";
          return { text, quiz, topic };
        }
        const directQuiz = normalizeQuiz(obj);
        if (directQuiz) {
          return { text: "Here is a practice question based on your course content:", quiz: directQuiz };
        }
        return null;
      };

      const structured = tryStructuredAnswer();
      if (structured) {
        const quizNote = getTopicMismatchNote(structured.quiz, structured.topic);
        botMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: structured.text,
          quiz: structured.quiz,
          quizTopic: structured.topic,
          quizNote,
          context: { courseId: activeCourseId, studentId: activeStudentId },
        };
      } else if (typeof response.answer === "string" && response.answer.includes(marker)) {
        const [prefix, jsonPart] = response.answer.split(marker);
        const quiz = normalizeQuiz((() => {
          try {
            return JSON.parse(jsonPart || "");
          } catch {
            return null;
          }
        })());
        if (quiz) {
          const text = (prefix || "").trim() || "I've generated a quiz for you.";
          const topicMatch = text.match(/quiz\s+for\s+you\s+(?:on|about)\s+(.+?)(?:\.)?$/i);
          const quizTopic = topicMatch ? topicMatch[1].trim() : undefined;
          const quizNote = getTopicMismatchNote(quiz, quizTopic);
          botMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: text,
            quiz,
            quizTopic,
            quizNote,
            context: { courseId: activeCourseId, studentId: activeStudentId },
          };
        } else {
          botMessage = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: response.answer.replace(marker, ""),
            sources: response.sources,
          };
        }
      } else {
        const hasSources = Array.isArray(response.sources) && response.sources.length > 0;
        botMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: hasSources
            ? response.answer
            : "I can’t find relevant information for this question in your current course materials. Try Refresh Content, ask your teacher to ingest/update the course, or rephrase using the exact lesson/topic name from Moodle.",
          sources: response.sources,
        };
      }

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error trying to answer your question. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 sm:max-w-4xl sm:mx-auto sm:border-x sm:border-gray-200">
      <header className="bg-white border-b border-gray-200 px-3 py-2 sm:px-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Tutor</h1>
            <p className="text-xs text-gray-500">Powered by Moodle & LangChain</p>
            <div className="mt-1">
              <span
                className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 border-blue-200 text-blue-800"
                title="Student view: ask questions grounded in course materials, sync your progress, follow a learning path checklist, and practice with quizzes."
              >
                Role: Student
              </span>
            </div>
            <div className="mt-1">
              <div className="inline-flex items-center gap-2 text-xs text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full max-w-[90vw] sm:max-w-[520px]">
                <BrainCircuit className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <span className="truncate">Course ID: {activeCourseId}</span>
                <span className="text-gray-400 flex-shrink-0">•</span>
                <span className="text-gray-600 flex-shrink-0">Student {activeStudentId}</span>
              </div>
            </div>
          </div>
        </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end w-full sm:w-auto">
            {/* 
               If we are in an integrated context (initialStudentId is set), hide the dropdowns 
               and show a static indicator or nothing. The user requested to "remove dropdown".
            */}
            {!initialStudentId && (
            <>
                <select 
                    value={activeStudentId} 
                    onChange={(e) => setActiveStudentId(Number(e.target.value))}
                    className="p-2 border rounded-md text-sm bg-gray-50 w-full sm:w-auto"
                >
                    <option value={3}>Alice (Visual Learner)</option>
                    <option value={4}>Bob (Textual Learner)</option>
                </select>
                <div className="h-6 w-px bg-gray-300"></div>
            </>
            )}

            {!initialCourseId && (
              <select 
                  value={activeCourseId} 
                  onChange={(e) => setActiveCourseId(Number(e.target.value))}
                  className="p-2 border rounded-md text-sm w-full sm:w-auto"
              >
                  {courses.length > 0 ? (
                      courses.map(c => (
                          <option key={c.id} value={c.id}>{c.fullname} (ID: {c.id})</option>
                      ))
                  ) : (
                      <>
                          <option value={2}>Introduction to AI Tutor (Course 2)</option>
                          <option value={101}>Intro to AI (Mock 101)</option>
                      </>
                  )}
              </select>
            )}

            <button
              type="button"
              onClick={() => setIsStudentHelpOpen(v => !v)}
              className="p-2 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
              title="Help: what each button does"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            {(isEmbedded || isSmallScreen) && (
              <button
                type="button"
                onClick={toggleStartHere}
                className="text-sm font-semibold text-blue-700 underline underline-offset-2"
                title="Show quick tips and what the buttons do"
              >
                Start here
              </button>
            )}
            {(isEmbedded || isSmallScreen) && fullScreenUrl && (
              <a
                href={fullScreenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
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
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                title="Back to your Moodle course page"
              >
                Back to Moodle
              </a>
            )}
            </div>

            {((!isEmbedded && !isSmallScreen) || startHereOpen) && (
              <div className="w-full text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-gray-700">Start here</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEmbedded || isSmallScreen) toggleStartHere();
                      else setIsStudentHelpOpen(v => !v);
                    }}
                    className="text-xs font-semibold text-blue-700 underline underline-offset-2"
                  >
                    {isEmbedded || isSmallScreen ? "Hide" : (isStudentHelpOpen ? "Hide help" : "What do these do?")}
                  </button>
                </div>
                {(isEmbedded || isSmallScreen) && (
                  <div className="mt-1 text-[11px] text-gray-500">
                    Tip: use Full screen for the best experience in Moodle blocks.
                  </div>
                )}
                <div className="mt-2">
                  Refresh Content (if materials changed), then ask your question.
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Note: Knowledge Base is managed by the instructor.
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  Teacher-approved quizzes are practice unless graded integration is enabled.
                </div>
                {(!isEmbedded && !isSmallScreen) && isStudentHelpOpen && (
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700">
                      <div className="flex items-start gap-2">
                        <Database className="w-4 h-4 mt-0.5 text-gray-500" />
                        <div>
                          <span className="font-semibold">Refresh Content</span>: updates the AI knowledge base from Moodle.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <RefreshCw className="w-4 h-4 mt-0.5 text-gray-500" />
                        <div>
                          <span className="font-semibold">Sync My Progress</span>: pulls your quiz/completion progress for personalization.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <BookOpen className="w-4 h-4 mt-0.5 text-gray-500" />
                        <div>
                          <span className="font-semibold">My Learning Path</span>: turns your progress into a checklist you can follow.
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <BrainCircuit className="w-4 h-4 mt-0.5 text-gray-500" />
                        <div>
                          <span className="font-semibold">Pop Quiz</span>: quick practice grounded in course materials.
                        </div>
                      </div>
                    </div>
                    <details className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-gray-700">
                        Moodle placement tips
                      </summary>
                      <div className="mt-2 text-xs text-gray-700 space-y-1">
                        <div><span className="font-semibold">Course page block</span>: add the AI Tutor block to the course page (best for students).</div>
                        <div><span className="font-semibold">Course section link</span>: add a URL resource that opens the tutor for this course (ensure the link includes the course ID).</div>
                        <div><span className="font-semibold">Embedded</span>: if your Moodle theme allows iframes, embed the tutor page inside a Page/Label for a seamless experience.</div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}

            <div className="relative w-full">
              {(isEmbedded || isSmallScreen) && actionBarCanScrollLeft && (
                <button
                  type="button"
                  onClick={() => scrollActionBarBy(-260)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700"
                  title="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {(isEmbedded || isSmallScreen) && actionBarCanScrollRight && (
                <button
                  type="button"
                  onClick={() => scrollActionBarBy(260)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-700"
                  title="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <div
                ref={actionBarRef}
                onScroll={updateActionBarScrollState}
                className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 w-full scroll-smooth"
                style={{ paddingLeft: (isEmbedded || isSmallScreen) ? 44 : undefined, paddingRight: (isEmbedded || isSmallScreen) ? 44 : undefined }}
              >
            <button 
                onClick={handleGetLearningPath}
                disabled={isLoading || isSyncing}
                className={cn(actionButtonClass("primary"), "!w-auto flex-shrink-0")}
                title="Generate your personalized learning path based on your Moodle progress and quiz results."
            >
                <BookOpen className="w-4 h-4" />
                My Learning Path
            </button>
            <button 
                onClick={handleSyncProgress}
                disabled={isLoading || isSyncing}
                className={cn(actionButtonClass("info"), "!w-auto flex-shrink-0", syncHighlight && "ring-2 ring-emerald-200")}
                title="Sync your Moodle completion and quiz progress so the tutor can personalize help. Tip: sync after completing quizzes/assignments or weekly."
            >
                <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                {isSyncing && syncProgressPercent !== null ? `Syncing… ${syncProgressPercent}%` : (isSyncing ? "Syncing…" : "Sync My Progress")}
            </button>
            <button 
                onClick={() => handleGenerateQuiz()}
                disabled={isLoading || isSyncing}
                className={cn(actionButtonClass("secondary"), "!w-auto flex-shrink-0")}
                title="Generate a short practice quiz grounded in your current course materials."
            >
                <BrainCircuit className="w-4 h-4" />
                Pop Quiz
            </button>
            <button 
                onClick={handleIngest}
                disabled={isLoading || isSyncing}
                className={cn(actionButtonClass("success"), "!w-auto flex-shrink-0")}
                title="Refresh updates course materials for the AI tutor; chat is preserved."
            >
                <Database className="w-4 h-4" />
                Refresh Content
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
            {(isEmbedded || isSmallScreen) ? (
              <div className="w-full text-[11px] text-gray-500">
                Synced: quiz scores, completion progress
              </div>
            ) : (
              <>
                <p className="w-full text-xs text-gray-500">
                  Step guide: 1) Refresh Content (when course materials change) 2) Sync (after you complete quizzes/activities). Sync updates completion and quiz progress (not grades unless enabled). If a teacher is reviewing class analytics, ask them to run Sync Class Analytics after you sync.
                </p>
                <div className="w-full text-[11px] text-gray-500">
                  Synced: quiz scores, completion progress
                </div>
              </>
            )}
            {progressSummary && (
              <div className="w-full bg-white border border-gray-200 rounded-xl px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-gray-900">Progress Snapshot</div>
                  {lastSyncedAt && (
                    <div className="text-[11px] text-gray-500" title={lastSyncedAt.toLocaleString()}>
                      Synced at {lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
                {lastProgressComparison?.before && (
                  <div className="text-[11px] text-gray-500 mt-1">
                    Before → After
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-2">
                    <div className="text-[10px] text-gray-500">Quizzes</div>
                    <div className="text-sm font-bold text-gray-900">{progressSummary.quizCount}</div>
                    {lastProgressComparison?.before && (
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {lastProgressComparison.before.quizCount} → {lastProgressComparison.after.quizCount}
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-2">
                    <div className="text-[10px] text-gray-500">Avg Score</div>
                    <div className="text-sm font-bold text-gray-900">{progressSummary.avgScore.toFixed(1)}%</div>
                    {lastProgressComparison?.before && (
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {lastProgressComparison.before.avgScore.toFixed(1)}% → {lastProgressComparison.after.avgScore.toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-2">
                    <div className="text-[10px] text-gray-500">AI Quizzes</div>
                    <div className="text-sm font-bold text-gray-900">{progressSummary.aiQuizCount}</div>
                    {lastProgressComparison?.before && (
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {lastProgressComparison.before.aiQuizCount} → {lastProgressComparison.after.aiQuizCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {showTeacherAnalyticsPrompt && teacherAnalyticsUpdatedAt && (
              <div className="w-full text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    Class analytics were updated by your teacher ({new Date(teacherAnalyticsUpdatedAt).toLocaleString()}). Sync your progress or refresh your learning path to see updates.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTeacherAnalyticsPrompt(false)}
                    className="text-xs font-semibold underline underline-offset-2"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleSyncProgress}
                    disabled={isLoading || isSyncing}
                    className={cn(actionButtonClass("info"), "py-1.5 px-3 text-xs w-auto")}
                  >
                    Sync Now
                  </button>
                  <button
                    type="button"
                    onClick={handleGetLearningPath}
                    disabled={isLoading || isSyncing}
                    className={cn(actionButtonClass("primary"), "py-1.5 px-3 text-xs w-auto")}
                  >
                    Refresh Learning Path
                  </button>
                </div>
              </div>
            )}
            {lastSyncDetails && (
              <div className="w-full text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                {lastSyncDetails}
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
                      onClick={handleSyncProgress}
                      disabled={isLoading || isSyncing}
                      className="text-xs font-semibold underline underline-offset-2 disabled:opacity-50"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )}
            {lastSyncedAt && (
                <div
                  className={cn(
                    "w-full sm:w-auto text-xs text-gray-500 sm:text-right",
                    syncHighlight && "bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
                  )}
                  title={lastSyncedAt.toLocaleString()}
                >
                  Synced at {lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4 sm:p-4 space-y-6">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={cn(
              "flex gap-4 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
              msg.role === 'user' ? "bg-blue-600" : "bg-green-600"
            )}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
            </div>

            {/* Bubble */}
            <div className={cn(
              "p-4 rounded-2xl shadow-sm",
              msg.role === 'user' 
                ? "bg-blue-600 text-white rounded-tr-none" 
                : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"
            )}>
              {msg.role === "assistant" ? (
                msg.learningPath ? (
                  <LearningPathCard data={msg.learningPath} />
                ) : (
                  <StructuredAnswer content={msg.content} />
                )
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              )}
              
              {/* Quiz Card */}
              {msg.quiz && (
                <QuizCard
                  quiz={msg.quiz}
                  context={msg.context}
                  onResultSaved={msg.quizPreview ? undefined : () => showToast("success", "Result saved; will reflect after next sync.")}
                  onResultSaveFailed={msg.quizPreview ? undefined : () => showToast("error", "Could not save quiz result. Please try again.")}
                  onPracticeAgain={msg.quizPreview ? undefined : (topic) => handleGenerateQuiz(topic)}
                  practiceTopic={msg.quizPreview ? undefined : msg.quizTopic}
                  isBusy={isLoading || isSyncing}
                  previewNote={msg.quizPreview ? "Preview mode: answers are not saved." : msg.quizNote}
                />
              )}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  {isSmallScreen && !sourcesOpen[msg.id] ? (
                    <button
                      type="button"
                      onClick={() => setSourcesOpen(prev => ({ ...prev, [msg.id]: true }))}
                      className="text-xs font-semibold text-blue-700 underline underline-offset-2"
                    >
                      {`Show sources (${msg.sources.length})`}
                    </button>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold text-gray-500 mb-1">Sources:</p>
                        {isSmallScreen && (
                          <button
                            type="button"
                            onClick={() => setSourcesOpen(prev => ({ ...prev, [msg.id]: false }))}
                            className="text-xs font-semibold text-blue-700 underline underline-offset-2"
                          >
                            Hide
                          </button>
                        )}
                      </div>
                      {(() => {
                        const related = getRelatedWeekTopic(msg.sources);
                        if (!related) return null;
                        return (
                          <div className="text-xs text-gray-500 mb-2">
                            Related week/topic: <span className="font-semibold text-gray-700">{related}</span>
                          </div>
                        );
                      })()}
                      <ul className="space-y-1">
                        {(expandedSources[msg.id] ? msg.sources : msg.sources.slice(0, 3)).map((source, idx) => (
                          <li key={idx} className="text-xs text-blue-600 flex items-start gap-2">
                            {(() => {
                              const Icon = getSourceIcon(source.type);
                              const label = getSourceLabel(source);
                              const href = getSafeMoodleActivityHref(source);
                              return (
                                <>
                                  <Icon className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                  {label.section ? (
                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold flex-shrink-0">
                                      {label.section}
                                    </span>
                                  ) : null}
                                  {href ? (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="truncate underline underline-offset-2 hover:text-blue-800"
                                      title="Open in Moodle"
                                    >
                                      {label.title}
                                    </a>
                                  ) : (
                                    <span className="truncate text-gray-700">{label.title}</span>
                                  )}
                                  <span className="text-gray-400">({getSourceTypeLabel(source.type)})</span>
                                  {String(source.type || "").toLowerCase().includes("forum") && source.forum_latest_discussion ? (
                                    <span className="text-gray-500">
                                      • Latest thread: {source.forum_latest_discussion}
                                      {source.forum_latest_discussion_date ? ` (${source.forum_latest_discussion_date})` : ""}
                                    </span>
                                  ) : null}
                                </>
                              );
                            })()}
                          </li>
                        ))}
                      </ul>
                      {msg.sources.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setExpandedSources(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          className="mt-2 text-xs font-semibold text-blue-700 underline underline-offset-2"
                        >
                          {expandedSources[msg.id] ? "Show fewer sources" : `Show all sources (${msg.sources.length})`}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-4 mr-auto max-w-[85%]">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm">
                    <p className="text-gray-500 text-sm">Thinking...</p>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-3 py-3 sm:p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2 sm:max-w-4xl sm:mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your course materials..."
            disabled={isLoading}
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-2">
          Verify using sources below.
        </p>
      </div>
    </div>
  );
};
