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
    [key: string]: any;
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
    getKnowledgeBase: async (courseId: number) => {
        const response = await api.get(`/ai/knowledge-base/${courseId}`);
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
        study_plan?: string;
        recommendations?: string[];
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
    completed_modules_count: number;
    quiz_average: number;
    quizzes_taken: number;
    last_activity: string;
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
