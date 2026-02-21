import axios from 'axios';

// Use relative path for production (reverse proxy) or env var for development
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ChatResponse {
  answer: string;
  sources: Array<{
    source: string;
    type: string;
    course_id?: number;
  }>;
}

export interface QuizResponse {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export const chatApi = {
  ingestCourse: async (courseId: number) => {
        const response = await api.post('/ai/ingest', { course_id: courseId });
        return response.data;
    },
    getHistory: async (courseId: number, studentId: number) => {
        const response = await api.get<Array<{ id: number; role: 'user' | 'assistant'; content: string; created_at: string }>>(
            '/ai/chat/history',
            { params: { course_id: courseId, student_id: studentId } }
        );
        return response.data;
    },
    getKnowledgeBase: async (courseId: number) => {
        const response = await api.get(`/ai/knowledge-base/${courseId}`);
        return response.data;
    },
    clearKnowledgeBase: async (courseId: number) => {
        const response = await api.delete(`/ai/knowledge-base/${courseId}`);
        return response.data;
    },
    
  askQuestion: async (courseId: number, question: string, studentId: number = 1) => {
    const response = await api.post<ChatResponse>('/ai/chat', { 
      course_id: courseId, 
      question,
      student_id: studentId
    });
    return response.data;
  },

  generateQuiz: async (courseId: number, topic: string) => {
    const response = await api.post<QuizResponse>('/ai/quiz', { 
      course_id: courseId, 
      topic 
    });
    return response.data;
  },

  submitQuizResult: async (courseId: number, studentId: number, topic: string, isCorrect: boolean) => {
    const response = await api.post('/ai/quiz/submit', {
      course_id: courseId,
      student_id: studentId,
      topic,
      is_correct: isCorrect
    });
    return response.data;
  },

  getLearningPath: async (courseId: number, studentId: number) => {
    const response = await api.post<{
        status: string;
        message?: string;
        weaknesses?: string[];
        weakness_details?: Array<{
          topic: string;
          average_score: number;
          severity: 'high' | 'medium';
          quizzes: { name: string; score: number }[];
        }>;
        study_plan?: string;
        recommendations?: string[];
        pinned_recommendations?: string[];
    }>('/ai/learning-path', {
      course_id: courseId,
      student_id: studentId
    });
    return response.data;
  }
};

export interface StudentAnalytics {
    id: number;
    name: string;
    learning_style: string;
    completed_modules_count?: number;
    quiz_average?: number;
    quizzes_taken?: number;
    last_activity?: string;
    avg_score: number;
    quiz_scores?: Record<string, number>;
}

export interface DashboardAnalytics {
    course_id: number;
    total_students: number;
    average_score: number;
    students: StudentAnalytics[];
}

export const dashboardApi = {
    getAnalytics: async (courseId: number) => {
        const response = await api.get<DashboardAnalytics>(`/dashboard/analytics/${courseId}`);
        return response.data;
    },
    setLearningPathOverrides: async (studentId: number, courseId: number, pinnedRecommendations: string[]) => {
        const response = await api.post<{ pinned_recommendations: string[] }>(
            `/dashboard/students/${studentId}/learning-path-overrides`,
            {
                course_id: courseId,
                pinned_recommendations: pinnedRecommendations,
            }
        );
        return response.data;
    },
};

export interface StudentProfile {
    id: number;
    name: string;
    email?: string | null;
    learning_style: string;
    strengths: string[];
    weaknesses: string[];
    interests: string[];
}

export const studentApi = {
    getProfile: async (studentId: number) => {
        const response = await api.get<StudentProfile>(`/dashboard/students/${studentId}/profile`);
        return response.data;
    },
    updateProfile: async (studentId: number, payload: { learning_style: string; strengths: string[]; weaknesses: string[]; interests?: string[] }) => {
        const response = await api.put<StudentProfile>(`/dashboard/students/${studentId}/profile`, payload);
        return response.data;
    }
};

export interface MoodleCourse {
    id: number;
    fullname: string;
    shortname: string;
}

export const moodleApi = {
    getCourses: async () => {
        const response = await api.get<MoodleCourse[]>('/moodle/courses');
        return response.data;
    }
};
