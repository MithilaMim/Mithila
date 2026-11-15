import type {
  AdminSessionUser,
  ContactMessage,
  EducationItem,
  PortfolioData,
  ProjectItem,
  SiteProfile,
  SkillItem,
} from '../types/portfolio';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);

  if (method !== 'GET' && method !== 'HEAD') {
    headers.set('X-Requested-With', 'XMLHttpRequest');
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : null;

  if (!res.ok) {
    throw new Error(payload?.error || `Request failed (${res.status})`);
  }

  return payload as T;
}

export const api = {
  // Public
  getPortfolio: () => request<PortfolioData>('/api/portfolio'),

  submitContact: (data: { fullName: string; email: string; subject: string; message: string }) =>
    request<{ success: boolean; message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Auth
  getSession: () => request<{ authenticated: boolean; user: AdminSessionUser | null }>('/api/auth/session'),

  login: (username: string, password: string) =>
    request<{ authenticated: boolean; user: AdminSessionUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  // Admin Profile & Password
  updateProfile: (data: Partial<SiteProfile>) =>
    request<SiteProfile>('/api/admin/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/api/admin/password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Admin Uploads
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return request<{ url: string }>('/api/admin/upload/image', {
      method: 'POST',
      body: formData,
    });
  },

  uploadCv: (file: File) => {
    const formData = new FormData();
    formData.append('cv', file);
    return request<{ cvFileUrl: string; cvFilename: string }>('/api/admin/upload/cv', {
      method: 'POST',
      body: formData,
    });
  },

  resetCv: () =>
    request<{ cvFileUrl: string; cvFilename: string }>('/api/admin/cv', {
      method: 'DELETE',
    }),

  // Admin Education
  createEducation: (data: Omit<EducationItem, 'id'>) =>
    request<EducationItem>('/api/admin/education', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEducation: (id: number, data: Omit<EducationItem, 'id'>) =>
    request<EducationItem>(`/api/admin/education/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteEducation: (id: number) =>
    request<{ success: boolean }>(`/api/admin/education/${id}`, {
      method: 'DELETE',
    }),

  // Admin Skills
  createSkill: (data: Omit<SkillItem, 'id'>) =>
    request<SkillItem>('/api/admin/skills', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSkill: (id: number, data: Omit<SkillItem, 'id'>) =>
    request<SkillItem>(`/api/admin/skills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSkill: (id: number) =>
    request<{ success: boolean }>(`/api/admin/skills/${id}`, {
      method: 'DELETE',
    }),

  // Admin Projects
  createProject: (data: Omit<ProjectItem, 'id' | 'createdAt'>) =>
    request<ProjectItem>('/api/admin/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProject: (id: number, data: Omit<ProjectItem, 'id' | 'createdAt'>) =>
    request<ProjectItem>(`/api/admin/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProject: (id: number) =>
    request<{ success: boolean }>(`/api/admin/projects/${id}`, {
      method: 'DELETE',
    }),

  // Admin Messages
  getMessages: (search = '') =>
    request<ContactMessage[]>(`/api/admin/messages${search ? `?search=${encodeURIComponent(search)}` : ''}`),

  setMessageRead: (id: number, isRead: boolean) =>
    request<{ success: boolean; isRead: boolean }>(`/api/admin/messages/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead }),
    }),

  deleteMessage: (id: number) =>
    request<{ success: boolean }>(`/api/admin/messages/${id}`, {
      method: 'DELETE',
    }),
};
