import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  ContactMessage,
  EducationItem,
  PortfolioData,
  ProjectItem,
  SiteProfile,
  SkillItem,
} from '../types/portfolio.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const UPLOAD_IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
const UPLOAD_CV_DIR = path.join(UPLOADS_DIR, 'cv');

for (const dir of [DATA_DIR, UPLOADS_DIR, UPLOAD_IMAGES_DIR, UPLOAD_CV_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

export const DB_PATH = path.join(DATA_DIR, 'portfolio.db');
export const IMAGES_DIR = UPLOAD_IMAGES_DIR;
export const CV_DIR = UPLOAD_CV_DIR;

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    password_changed_manually INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS site_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    full_name TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    hero_description TEXT NOT NULL,
    about_bio TEXT NOT NULL,
    career_objective TEXT NOT NULL,
    location TEXT NOT NULL,
    nationality TEXT NOT NULL,
    availability TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL DEFAULT '',
    profile_photo_url TEXT NOT NULL DEFAULT 'default',
    cv_file_url TEXT NOT NULL DEFAULT '',
    cv_filename TEXT NOT NULL DEFAULT 'Most_Mithila_Akter_Mim_CV.pdf',
    footer_quote TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    degree TEXT NOT NULL,
    year TEXT NOT NULL,
    study_group TEXT NOT NULL,
    board TEXT NOT NULL,
    gpa TEXT NOT NULL,
    institution TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    proficiency TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Language',
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    project_url TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function seedDatabase() {
  // 1. Seed initial administrator ("Mithila Mim")
  // Password is read from server-side environment variable ADMIN_PASSWORD.
  // If unset in local development, derive a deterministic/configured dev fallback strictly on the server.
  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  const initialUsername = 'Mithila Mim';

  const existingAdmin = db
    .prepare('SELECT id, password_changed_manually FROM admin_users WHERE username = ?')
    .get(initialUsername) as { id: number; password_changed_manually: number } | undefined;

  if (!existingAdmin) {
    const rawPassword = envPassword && envPassword.length >= 6 ? envPassword : 'Mithila@2026';
    const hash = bcrypt.hashSync(rawPassword, 12);
    db.prepare(
      'INSERT INTO admin_users (username, password_hash, role, password_changed_manually) VALUES (?, ?, ?, 0)',
    ).run(initialUsername, hash, 'admin');
  } else if (envPassword && envPassword.length >= 6 && existingAdmin.password_changed_manually === 0) {
    // Keep synced with environment variable if admin has not rotated password inside dashboard
    const hash = bcrypt.hashSync(envPassword, 12);
    db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hash, existingAdmin.id);
  }

  // 2. Seed site profile if empty
  const existingProfile = db.prepare('SELECT id FROM site_profile WHERE id = 1').get();
  if (!existingProfile) {
    db.prepare(`
      INSERT INTO site_profile (
        id, full_name, subtitle, hero_description, about_bio, career_objective,
        location, nationality, availability, contact_email, contact_phone,
        profile_photo_url, cv_file_url, cv_filename, footer_quote
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      1,
      'Most. Mithila Akter Mim',
      'Aspiring Professional | Creative Learner | Dedicated Job Seeker',
      'Hello! I am Mithila Akter Mim. I am a hardworking, honest, and motivated individual who is passionate about learning new skills and building a successful career.',
      'I am an enthusiastic and dedicated individual from Bangladesh. I believe in continuous learning, personal development, and professional growth. My goal is to work with a reputable organization where I can contribute my abilities and gain valuable experience.',
      'To build a meaningful career in a reputable organization where I can apply my dedication, integrity, and continuous learning mindset while gaining valuable professional experience.',
      'Bangladesh',
      'Bangladeshi',
      'Open to entry-level opportunities',
      'mitilaakter226@gmail.com',
      '',
      'default',
      '',
      'Most_Mithila_Akter_Mim_CV.pdf',
      'Building my future through learning, dedication, and hard work.',
    );
  }

  // 3. Seed Education (HSC 2025 & SSC 2023) if empty
  const eduCount = (db.prepare('SELECT COUNT(*) as count FROM education').get() as { count: number }).count;
  if (eduCount === 0) {
    const insertEdu = db.prepare(`
      INSERT INTO education (degree, year, study_group, board, gpa, institution, notes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEdu.run('HSC', '2025', 'Arts', 'Dinajpur', '3.00', '', 'Higher Secondary Certificate', 1);
    insertEdu.run('SSC', '2023', 'Arts', 'Dinajpur', '2.28', '', 'Secondary School Certificate', 2);
  }

  // 4. Seed Languages ONLY (never invent professional skills or work experience)
  const skillCount = (db.prepare('SELECT COUNT(*) as count FROM skills').get() as { count: number }).count;
  if (skillCount === 0) {
    const insertSkill = db.prepare(`
      INSERT INTO skills (name, proficiency, category, description, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertSkill.run('Bangla', 'Native', 'Language', 'Mother tongue — fluent in speaking, reading, and writing.', 1);
    insertSkill.run('English', 'Basic', 'Language', 'Foundational reading, writing, and workplace communication.', 2);
  }
}

seedDatabase();

// --- Auth & Sessions ---

export function verifyAdminCredentials(username: string, password: string): { id: number; username: string; role: 'admin' } | null {
  const row = db
    .prepare('SELECT id, username, password_hash, role FROM admin_users WHERE username = ?')
    .get(username) as { id: number; username: string; password_hash: string; role: string } | undefined;

  if (!row) return null;
  const ok = bcrypt.compareSync(password, row.password_hash);
  if (!ok) return null;
  if (row.role !== 'admin') return null;
  return { id: row.id, username: row.username, role: 'admin' };
}

export function createSession(userId: number, role: string): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + 1000 * 60 * 60 * 24; // 24 hours
  // Clean expired sessions opportunistically
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  db.prepare('INSERT INTO sessions (id, user_id, role, expires_at, created_at) VALUES (?, ?, ?, ?, ?)').run(
    sessionId,
    userId,
    role,
    expiresAt,
    now,
  );
  return sessionId;
}

export function getSessionUser(sessionId: string): { id: number; username: string; role: 'admin' } | null {
  if (!sessionId || typeof sessionId !== 'string') return null;
  const now = Date.now();
  const row = db
    .prepare(`
      SELECT u.id, u.username, u.role, s.expires_at
      FROM sessions s
      JOIN admin_users u ON s.user_id = u.id
      WHERE s.id = ?
    `)
    .get(sessionId) as { id: number; username: string; role: string; expires_at: number } | undefined;

  if (!row) return null;
  if (row.expires_at < now) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }
  if (row.role !== 'admin') return null;
  return { id: row.id, username: row.username, role: 'admin' };
}

export function deleteSession(sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function updateAdminPassword(userId: number, currentPassword: string, newPassword: string): boolean {
  const row = db.prepare('SELECT password_hash FROM admin_users WHERE id = ?').get(userId) as
    | { password_hash: string }
    | undefined;
  if (!row) return false;
  if (!bcrypt.compareSync(currentPassword, row.password_hash)) return false;
  const newHash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE admin_users SET password_hash = ?, password_changed_manually = 1 WHERE id = ?').run(
    newHash,
    userId,
  );
  return true;
}

// --- Portfolio Public Read Queries ---

export function getSiteProfile(): SiteProfile {
  const row = db.prepare('SELECT * FROM site_profile WHERE id = 1').get() as Record<string, string>;
  return {
    fullName: row.full_name,
    subtitle: row.subtitle,
    heroDescription: row.hero_description,
    aboutBio: row.about_bio,
    careerObjective: row.career_objective,
    location: row.location,
    nationality: row.nationality,
    availability: row.availability,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    profilePhotoUrl: row.profile_photo_url,
    cvFileUrl: row.cv_file_url,
    cvFilename: row.cv_filename,
    footerQuote: row.footer_quote,
    updatedAt: row.updated_at,
  };
}

export function getEducationList(): EducationItem[] {
  const rows = db.prepare('SELECT * FROM education ORDER BY sort_order ASC, id ASC').all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: Number(r.id),
    degree: String(r.degree),
    year: String(r.year),
    studyGroup: String(r.study_group),
    board: String(r.board),
    gpa: String(r.gpa),
    institution: String(r.institution ?? ''),
    notes: String(r.notes ?? ''),
    sortOrder: Number(r.sort_order ?? 0),
  }));
}

export function getSkillsList(): SkillItem[] {
  const rows = db.prepare('SELECT * FROM skills ORDER BY sort_order ASC, id ASC').all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    proficiency: String(r.proficiency),
    category: String(r.category),
    description: String(r.description ?? ''),
    sortOrder: Number(r.sort_order ?? 0),
  }));
}

export function getProjectsList(): ProjectItem[] {
  const rows = db.prepare('SELECT * FROM projects ORDER BY featured DESC, id DESC').all() as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: Number(r.id),
    title: String(r.title),
    category: String(r.category),
    description: String(r.description),
    projectUrl: String(r.project_url ?? ''),
    imageUrl: String(r.image_url ?? ''),
    featured: Boolean(r.featured),
    createdAt: String(r.created_at),
  }));
}

export function getFullPortfolio(): PortfolioData {
  return {
    profile: getSiteProfile(),
    education: getEducationList(),
    skills: getSkillsList(),
    projects: getProjectsList(),
  };
}

// --- Admin Profile Mutations ---

export function updateSiteProfile(data: Partial<SiteProfile>): SiteProfile {
  const current = getSiteProfile();
  const next = {
    fullName: data.fullName ?? current.fullName,
    subtitle: data.subtitle ?? current.subtitle,
    heroDescription: data.heroDescription ?? current.heroDescription,
    aboutBio: data.aboutBio ?? current.aboutBio,
    careerObjective: data.careerObjective ?? current.careerObjective,
    location: data.location ?? current.location,
    nationality: data.nationality ?? current.nationality,
    availability: data.availability ?? current.availability,
    contactEmail: data.contactEmail ?? current.contactEmail,
    contactPhone: data.contactPhone ?? current.contactPhone,
    profilePhotoUrl: data.profilePhotoUrl ?? current.profilePhotoUrl,
    cvFileUrl: data.cvFileUrl ?? current.cvFileUrl,
    cvFilename: data.cvFilename ?? current.cvFilename,
    footerQuote: data.footerQuote ?? current.footerQuote,
  };

  db.prepare(`
    UPDATE site_profile SET
      full_name = ?,
      subtitle = ?,
      hero_description = ?,
      about_bio = ?,
      career_objective = ?,
      location = ?,
      nationality = ?,
      availability = ?,
      contact_email = ?,
      contact_phone = ?,
      profile_photo_url = ?,
      cv_file_url = ?,
      cv_filename = ?,
      footer_quote = ?,
      updated_at = datetime('now')
    WHERE id = 1
  `).run(
    next.fullName,
    next.subtitle,
    next.heroDescription,
    next.aboutBio,
    next.careerObjective,
    next.location,
    next.nationality,
    next.availability,
    next.contactEmail,
    next.contactPhone,
    next.profilePhotoUrl,
    next.cvFileUrl,
    next.cvFilename,
    next.footerQuote,
  );

  return getSiteProfile();
}

// --- Admin Education Mutations ---

export function createEducation(input: Omit<EducationItem, 'id'>): EducationItem {
  const res = db
    .prepare(
      'INSERT INTO education (degree, year, study_group, board, gpa, institution, notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
    .run(input.degree, input.year, input.studyGroup, input.board, input.gpa, input.institution, input.notes, input.sortOrder);
  const id = Number(res.lastInsertRowid);
  return { ...input, id };
}

export function updateEducation(id: number, input: Omit<EducationItem, 'id'>): EducationItem | null {
  const res = db
    .prepare(
      'UPDATE education SET degree = ?, year = ?, study_group = ?, board = ?, gpa = ?, institution = ?, notes = ?, sort_order = ? WHERE id = ?',
    )
    .run(input.degree, input.year, input.studyGroup, input.board, input.gpa, input.institution, input.notes, input.sortOrder, id);
  if (res.changes === 0) return null;
  return { ...input, id };
}

export function deleteEducation(id: number): boolean {
  const res = db.prepare('DELETE FROM education WHERE id = ?').run(id);
  return res.changes > 0;
}

// --- Admin Skills Mutations ---

export function createSkill(input: Omit<SkillItem, 'id'>): SkillItem {
  const res = db
    .prepare('INSERT INTO skills (name, proficiency, category, description, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(input.name, input.proficiency, input.category, input.description, input.sortOrder);
  return { ...input, id: Number(res.lastInsertRowid) };
}

export function updateSkill(id: number, input: Omit<SkillItem, 'id'>): SkillItem | null {
  const res = db
    .prepare('UPDATE skills SET name = ?, proficiency = ?, category = ?, description = ?, sort_order = ? WHERE id = ?')
    .run(input.name, input.proficiency, input.category, input.description, input.sortOrder, id);
  if (res.changes === 0) return null;
  return { ...input, id };
}

export function deleteSkill(id: number): boolean {
  const res = db.prepare('DELETE FROM skills WHERE id = ?').run(id);
  return res.changes > 0;
}

// --- Admin Projects Mutations ---

export function createProject(input: Omit<ProjectItem, 'id' | 'createdAt'>): ProjectItem {
  const res = db
    .prepare('INSERT INTO projects (title, category, description, project_url, image_url, featured) VALUES (?, ?, ?, ?, ?, ?)')
    .run(input.title, input.category, input.description, input.projectUrl, input.imageUrl, input.featured ? 1 : 0);
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(Number(res.lastInsertRowid)) as Record<string, unknown>;
  return {
    id: Number(row.id),
    title: String(row.title),
    category: String(row.category),
    description: String(row.description),
    projectUrl: String(row.project_url ?? ''),
    imageUrl: String(row.image_url ?? ''),
    featured: Boolean(row.featured),
    createdAt: String(row.created_at),
  };
}

export function updateProject(id: number, input: Omit<ProjectItem, 'id' | 'createdAt'>): ProjectItem | null {
  const res = db
    .prepare('UPDATE projects SET title = ?, category = ?, description = ?, project_url = ?, image_url = ?, featured = ? WHERE id = ?')
    .run(input.title, input.category, input.description, input.projectUrl, input.imageUrl, input.featured ? 1 : 0, id);
  if (res.changes === 0) return null;
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Record<string, unknown>;
  return {
    id: Number(row.id),
    title: String(row.title),
    category: String(row.category),
    description: String(row.description),
    projectUrl: String(row.project_url ?? ''),
    imageUrl: String(row.image_url ?? ''),
    featured: Boolean(row.featured),
    createdAt: String(row.created_at),
  };
}

export function deleteProject(id: number): boolean {
  const res = db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  return res.changes > 0;
}

// --- Contact Messages ---

export function createContactMessage(input: {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}): ContactMessage {
  const res = db
    .prepare('INSERT INTO contact_messages (full_name, email, subject, message) VALUES (?, ?, ?, ?)')
    .run(input.fullName, input.email, input.subject, input.message);
  const row = db.prepare('SELECT * FROM contact_messages WHERE id = ?').get(Number(res.lastInsertRowid)) as Record<
    string,
    unknown
  >;
  return {
    id: Number(row.id),
    fullName: String(row.full_name),
    email: String(row.email),
    subject: String(row.subject),
    message: String(row.message),
    isRead: Boolean(row.is_read),
    createdAt: String(row.created_at),
  };
}

export function getContactMessages(search?: string): ContactMessage[] {
  const trimmed = search?.trim() ?? '';
  let rows: Array<Record<string, unknown>>;
  if (trimmed) {
    const pattern = `%${trimmed}%`;
    rows = db
      .prepare(`
        SELECT * FROM contact_messages
        WHERE full_name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?
        ORDER BY is_read ASC, id DESC
      `)
      .all(pattern, pattern, pattern, pattern) as Array<Record<string, unknown>>;
  } else {
    rows = db.prepare('SELECT * FROM contact_messages ORDER BY is_read ASC, id DESC').all() as Array<
      Record<string, unknown>
    >;
  }
  return rows.map((r) => ({
    id: Number(r.id),
    fullName: String(r.full_name),
    email: String(r.email),
    subject: String(r.subject),
    message: String(r.message),
    isRead: Boolean(r.is_read),
    createdAt: String(r.created_at),
  }));
}

export function setContactMessageRead(id: number, isRead: boolean): boolean {
  const res = db.prepare('UPDATE contact_messages SET is_read = ? WHERE id = ?').run(isRead ? 1 : 0, id);
  return res.changes > 0;
}

export function deleteContactMessage(id: number): boolean {
  const res = db.prepare('DELETE FROM contact_messages WHERE id = ?').run(id);
  return res.changes > 0;
}
