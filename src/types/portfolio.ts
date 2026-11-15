export interface SiteProfile {
  fullName: string;
  subtitle: string;
  heroDescription: string;
  aboutBio: string;
  careerObjective: string;
  location: string;
  nationality: string;
  availability: string;
  contactEmail: string;
  contactPhone: string;
  profilePhotoUrl: string;
  cvFileUrl: string;
  cvFilename: string;
  footerQuote: string;
  updatedAt: string;
}

export interface EducationItem {
  id: number;
  degree: string;
  year: string;
  studyGroup: string;
  board: string;
  gpa: string;
  institution: string;
  notes: string;
  sortOrder: number;
}

export interface SkillItem {
  id: number;
  name: string;
  proficiency: string;
  category: string;
  description: string;
  sortOrder: number;
}

export interface ProjectItem {
  id: number;
  title: string;
  category: string;
  description: string;
  projectUrl: string;
  imageUrl: string;
  featured: boolean;
  createdAt: string;
}

export interface ContactMessage {
  id: number;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PortfolioData {
  profile: SiteProfile;
  education: EducationItem[];
  skills: SkillItem[];
  projects: ProjectItem[];
}

export interface AdminSessionUser {
  id: number;
  username: string;
  role: 'admin';
}
