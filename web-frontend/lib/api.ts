import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Intercepteur pour gérer les requêtes
api.interceptors.request.use((config) => {
  // Récupérer le token depuis localStorage
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Types
export interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  due_date: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project_id: string;
  stage_id: string | null;
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
  created_by_name?: string | null;
  assigned_to?: User;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  name: string;
  description: string | null;
  order: number;
  status: string;
  project_id: string;
  duration: number | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  details: string;
  metadata: any;
  created_at: string;
  user?: User;
}

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  uploaded_by: string | null;
  project_id: string | null;
  task_id: string | null;
  created_at: string;
  updated_at: string;
}

// API Functions
export const projectsApi = {
  getAll: (params?: any) => api.get<Project[]>('/projects', { params }),
  getById: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: Partial<Project>) => api.post<Project>('/projects', data),
  update: (id: string, data: Partial<Project>) => api.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

export const tasksApi = {
  getAll: (params?: any) => api.get<Task[]>('/tasks', { params }),
  getById: (id: string) => api.get<Task>(`/tasks/${id}`),
  create: (data: Partial<Task>) => api.post<Task>('/tasks', data),
  update: (id: string, data: Partial<Task>) => api.put<Task>(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  reject: (id: string, data: { rejectionReason: string }) => api.post(`/tasks/${id}/reject`, data),
};

export const stagesApi = {
  getAll: (params?: any) => api.get<Stage[]>('/stages', { params }),
  getById: (id: string) => api.get<Stage>(`/stages/${id}`),
  create: (data: Partial<Stage>) => api.post<Stage>('/stages', data),
  update: (id: string, data: Partial<Stage>) => api.patch<Stage>(`/stages/${id}`, data),
  delete: (id: string) => api.delete(`/stages/${id}`),
  complete: (id: string, tasks?: any[]) => api.post(`/stages/${id}/complete`, { tasks }),
};

export const usersApi = {
  getAll: (params?: any) => api.get<User[]>('/users', { params }),
  getById: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: Partial<User>) => api.post<User>('/users', data),
  update: (id: string, data: Partial<User>) => api.put<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const activityLogsApi = {
  getAll: (params?: any) => api.get<ActivityLog[]>('/activity-logs', { params }),
};

export const notificationsApi = {
  getAll: () => api.get<Notification[]>('/notifications'),
  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export const documentsApi = {
  getAll: (params?: any) => api.get<Document[]>('/documents', { params }),
  getById: (id: string) => api.get<Document>(`/documents/${id}`),
  create: (data: Partial<Document>) => api.post<Document>('/documents', data),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

export interface UserSettings {
  id: string;
  user_id: string;
  language: string;
  timezone: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  theme: string;
  date_format: string;
  items_per_page: number;
  font_size: string;
  compact_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_task_assigned: boolean;
  email_task_updated: boolean;
  email_task_due: boolean;
  email_stage_completed: boolean;
  email_project_created: boolean;
  push_notifications: boolean;
  daily_summary: boolean;
  created_at: string;
  updated_at: string;
}

export const settingsApi = {
  get: () => api.get<UserSettings>('/settings'),
  update: (data: Partial<UserSettings>) => api.put<UserSettings>('/settings', data),
};

export const notificationPreferencesApi = {
  get: () => api.get<NotificationPreferences>('/notification-preferences'),
  update: (data: Partial<NotificationPreferences>) => api.put<NotificationPreferences>('/notification-preferences', data),
};

export const profileApi = {
  get: () => api.get<User>('/profile'),
  update: (data: { name?: string; email?: string }) => api.put<User>('/profile', data),
  changePassword: (userId: string, data: { current_password: string; new_password: string }) =>
    api.put(`/users/${userId}/password`, data),
};

export default api;
