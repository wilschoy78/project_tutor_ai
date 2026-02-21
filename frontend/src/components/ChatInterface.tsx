import React, { useState, useRef, useEffect } from 'react';
import { Send, BookOpen, Loader2, User, Bot, BrainCircuit } from 'lucide-react';
import { chatApi, moodleApi, type ChatResponse, type QuizResponse, type MoodleCourse } from '../api/client';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatResponse['sources'];
  quiz?: QuizResponse;
  context?: {
    courseId: number;
    studentId: number;
  };
}

const QuizCard = ({ quiz, context }: { quiz: QuizResponse, context?: { courseId: number, studentId: number } }) => {
    const [selected, setSelected] = useState<string | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    
    const handleSelect = (option: string) => {
        setSelected(option);
        setShowFeedback(true);
        
        if (context) {
            const isCorrect = option === quiz.correct_answer;
            chatApi.submitQuizResult(context.courseId, context.studentId, "Pop Quiz", isCorrect)
                .catch(console.error);
        }
    };

    return (
        <div className="mt-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <BrainCircuit className="w-5 h-5 text-purple-600" />
                <p className="font-semibold text-gray-900">Pop Quiz</p>
            </div>
            <p className="text-gray-800 mb-4 font-medium">{quiz.question}</p>
            <div className="space-y-2">
                {quiz.options.map((option, idx) => {
                    const isSelected = selected === option;
                    const isCorrect = option === quiz.correct_answer;
                    let btnClass = "w-full text-left p-3 rounded-lg border text-sm transition-all duration-200 ";
                    
                    if (showFeedback) {
                        if (isCorrect) btnClass += "bg-green-100 border-green-500 text-green-800 font-medium";
                        else if (isSelected) btnClass += "bg-red-100 border-red-500 text-red-800";
                        else btnClass += "border-gray-200 opacity-50 bg-gray-50";
                    } else {
                        btnClass += "border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm";
                    }
                    
                    return (
                        <button 
                            key={idx}
                            disabled={showFeedback}
                            className={btnClass}
                            onClick={() => handleSelect(option)}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
            {showFeedback && (
                <div className={cn(
                    "mt-4 p-4 rounded-lg text-sm border",
                    selected === quiz.correct_answer 
                        ? "bg-green-50 border-green-100 text-green-800" 
                        : "bg-red-50 border-red-100 text-red-800"
                )}>
                    <p className="font-bold mb-1">{selected === quiz.correct_answer ? 'Correct!' : 'Incorrect'}</p>
                    <p className="leading-relaxed">{quiz.explanation}</p>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialCourseId) setActiveCourseId(initialCourseId);
    if (initialStudentId) setActiveStudentId(initialStudentId);
    
    if (!initialCourseId) {
        const fetchCourses = async () => {
            try {
                const data = await moodleApi.getCourses();
                setCourses(data);
                if (data.length > 0 && !data.find(c => c.id === activeCourseId)) {
                    setActiveCourseId(data[0].id);
                }
            } catch (error) {
                console.error("Failed to fetch courses", error);
            }
        };
        fetchCourses();
    }
  }, [initialCourseId, initialStudentId, activeCourseId]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await chatApi.getHistory(activeCourseId, activeStudentId);
        if (history.length > 0) {
          setMessages(
            history.map((m) => ({
              id: String(m.id),
              role: m.role,
              content: m.content,
            }))
          );
        } else {
          setMessages([
            {
              id: 'welcome-1',
              role: 'assistant',
              content:
                'Hello! I am your AI Tutor. I can help you with your course materials. What would you like to know today?',
            },
          ]);
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
  }, [activeCourseId, activeStudentId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const handleGenerateQuiz = async () => {
    try {
      setIsLoading(true);
      const topic = "General Course Review"; // Or derive from previous context if possible
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Generating a quick quiz for you..."
      }]);
      
      const quiz = await chatApi.generateQuiz(activeCourseId, topic);
      
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
            
            let content = "";
            if (path.status === 'on_track') {
                content = `### 🌟 Great Progress!\n\n${path.message}\n\n**Recommendations:**\n${path.recommendations?.map(r => `- ${r}`).join('\n')}`;
            } else if (path.status === 'start') {
                content = `### 👋 Welcome!\n\n${path.message}\n\n**Getting Started:**\n${path.recommendations?.map(r => `- ${r}`).join('\n')}`;
            } else {
                content = `### 🎯 Personalized Study Plan\n\nI've identified a few areas we can strengthen: **${path.weaknesses?.join(', ')}**.\n\nHere is your custom plan:\n\n${path.study_plan}`;
            }

            return [...newMsgs, {
                id: Date.now().toString(),
                role: 'assistant',
                content: content
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
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.answer,
        sources: response.sources
      };

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
      <header className="bg-white border-b border-gray-200 px-3 py-3 sm:px-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Tutor</h1>
            <p className="text-xs text-gray-500">Powered by Moodle & LangChain</p>
          </div>
        </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
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

            {/* If integrated, maybe show a badge? Optional, but helpful. */}
            {(initialCourseId || initialStudentId) && (
                 <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    <BrainCircuit className="w-4 h-4 text-gray-500" />
                    <span>{initialCourseId ? `Course ${initialCourseId}` : ''}</span>
                    {initialStudentId && <span>• Student {initialStudentId}</span>}
                 </div>
            )}

            <button 
                onClick={handleGetLearningPath}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
                <BookOpen className="w-4 h-4" />
                My Learning Path
            </button>
            <button 
                onClick={handleGenerateQuiz}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
                <BrainCircuit className="w-4 h-4" />
                Pop Quiz
            </button>
            <button 
                onClick={handleIngest}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors w-full sm:w-auto"
            >
                Refresh Content
            </button>
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
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              
              {/* Quiz Card */}
              {msg.quiz && <QuizCard quiz={msg.quiz} context={msg.context} />}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Sources:</p>
                  <ul className="space-y-1">
                    {msg.sources.map((source, idx) => (
                      <li key={idx} className="text-xs text-blue-600 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {source.source} <span className="text-gray-400">({source.type})</span>
                      </li>
                    ))}
                  </ul>
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
          AI can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
};
