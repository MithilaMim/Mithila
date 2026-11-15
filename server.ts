import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import {
  CV_DIR,
  IMAGES_DIR,
  createContactMessage,
  createEducation,
  createProject,
  createSession,
  createSkill,
  deleteContactMessage,
  deleteEducation,
  deleteProject,
  deleteSession,
  deleteSkill,
  getContactMessages,
  getFullPortfolio,
  getSessionUser,
  getSiteProfile,
  setContactMessageRead,
  updateAdminPassword,
  updateEducation,
  updateProject,
  updateSiteProfile,
  updateSkill,
  verifyAdminCredentials,
} from './src/server/db.ts';
import { buildCvPdfBuffer } from './src/server/cvGenerator.ts';
import {
  SESSION_COOKIE_NAME,
  createRateLimiter,
  detectImageExtension,
  isValidEmail,
  isValidPdfBuffer,
  requireAdmin,
  requireCsrfHeader,
  sanitizePlainText,
  sanitizeSafeUrl,
  securityHeaders,
  type AuthenticatedRequest,
} from './src/server/security.ts';

const PORT = 3000;
const app = express();

app.set('trust proxy', 1);
app.use(securityHeaders);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

// Serve uploaded images & CVs safely
app.use(
  '/uploads',
  express.static(path.resolve(process.cwd(), 'uploads'), {
    fallthrough: false,
    setHeaders: (res) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  }),
);

// Handle missing upload cleanly without leaking stack trace
app.use('/uploads', (_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(404).json({ error: 'File not found' });
});

// Rate limiters
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyPrefix: 'login',
});

const contactLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'contact',
});

const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: 'upload',
});

// Multer memory storage (strict validation before writing to disk)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const cvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Apply CSRF protection to mutating /api routes
app.use('/api', requireCsrfHeader);

// ============================================================================
// PUBLIC PORTFOLIO & CONTACT ROUTES
// ============================================================================

app.get('/api/portfolio', (_req, res) => {
  try {
    const data = getFullPortfolio();
    res.json(data);
  } catch (err) {
    console.error('Failed to load portfolio:', err);
    res.status(500).json({ error: 'Failed to load portfolio data' });
  }
});

app.get('/api/cv/download', async (_req, res) => {
  try {
    const data = getFullPortfolio();
    const safeFilename = (data.profile.cvFilename || 'Most_Mithila_Akter_Mim_CV.pdf')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.pdf$/i, '') + '.pdf';

    if (data.profile.cvFileUrl && data.profile.cvFileUrl.startsWith('/uploads/cv/')) {
      const basename = path.basename(data.profile.cvFileUrl);
      const fullPath = path.join(CV_DIR, basename);
      if (fs.existsSync(fullPath)) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return fs.createReadStream(fullPath).pipe(res);
      }
    }

    const pdfBuffer = await buildCvPdfBuffer(data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('CV download error:', err);
    res.status(500).json({ error: 'Unable to generate CV download' });
  }
});

app.post('/api/contact', contactLimiter, (req, res) => {
  try {
    const fullName = sanitizePlainText(req.body?.fullName, 120);
    const email = sanitizePlainText(req.body?.email, 254).toLowerCase();
    const subject = sanitizePlainText(req.body?.subject, 180);
    const message = sanitizePlainText(req.body?.message, 4000);

    if (fullName.length < 2) {
      return res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (subject.length < 2) {
      return res.status(400).json({ error: 'Please enter a subject.' });
    }
    if (message.length < 10) {
      return res.status(400).json({ error: 'Please write a message of at least 10 characters.' });
    }

    createContactMessage({ fullName, email, subject, message });
    res.status(201).json({ success: true, message: 'Thank you. Your message has been received.' });
  } catch (err) {
    console.error('Contact submission error:', err);
    res.status(500).json({ error: 'Unable to send message right now.' });
  }
});

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

app.get('/api/auth/session', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const user = token ? getSessionUser(token) : null;
  if (!user) {
    return res.json({ authenticated: false, user: null });
  }
  return res.json({ authenticated: true, user });
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  try {
    const username = sanitizePlainText(req.body?.username, 80);
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = verifyAdminCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    const sessionId = createSession(user.id, user.role);
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.cookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ authenticated: true, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication service error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  if (token) {
    deleteSession(token);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ success: true });
});

// ============================================================================
// PROTECTED ADMIN ROUTES (RBAC: role === 'admin')
// ============================================================================

app.put('/api/admin/profile', requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const b = req.body ?? {};
    const contactEmail = sanitizePlainText(b.contactEmail, 254);
    if (contactEmail && !isValidEmail(contactEmail)) {
      return res.status(400).json({ error: 'Contact email must be a valid email address.' });
    }

    const updated = updateSiteProfile({
      fullName: sanitizePlainText(b.fullName, 120) || undefined,
      subtitle: sanitizePlainText(b.subtitle, 220) || undefined,
      heroDescription: sanitizePlainText(b.heroDescription, 1000) || undefined,
      aboutBio: sanitizePlainText(b.aboutBio, 2000) || undefined,
      careerObjective: sanitizePlainText(b.careerObjective, 1000) || undefined,
      location: sanitizePlainText(b.location, 120) || undefined,
      nationality: sanitizePlainText(b.nationality, 120) || undefined,
      availability: sanitizePlainText(b.availability, 160) || undefined,
      contactEmail: contactEmail || undefined,
      contactPhone: typeof b.contactPhone === 'string' ? sanitizePlainText(b.contactPhone, 60) : undefined,
      profilePhotoUrl:
        typeof b.profilePhotoUrl === 'string' ? sanitizeSafeUrl(b.profilePhotoUrl) || 'default' : undefined,
      footerQuote: sanitizePlainText(b.footerQuote, 300) || undefined,
    });

    res.json(updated);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/admin/password', requireAdmin, (req: AuthenticatedRequest, res) => {
  try {
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }
    const ok = updateAdminPassword(req.adminUser!.id, currentPassword, newPassword);
    if (!ok) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Password update error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.post(
  '/api/admin/upload/image',
  requireAdmin,
  uploadLimiter,
  imageUpload.single('image'),
  (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided.' });
      }
      const ext = detectImageExtension(req.file.buffer);
      if (!ext) {
        return res.status(400).json({ error: 'Unsupported or invalid image file. Use JPG, PNG, or WEBP.' });
      }
      const filename = `${crypto.randomUUID()}.${ext}`;
      fs.writeFileSync(path.join(IMAGES_DIR, filename), req.file.buffer);
      res.status(201).json({ url: `/uploads/images/${filename}` });
    } catch (err) {
      console.error('Image upload error:', err);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  },
);

app.post(
  '/api/admin/upload/cv',
  requireAdmin,
  uploadLimiter,
  cvUpload.single('cv'),
  (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file provided.' });
      }
      if (!isValidPdfBuffer(req.file.buffer)) {
        return res.status(400).json({ error: 'Invalid file format. Please upload a valid PDF document.' });
      }

      const previous = getSiteProfile();
      if (previous.cvFileUrl && previous.cvFileUrl.startsWith('/uploads/cv/')) {
        const oldPath = path.join(CV_DIR, path.basename(previous.cvFileUrl));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const filename = `${crypto.randomUUID()}.pdf`;
      fs.writeFileSync(path.join(CV_DIR, filename), req.file.buffer);

      const originalName =
        sanitizePlainText(req.file.originalname, 120).replace(/[^a-zA-Z0-9._-]/g, '_') ||
        'Most_Mithila_Akter_Mim_CV.pdf';

      const updated = updateSiteProfile({
        cvFileUrl: `/uploads/cv/${filename}`,
        cvFilename: originalName.toLowerCase().endsWith('.pdf') ? originalName : `${originalName}.pdf`,
      });

      res.status(201).json({ cvFileUrl: updated.cvFileUrl, cvFilename: updated.cvFilename });
    } catch (err) {
      console.error('CV upload error:', err);
      res.status(500).json({ error: 'Failed to upload CV PDF' });
    }
  },
);

app.delete('/api/admin/cv', requireAdmin, (_req: AuthenticatedRequest, res) => {
  try {
    const previous = getSiteProfile();
    if (previous.cvFileUrl && previous.cvFileUrl.startsWith('/uploads/cv/')) {
      const oldPath = path.join(CV_DIR, path.basename(previous.cvFileUrl));
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    const updated = updateSiteProfile({
      cvFileUrl: '',
      cvFilename: 'Most_Mithila_Akter_Mim_CV.pdf',
    });
    res.json({ cvFileUrl: updated.cvFileUrl, cvFilename: updated.cvFilename });
  } catch (err) {
    console.error('Reset CV error:', err);
    res.status(500).json({ error: 'Failed to reset CV' });
  }
});

// Education CRUD
app.post('/api/admin/education', requireAdmin, (req, res) => {
  const b = req.body ?? {};
  const degree = sanitizePlainText(b.degree, 80);
  const year = sanitizePlainText(b.year, 20);
  const studyGroup = sanitizePlainText(b.studyGroup, 80);
  const board = sanitizePlainText(b.board, 80);
  const gpa = sanitizePlainText(b.gpa, 20);
  if (!degree || !year || !studyGroup || !board || !gpa) {
    return res.status(400).json({ error: 'Degree, year, group, board, and GPA are required.' });
  }
  const item = createEducation({
    degree,
    year,
    studyGroup,
    board,
    gpa,
    institution: sanitizePlainText(b.institution, 160),
    notes: sanitizePlainText(b.notes, 300),
    sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0,
  });
  res.status(201).json(item);
});

app.put('/api/admin/education/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
  const b = req.body ?? {};
  const degree = sanitizePlainText(b.degree, 80);
  const year = sanitizePlainText(b.year, 20);
  const studyGroup = sanitizePlainText(b.studyGroup, 80);
  const board = sanitizePlainText(b.board, 80);
  const gpa = sanitizePlainText(b.gpa, 20);
  if (!degree || !year || !studyGroup || !board || !gpa) {
    return res.status(400).json({ error: 'Degree, year, group, board, and GPA are required.' });
  }
  const item = updateEducation(id, {
    degree,
    year,
    studyGroup,
    board,
    gpa,
    institution: sanitizePlainText(b.institution, 160),
    notes: sanitizePlainText(b.notes, 300),
    sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0,
  });
  if (!item) return res.status(404).json({ error: 'Education record not found' });
  res.json(item);
});

app.delete('/api/admin/education/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
  const ok = deleteEducation(id);
  if (!ok) return res.status(404).json({ error: 'Education record not found' });
  res.json({ success: true });
});

// Skills CRUD
app.post('/api/admin/skills', requireAdmin, (req, res) => {
  const b = req.body ?? {};
  const name = sanitizePlainText(b.name, 80);
  const proficiency = sanitizePlainText(b.proficiency, 60);
  const category = sanitizePlainText(b.category, 60) || 'Skill';
  if (!name || !proficiency) {
    return res.status(400).json({ error: 'Skill name and proficiency are required.' });
  }
  const item = createSkill({
    name,
    proficiency,
    category,
    description: sanitizePlainText(b.description, 280),
    sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0,
  });
  res.status(201).json(item);
});

app.put('/api/admin/skills/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
  const b = req.body ?? {};
  const name = sanitizePlainText(b.name, 80);
  const proficiency = sanitizePlainText(b.proficiency, 60);
  const category = sanitizePlainText(b.category, 60) || 'Skill';
  if (!name || !proficiency) {
    return res.status(400).json({ error: 'Skill name and proficiency are required.' });
  }
  const item = updateSkill(id, {
    name,
    proficiency,
    category,
    description: sanitizePlainText(b.description, 280),
    sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0,
  });
  if (!item) return res.status(404).json({ error: 'Skill not found' });
  res.json(item);
});

app.delete('/api/admin/skills/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
  const ok = deleteSkill(id);
  if (!ok) return res.status(404).json({ error: 'Skill not found' });
  res.json({ success: true });
});

// Projects CRUD
app.post('/api/admin/projects', requireAdmin, (req, res) => {
  const b = req.body ?? {};
  const title = sanitizePlainText(b.title, 140);
  const category = sanitizePlainText(b.category, 60);
  const description = sanitizePlainText(b.description, 2000);
  if (!title || !category || !description) {
    return res.status(400).json({ error: 'Project title, category, and description are required.' });
  }
  const item = createProject({
    title,
    category,
    description,
    projectUrl: sanitizeSafeUrl(b.projectUrl),
    imageUrl: sanitizeSafeUrl(b.imageUrl),
    featured: Boolean(b.featured),
  });
  res.status(201).json(item);
});

app.put('/api/admin/projects/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
  const b = req.body ?? {};
  const title = sanitizePlainText(b.title, 140);
  const category = sanitizePlainText(b.category, 60);
  const description = sanitizePlainText(b.description, 2000);
  if (!title || !category || !description) {
    return res.status(400).json({ error: 'Project title, category, and description are required.' });
  }
  const item = updateProject(id, {
    title,
    category,
    description,
    projectUrl: sanitizeSafeUrl(b.projectUrl),
    imageUrl: sanitizeSafeUrl(b.imageUrl),
    featured: Boolean(b.featured),
  });
  if (!item) return res.status(404).json({ error: 'Project not found' });
  res.json(item);
});

app.delete('/api/admin/projects/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
  const ok = deleteProject(id);
  if (!ok) return res.status(404).json({ error: 'Project not found' });
  res.json({ success: true });
});

// Contact Messages Inbox
app.get('/api/admin/messages', requireAdmin, (req, res) => {
  const search = typeof req.query.search === 'string' ? sanitizePlainText(req.query.search, 120) : '';
  const messages = getContactMessages(search);
  res.json(messages);
});

app.patch('/api/admin/messages/:id/read', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
  const isRead = Boolean(req.body?.isRead);
  const ok = setContactMessageRead(id, isRead);
  if (!ok) return res.status(404).json({ error: 'Message not found' });
  res.json({ success: true, isRead });
});

app.delete('/api/admin/messages/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid ID' });
  const ok = deleteContactMessage(id);
  if (!ok) return res.status(404).json({ error: 'Message not found' });
  res.json({ success: true });
});

// Multer error handler
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  next(err);
});

// ============================================================================
// VITE DEV MIDDLEWARE / PRODUCTION STATIC HOSTING
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portfolio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
