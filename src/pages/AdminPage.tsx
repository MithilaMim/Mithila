import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  MailOpen,
  Menu,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import defaultPortrait from '../assets/images/mithila_portrait_1794639241032.jpg';
import { api } from '../lib/api';
import type {
  AdminSessionUser,
  ContactMessage,
  EducationItem,
  PortfolioData,
  ProjectItem,
  SiteProfile,
  SkillItem,
} from '../types/portfolio';

type AdminTab = 'overview' | 'profile' | 'education' | 'skills' | 'projects' | 'inbox' | 'cv-security';

interface AdminPageProps {
  onNavigate: (path: string) => void;
}

export function AdminPage({ onNavigate }: AdminPageProps) {
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState<AdminSessionUser | null>(null);

  // Login state (never hardcode passwords in frontend)
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messageSearch, setMessageSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editable profile draft
  const [profileDraft, setProfileDraft] = useState<SiteProfile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Education modal / form state
  const [editingEdu, setEditingEdu] = useState<Partial<EducationItem> | null>(null);
  const [savingEdu, setSavingEdu] = useState(false);

  // Skill modal / form state
  const [editingSkill, setEditingSkill] = useState<Partial<SkillItem> | null>(null);
  const [savingSkill, setSavingSkill] = useState(false);

  // Project modal / form state
  const [editingProject, setEditingProject] = useState<Partial<ProjectItem> | null>(null);
  const [savingProject, setSavingProject] = useState(false);
  const [uploadingProjectImg, setUploadingProjectImg] = useState(false);

  // CV & Password state
  const [uploadingCv, setUploadingCv] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const showNotification = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    window.setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const loadAdminData = useCallback(async () => {
    try {
      const [pData, msgs] = await Promise.all([api.getPortfolio(), api.getMessages()]);
      setPortfolio(pData);
      setProfileDraft(pData.profile);
      setMessages(msgs);
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to load dashboard data.');
    }
  }, [showNotification]);

  useEffect(() => {
    api
      .getSession()
      .then((res) => {
        if (res.authenticated && res.user) {
          setUser(res.user);
          loadAdminData();
        }
      })
      .finally(() => setAuthChecking(false));
  }, [loadAdminData]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const res = await api.login(loginUsername.trim(), loginPassword);
      setUser(res.user);
      setLoginPassword('');
      await loadAdminData();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Invalid username or password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setPortfolio(null);
    setMessages([]);
  };

  // Profile handlers
  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profileDraft) return;
    setSavingProfile(true);
    try {
      const updated = await api.updateProfile(profileDraft);
      setProfileDraft(updated);
      setPortfolio((prev) => (prev ? { ...prev, profile: updated } : prev));
      showNotification('success', 'Profile and website content updated.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileDraft) return;
    setUploadingPhoto(true);
    try {
      const { url } = await api.uploadImage(file);
      const updated = await api.updateProfile({ profilePhotoUrl: url });
      setProfileDraft(updated);
      setPortfolio((prev) => (prev ? { ...prev, profile: updated } : prev));
      showNotification('success', 'Profile photo uploaded and saved.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to upload profile photo.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleResetPhoto = async () => {
    if (!profileDraft) return;
    try {
      const updated = await api.updateProfile({ profilePhotoUrl: 'default' });
      setProfileDraft(updated);
      setPortfolio((prev) => (prev ? { ...prev, profile: updated } : prev));
      showNotification('success', 'Reverted to default studio portrait.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to reset photo.');
    }
  };

  // Education handlers
  const handleSaveEducation = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingEdu) return;
    setSavingEdu(true);
    try {
      const payload = {
        degree: editingEdu.degree?.trim() || '',
        year: editingEdu.year?.trim() || '',
        studyGroup: editingEdu.studyGroup?.trim() || '',
        board: editingEdu.board?.trim() || '',
        gpa: editingEdu.gpa?.trim() || '',
        institution: editingEdu.institution?.trim() || '',
        notes: editingEdu.notes?.trim() || '',
        sortOrder: Number(editingEdu.sortOrder ?? 0),
      };
      if (editingEdu.id) {
        await api.updateEducation(editingEdu.id, payload);
        showNotification('success', 'Education record updated.');
      } else {
        await api.createEducation(payload);
        showNotification('success', 'Education record added.');
      }
      setEditingEdu(null);
      await loadAdminData();
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save education record.');
    } finally {
      setSavingEdu(false);
    }
  };

  const handleDeleteEducation = async (id: number) => {
    try {
      await api.deleteEducation(id);
      await loadAdminData();
      showNotification('success', 'Education record deleted.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to delete education record.');
    }
  };

  // Skills handlers
  const handleSaveSkill = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    setSavingSkill(true);
    try {
      const payload = {
        name: editingSkill.name?.trim() || '',
        proficiency: editingSkill.proficiency?.trim() || '',
        category: editingSkill.category?.trim() || 'Skill',
        description: editingSkill.description?.trim() || '',
        sortOrder: Number(editingSkill.sortOrder ?? 0),
      };
      if (editingSkill.id) {
        await api.updateSkill(editingSkill.id, payload);
        showNotification('success', 'Skill updated.');
      } else {
        await api.createSkill(payload);
        showNotification('success', 'Skill added.');
      }
      setEditingSkill(null);
      await loadAdminData();
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save skill.');
    } finally {
      setSavingSkill(false);
    }
  };

  const handleDeleteSkill = async (id: number) => {
    try {
      await api.deleteSkill(id);
      await loadAdminData();
      showNotification('success', 'Skill removed.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to remove skill.');
    }
  };

  // Project handlers
  const handleProjectImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProject) return;
    setUploadingProjectImg(true);
    try {
      const { url } = await api.uploadImage(file);
      setEditingProject((prev) => (prev ? { ...prev, imageUrl: url } : prev));
      showNotification('success', 'Project image uploaded.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to upload project image.');
    } finally {
      setUploadingProjectImg(false);
      e.target.value = '';
    }
  };

  const handleSaveProject = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setSavingProject(true);
    try {
      const payload = {
        title: editingProject.title?.trim() || '',
        category: editingProject.category?.trim() || '',
        description: editingProject.description?.trim() || '',
        projectUrl: editingProject.projectUrl?.trim() || '',
        imageUrl: editingProject.imageUrl?.trim() || '',
        featured: Boolean(editingProject.featured),
      };
      if (editingProject.id) {
        await api.updateProject(editingProject.id, payload);
        showNotification('success', 'Project updated.');
      } else {
        await api.createProject(payload);
        showNotification('success', 'Project created.');
      }
      setEditingProject(null);
      await loadAdminData();
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to save project.');
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      await api.deleteProject(id);
      await loadAdminData();
      showNotification('success', 'Project deleted.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to delete project.');
    }
  };

  // Messages handlers
  const handleSearchMessages = async (query: string) => {
    setMessageSearch(query);
    try {
      const res = await api.getMessages(query);
      setMessages(res);
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to search messages.');
    }
  };

  const handleToggleMessageRead = async (msg: ContactMessage) => {
    try {
      await api.setMessageRead(msg.id, !msg.isRead);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, isRead: !m.isRead } : m)));
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to update message status.');
    }
  };

  const handleDeleteMessage = async (id: number) => {
    try {
      await api.deleteMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      showNotification('success', 'Message deleted.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to delete message.');
    }
  };

  // CV & Password handlers
  const handleCvUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCv(true);
    try {
      const res = await api.uploadCv(file);
      setProfileDraft((prev) => (prev ? { ...prev, ...res } : prev));
      setPortfolio((prev) => (prev ? { ...prev, profile: { ...prev.profile, ...res } } : prev));
      showNotification('success', 'Custom CV PDF uploaded.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to upload CV PDF.');
    } finally {
      setUploadingCv(false);
      e.target.value = '';
    }
  };

  const handleResetCv = async () => {
    try {
      const res = await api.resetCv();
      setProfileDraft((prev) => (prev ? { ...prev, ...res } : prev));
      setPortfolio((prev) => (prev ? { ...prev, profile: { ...prev.profile, ...res } } : prev));
      showNotification('success', 'CV reset to live auto-generated PDF.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to reset CV.');
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showNotification('error', 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('error', 'New passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showNotification('success', 'Administrator password updated.');
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Auth loading state
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#5E4B94] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Unauthenticated Login Gate
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex flex-col justify-center px-6 py-12">
        <div className="max-w-md w-full mx-auto space-y-6">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#52525B] hover:text-[#18181B] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Portfolio</span>
          </button>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-[#E6E3DF] rounded-2xl p-8 space-y-6"
          >
            <div>
              <p className="text-xs font-medium text-[#5E4B94] mb-1">Administrator Access</p>
              <h1 className="font-editorial text-3xl font-semibold text-[#18181B]">Sign In</h1>
              <p className="text-sm text-[#52525B] mt-1.5">
                Sign in with your administrator credentials to manage portfolio content and messages.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="admin-username" className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                  Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoComplete="username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Enter administrator username"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg text-[#18181B] focus:outline-none focus:border-[#5E4B94]"
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter administrator password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg text-[#18181B] focus:outline-none focus:border-[#5E4B94]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#71717A] hover:text-[#18181B] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#991B1B]"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 px-4 bg-[#18181B] text-[#FAF9F7] text-sm font-medium rounded-lg hover:bg-[#5E4B94] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {loginLoading ? 'Verifying...' : 'Sign In to Dashboard'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  const unreadCount = messages.filter((m) => !m.isRead).length;
  const navItems: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile & Bio', icon: User },
    { id: 'education', label: 'Education', icon: BookOpen },
    { id: 'skills', label: 'Skills & Languages', icon: Sparkles },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: unreadCount },
    { id: 'cv-security', label: 'CV & Security', icon: Lock },
  ];

  const currentPortraitSrc =
    !profileDraft?.profilePhotoUrl || profileDraft.profilePhotoUrl === 'default'
      ? defaultPortrait
      : profileDraft.profilePhotoUrl;

  return (
    <div className="min-h-screen bg-[#FAF9F7] text-[#18181B] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#18181B] text-[#FAF9F7] border-r border-[#27272A]">
        <div className="px-6 py-6 border-b border-[#27272A]">
          <p className="font-editorial text-xl font-semibold tracking-tight">Mithila Mim</p>
          <p className="text-xs text-[#A1A1AA] mt-0.5">Portfolio Workspace</p>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Admin sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#5E4B94] text-white'
                    : 'text-[#D4D4D8] hover:bg-[#27272A] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="font-tabular text-xs text-[#E4DCF5]">{item.count}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#27272A] space-y-2">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#D4D4D8] hover:text-white hover:bg-[#27272A] rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>View Public Portfolio</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-[#FCA5A5] hover:bg-[#27272A] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-[#18181B] text-[#FAF9F7] px-4 h-14 flex items-center justify-between">
        <span className="font-editorial text-lg font-semibold">Mithila Mim — Admin</span>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen((v) => !v)}
          aria-label="Toggle admin menu"
          className="p-2 rounded-lg hover:bg-[#27272A]"
        >
          {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {mobileSidebarOpen && (
        <div className="lg:hidden bg-[#18181B] text-[#FAF9F7] px-4 pb-4 space-y-1 border-b border-[#27272A]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === item.id ? 'bg-[#5E4B94] text-white' : 'text-[#D4D4D8]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </span>
                {typeof item.count === 'number' && item.count > 0 && (
                  <span className="font-tabular text-xs">{item.count}</span>
                )}
              </button>
            );
          })}
          <div className="pt-2 flex items-center gap-2 border-t border-[#27272A]">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="flex-1 py-2 text-xs text-center bg-[#27272A] rounded-lg"
            >
              Public Site
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 py-2 text-xs text-center text-[#FCA5A5] bg-[#27272A] rounded-lg"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64">
        <div className="max-w-5xl mx-auto px-6 py-8 sm:py-10 space-y-8">
          {/* Notification Toast */}
          {toast && (
            <div
              role="status"
              className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
                toast.type === 'success'
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                  : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
              }`}
            >
              <span className="flex items-center gap-2">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span>{toast.text}</span>
              </span>
              <button type="button" onClick={() => setToast(null)} className="p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && portfolio && (
            <div className="space-y-8">
              <div>
                <h1 className="font-editorial text-3xl font-semibold text-[#18181B]">
                  Welcome, {user.username}
                </h1>
                <p className="text-sm text-[#52525B] mt-1">
                  Manage your public portfolio, CV, academic records, projects, and visitor inquiries.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E6E3DF] rounded-2xl p-5">
                  <p className="text-xs text-[#71717A]">Education Records</p>
                  <p className="font-tabular text-3xl font-semibold text-[#18181B] mt-2">
                    {portfolio.education.length}
                  </p>
                </div>
                <div className="bg-white border border-[#E6E3DF] rounded-2xl p-5">
                  <p className="text-xs text-[#71717A]">Skills & Languages</p>
                  <p className="font-tabular text-3xl font-semibold text-[#18181B] mt-2">
                    {portfolio.skills.length}
                  </p>
                </div>
                <div className="bg-white border border-[#E6E3DF] rounded-2xl p-5">
                  <p className="text-xs text-[#71717A]">Projects Published</p>
                  <p className="font-tabular text-3xl font-semibold text-[#18181B] mt-2">
                    {portfolio.projects.length}
                  </p>
                </div>
                <div className="bg-white border border-[#E6E3DF] rounded-2xl p-5">
                  <p className="text-xs text-[#71717A]">Unread Messages</p>
                  <p className="font-tabular text-3xl font-semibold text-[#5E4B94] mt-2">
                    {unreadCount}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#E6E3DF] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-editorial text-xl font-semibold text-[#18181B]">Live Curriculum Vitae</h2>
                  <p className="text-sm text-[#52525B] mt-1">
                    {portfolio.profile.cvFileUrl
                      ? `Custom PDF active: ${portfolio.profile.cvFilename}`
                      : 'Auto-generated PDF synced directly with your profile, education, and languages.'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href="/api/cv/download"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#18181B] text-[#FAF9F7] rounded-lg hover:bg-[#5E4B94] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CV</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cv-security')}
                    className="px-4 py-2 text-xs font-medium border border-[#D9D5CE] rounded-lg hover:border-[#18181B] transition-colors cursor-pointer"
                  >
                    Manage CV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE & BIO TAB */}
          {activeTab === 'profile' && profileDraft && (
            <div className="space-y-6">
              <div>
                <h1 className="font-editorial text-3xl font-semibold text-[#18181B]">Profile & Bio</h1>
                <p className="text-sm text-[#52525B] mt-1">
                  Update your public hero introduction, portrait, personal information, career objective, and contact details.
                </p>
              </div>

              {/* Portrait Upload Card */}
              <div className="bg-white border border-[#E6E3DF] rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <img
                  src={currentPortraitSrc}
                  alt="Current profile portrait"
                  className="w-24 h-28 object-cover rounded-xl border border-[#E6E3DF] bg-[#ECE8F4] shrink-0"
                />
                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#18181B]">Profile Photo</h2>
                    <p className="text-xs text-[#71717A] mt-0.5">JPG, PNG, or WEBP up to 5 MB.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#18181B] text-[#FAF9F7] rounded-lg hover:bg-[#5E4B94] transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingPhoto ? 'Uploading...' : 'Upload New Photo'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingPhoto}
                        onChange={handlePhotoUpload}
                        className="sr-only"
                      />
                    </label>
                    {profileDraft.profilePhotoUrl !== 'default' && (
                      <button
                        type="button"
                        onClick={handleResetPhoto}
                        className="px-3.5 py-2 text-xs font-medium border border-[#D9D5CE] rounded-lg hover:border-[#18181B] cursor-pointer"
                      >
                        Reset Default
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Fields Form */}
              <form onSubmit={handleSaveProfile} className="bg-white border border-[#E6E3DF] rounded-2xl p-6 sm:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={profileDraft.fullName}
                      onChange={(e) => setProfileDraft({ ...profileDraft, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Subtitle</label>
                    <input
                      type="text"
                      required
                      value={profileDraft.subtitle}
                      onChange={(e) => setProfileDraft({ ...profileDraft, subtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Hero Description</label>
                  <textarea
                    rows={3}
                    required
                    value={profileDraft.heroDescription}
                    onChange={(e) => setProfileDraft({ ...profileDraft, heroDescription: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">About Me Biography</label>
                  <textarea
                    rows={4}
                    required
                    value={profileDraft.aboutBio}
                    onChange={(e) => setProfileDraft({ ...profileDraft, aboutBio: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Career Objective</label>
                  <textarea
                    rows={3}
                    required
                    value={profileDraft.careerObjective}
                    onChange={(e) => setProfileDraft({ ...profileDraft, careerObjective: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Location</label>
                    <input
                      type="text"
                      required
                      value={profileDraft.location}
                      onChange={(e) => setProfileDraft({ ...profileDraft, location: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Nationality</label>
                    <input
                      type="text"
                      required
                      value={profileDraft.nationality}
                      onChange={(e) => setProfileDraft({ ...profileDraft, nationality: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Availability</label>
                    <input
                      type="text"
                      required
                      value={profileDraft.availability}
                      onChange={(e) => setProfileDraft({ ...profileDraft, availability: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Contact Email</label>
                    <input
                      type="email"
                      required
                      value={profileDraft.contactEmail}
                      onChange={(e) => setProfileDraft({ ...profileDraft, contactEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                      Contact Phone (Optional)
                    </label>
                    <input
                      type="text"
                      value={profileDraft.contactPhone}
                      onChange={(e) => setProfileDraft({ ...profileDraft, contactPhone: e.target.value })}
                      placeholder="+880..."
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Footer Statement</label>
                  <input
                    type="text"
                    required
                    value={profileDraft.footerQuote}
                    onChange={(e) => setProfileDraft({ ...profileDraft, footerQuote: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 bg-[#18181B] text-[#FAF9F7] text-sm font-medium rounded-lg hover:bg-[#5E4B94] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* EDUCATION TAB */}
          {activeTab === 'education' && portfolio && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-editorial text-3xl font-semibold text-[#18181B]">Education</h1>
                  <p className="text-sm text-[#52525B] mt-1">Manage your academic timeline entries.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingEdu({
                      degree: '',
                      year: '',
                      studyGroup: '',
                      board: '',
                      gpa: '',
                      institution: '',
                      notes: '',
                      sortOrder: portfolio.education.length + 1,
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#18181B] text-[#FAF9F7] text-xs font-medium rounded-lg hover:bg-[#5E4B94] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Education</span>
                </button>
              </div>

              {editingEdu && (
                <form
                  onSubmit={handleSaveEducation}
                  className="bg-white border border-[#C4B5FD] rounded-2xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-editorial text-xl font-semibold">
                      {editingEdu.id ? 'Edit Education Record' : 'New Education Record'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingEdu(null)}
                      className="p-1 text-[#71717A] hover:text-[#18181B] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Degree / Exam</label>
                      <input
                        type="text"
                        required
                        value={editingEdu.degree ?? ''}
                        onChange={(e) => setEditingEdu({ ...editingEdu, degree: e.target.value })}
                        placeholder="HSC"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Year</label>
                      <input
                        type="text"
                        required
                        value={editingEdu.year ?? ''}
                        onChange={(e) => setEditingEdu({ ...editingEdu, year: e.target.value })}
                        placeholder="2025"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">GPA / Result</label>
                      <input
                        type="text"
                        required
                        value={editingEdu.gpa ?? ''}
                        onChange={(e) => setEditingEdu({ ...editingEdu, gpa: e.target.value })}
                        placeholder="3.00"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Group</label>
                      <input
                        type="text"
                        required
                        value={editingEdu.studyGroup ?? ''}
                        onChange={(e) => setEditingEdu({ ...editingEdu, studyGroup: e.target.value })}
                        placeholder="Arts"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Board</label>
                      <input
                        type="text"
                        required
                        value={editingEdu.board ?? ''}
                        onChange={(e) => setEditingEdu({ ...editingEdu, board: e.target.value })}
                        placeholder="Dinajpur"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Institution (Optional)</label>
                      <input
                        type="text"
                        value={editingEdu.institution ?? ''}
                        onChange={(e) => setEditingEdu({ ...editingEdu, institution: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Notes (Optional)</label>
                      <input
                        type="text"
                        value={editingEdu.notes ?? ''}
                        onChange={(e) => setEditingEdu({ ...editingEdu, notes: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Display Order</label>
                      <input
                        type="number"
                        value={editingEdu.sortOrder ?? 0}
                        onChange={(e) => setEditingEdu({ ...editingEdu, sortOrder: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={savingEdu}
                      className="px-5 py-2 bg-[#18181B] text-white text-xs font-medium rounded-lg hover:bg-[#5E4B94] cursor-pointer"
                    >
                      {savingEdu ? 'Saving...' : 'Save Record'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingEdu(null)}
                      className="px-4 py-2 text-xs text-[#52525B] hover:text-[#18181B] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {portfolio.education.map((edu) => (
                  <div
                    key={edu.id}
                    className="bg-white border border-[#E6E3DF] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <h3 className="font-editorial text-xl font-semibold text-[#18181B]">
                        {edu.degree} – <span className="font-tabular">{edu.year}</span>
                      </h3>
                      <p className="text-sm text-[#52525B] mt-1">
                        Group: {edu.studyGroup} · Board: {edu.board} · GPA:{' '}
                        <span className="font-tabular">{edu.gpa}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingEdu(edu)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#DFDBD4] rounded-lg hover:border-[#18181B] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEducation(edu.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#B91C1C] border border-[#FECACA] rounded-lg hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SKILLS & LANGUAGES TAB */}
          {activeTab === 'skills' && portfolio && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-editorial text-3xl font-semibold text-[#18181B]">Skills & Languages</h1>
                  <p className="text-sm text-[#52525B] mt-1">Add, edit, or remove languages and skills.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingSkill({
                      name: '',
                      proficiency: '',
                      category: 'Skill',
                      description: '',
                      sortOrder: portfolio.skills.length + 1,
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#18181B] text-[#FAF9F7] text-xs font-medium rounded-lg hover:bg-[#5E4B94] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Skill</span>
                </button>
              </div>

              {editingSkill && (
                <form
                  onSubmit={handleSaveSkill}
                  className="bg-white border border-[#C4B5FD] rounded-2xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-editorial text-xl font-semibold">
                      {editingSkill.id ? 'Edit Skill / Language' : 'New Skill / Language'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingSkill(null)}
                      className="p-1 text-[#71717A] hover:text-[#18181B] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={editingSkill.name ?? ''}
                        onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                        placeholder="e.g., Bangla, Microsoft Word"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Proficiency</label>
                      <input
                        type="text"
                        required
                        value={editingSkill.proficiency ?? ''}
                        onChange={(e) => setEditingSkill({ ...editingSkill, proficiency: e.target.value })}
                        placeholder="e.g., Native, Basic, Intermediate"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Category</label>
                      <input
                        type="text"
                        required
                        value={editingSkill.category ?? 'Skill'}
                        onChange={(e) => setEditingSkill({ ...editingSkill, category: e.target.value })}
                        placeholder="Language / Skill / Tool"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Description (Optional)</label>
                      <input
                        type="text"
                        value={editingSkill.description ?? ''}
                        onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Order</label>
                      <input
                        type="number"
                        value={editingSkill.sortOrder ?? 0}
                        onChange={(e) => setEditingSkill({ ...editingSkill, sortOrder: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={savingSkill}
                      className="px-5 py-2 bg-[#18181B] text-white text-xs font-medium rounded-lg hover:bg-[#5E4B94] cursor-pointer"
                    >
                      {savingSkill ? 'Saving...' : 'Save Skill'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSkill(null)}
                      className="px-4 py-2 text-xs text-[#52525B] hover:text-[#18181B] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {portfolio.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="bg-white border border-[#E6E3DF] rounded-2xl p-5 flex items-start justify-between gap-4"
                  >
                    <div>
                      <p className="text-xs text-[#71717A]">
                        {skill.category} · <span className="text-[#5E4B94] font-medium">{skill.proficiency}</span>
                      </p>
                      <h3 className="font-editorial text-xl font-semibold text-[#18181B] mt-1">{skill.name}</h3>
                      {skill.description && <p className="text-xs text-[#52525B] mt-1.5">{skill.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        aria-label={`Edit ${skill.name}`}
                        onClick={() => setEditingSkill(skill)}
                        className="p-2 border border-[#DFDBD4] rounded-lg hover:border-[#18181B] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${skill.name}`}
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="p-2 text-[#B91C1C] border border-[#FECACA] rounded-lg hover:bg-[#FEF2F2] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROJECTS TAB */}
          {activeTab === 'projects' && portfolio && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-editorial text-3xl font-semibold text-[#18181B]">Projects</h1>
                  <p className="text-sm text-[#52525B] mt-1">
                    Create, categorize, upload images for, and manage portfolio projects.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setEditingProject({
                      title: '',
                      category: '',
                      description: '',
                      projectUrl: '',
                      imageUrl: '',
                      featured: false,
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#18181B] text-[#FAF9F7] text-xs font-medium rounded-lg hover:bg-[#5E4B94] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Project</span>
                </button>
              </div>

              {editingProject && (
                <form
                  onSubmit={handleSaveProject}
                  className="bg-white border border-[#C4B5FD] rounded-2xl p-6 space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-editorial text-xl font-semibold">
                      {editingProject.id ? 'Edit Project' : 'New Project'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditingProject(null)}
                      className="p-1 text-[#71717A] hover:text-[#18181B] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Project Title</label>
                      <input
                        type="text"
                        required
                        value={editingProject.title ?? ''}
                        onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Category</label>
                      <input
                        type="text"
                        required
                        value={editingProject.category ?? ''}
                        onChange={(e) => setEditingProject({ ...editingProject, category: e.target.value })}
                        placeholder="e.g., Creative, Writing, Design"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#3F3F46] mb-1">Description</label>
                    <textarea
                      rows={4}
                      required
                      value={editingProject.description ?? ''}
                      onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block text-xs font-medium text-[#3F3F46] mb-1">Project Link (Optional)</label>
                      <input
                        type="url"
                        value={editingProject.projectUrl ?? ''}
                        onChange={(e) => setEditingProject({ ...editingProject, projectUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg"
                      />
                    </div>
                    <label className="inline-flex items-center gap-2.5 text-sm text-[#3F3F46] py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingProject.featured)}
                        onChange={(e) => setEditingProject({ ...editingProject, featured: e.target.checked })}
                        className="w-4 h-4 accent-[#5E4B94]"
                      />
                      <span>Mark as featured project</span>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-[#3F3F46]">Project Cover Image</label>
                    <div className="flex flex-wrap items-center gap-4">
                      {editingProject.imageUrl && (
                        <img
                          src={editingProject.imageUrl}
                          alt="Project preview"
                          className="w-28 h-20 object-cover rounded-lg border border-[#E6E3DF]"
                        />
                      )}
                      <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#ECE7F8] text-[#18181B] border border-[#D9CFF2] rounded-lg hover:bg-[#DFD6F4] cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-[#5E4B94]" />
                        <span>{uploadingProjectImg ? 'Uploading...' : 'Upload Image'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploadingProjectImg}
                          onChange={handleProjectImageUpload}
                          className="sr-only"
                        />
                      </label>
                      {editingProject.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setEditingProject({ ...editingProject, imageUrl: '' })}
                          className="text-xs text-[#B91C1C] hover:underline cursor-pointer"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={savingProject}
                      className="px-5 py-2 bg-[#18181B] text-white text-xs font-medium rounded-lg hover:bg-[#5E4B94] cursor-pointer"
                    >
                      {savingProject ? 'Saving...' : 'Save Project'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProject(null)}
                      className="px-4 py-2 text-xs text-[#52525B] hover:text-[#18181B] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {portfolio.projects.length === 0 ? (
                <div className="bg-white border border-[#E6E3DF] rounded-2xl p-10 text-center space-y-2">
                  <p className="font-editorial text-2xl font-semibold text-[#18181B]">No Projects Added Yet</p>
                  <p className="text-sm text-[#52525B]">
                    Public visitors currently see the upcoming-projects invitation. Click "Add Project" above whenever you are ready to publish.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {portfolio.projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="bg-white border border-[#E6E3DF] rounded-2xl overflow-hidden flex flex-col"
                    >
                      {proj.imageUrl && (
                        <img src={proj.imageUrl} alt={proj.title} className="w-full h-44 object-cover" />
                      )}
                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <p className="text-xs text-[#71717A]">
                            {proj.category}
                            {proj.featured ? ' · Featured' : ''}
                          </p>
                          <h3 className="font-editorial text-2xl font-semibold text-[#18181B] mt-1">{proj.title}</h3>
                          <p className="text-sm text-[#52525B] mt-2 line-clamp-3">{proj.description}</p>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-[#EFECE7]">
                          <button
                            type="button"
                            onClick={() => setEditingProject(proj)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#DFDBD4] rounded-lg hover:border-[#18181B] cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(proj.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#B91C1C] border border-[#FECACA] rounded-lg hover:bg-[#FEF2F2] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INBOX TAB */}
          {activeTab === 'inbox' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-editorial text-3xl font-semibold text-[#18181B]">Contact Submissions</h1>
                  <p className="text-sm text-[#52525B] mt-1">
                    Private messages submitted through the Get In Touch form.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={messageSearch}
                    onChange={(e) => handleSearchMessages(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                  />
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="bg-white border border-[#E6E3DF] rounded-2xl p-10 text-center text-sm text-[#52525B]">
                  {messageSearch ? 'No messages match your search.' : 'No contact submissions received yet.'}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`bg-white border rounded-2xl p-6 space-y-3 ${
                        msg.isRead ? 'border-[#E6E3DF]' : 'border-[#8B7BB8]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs text-[#71717A]">
                            <span className={msg.isRead ? 'text-[#71717A]' : 'text-[#5E4B94] font-semibold'}>
                              {msg.isRead ? 'Read' : 'Unread'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-tabular">{msg.createdAt}</span>
                          </div>
                          <h3 className="font-editorial text-xl font-semibold text-[#18181B] mt-1">{msg.subject}</h3>
                          <p className="text-xs text-[#52525B] mt-0.5">
                            From {msg.fullName} ({msg.email})
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleMessageRead(msg)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#DFDBD4] rounded-lg hover:border-[#18181B] cursor-pointer"
                          >
                            {msg.isRead ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                            <span>{msg.isRead ? 'Mark Unread' : 'Mark Read'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#B91C1C] border border-[#FECACA] rounded-lg hover:bg-[#FEF2F2] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-[#27272A] leading-relaxed whitespace-pre-line pt-2 border-t border-[#EFECE7]">
                        {msg.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CV & SECURITY TAB */}
          {activeTab === 'cv-security' && profileDraft && (
            <div className="space-y-8">
              <div>
                <h1 className="font-editorial text-3xl font-semibold text-[#18181B]">CV & Security</h1>
                <p className="text-sm text-[#52525B] mt-1">
                  Manage your downloadable Curriculum Vitae PDF and administrator account security.
                </p>
              </div>

              {/* CV Management */}
              <div className="bg-white border border-[#E6E3DF] rounded-2xl p-6 sm:p-8 space-y-5">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-[#5E4B94] mt-0.5" aria-hidden="true" />
                  <div>
                    <h2 className="font-editorial text-2xl font-semibold text-[#18181B]">Curriculum Vitae File</h2>
                    <p className="text-sm text-[#52525B] mt-1">
                      {profileDraft.cvFileUrl
                        ? `Currently serving uploaded PDF: ${profileDraft.cvFilename}`
                        : 'Currently serving a live auto-generated PDF built automatically from your profile, education, and languages.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#18181B] text-[#FAF9F7] rounded-lg hover:bg-[#5E4B94] transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingCv ? 'Uploading PDF...' : 'Upload Custom CV (PDF)'}</span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={uploadingCv}
                      onChange={handleCvUpload}
                      className="sr-only"
                    />
                  </label>

                  <a
                    href="/api/cv/download"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-[#ECE7F8] text-[#18181B] border border-[#D9CFF2] rounded-lg hover:bg-[#DFD6F4]"
                  >
                    <Download className="w-3.5 h-3.5 text-[#5E4B94]" />
                    <span>Download Current CV</span>
                  </a>

                  {profileDraft.cvFileUrl && (
                    <button
                      type="button"
                      onClick={handleResetCv}
                      className="px-4 py-2.5 text-xs font-medium border border-[#D9D5CE] rounded-lg hover:border-[#18181B] cursor-pointer"
                    >
                      Use Auto-Generated CV
                    </button>
                  )}
                </div>
              </div>

              {/* Password Change */}
              <form
                onSubmit={handlePasswordChange}
                className="bg-white border border-[#E6E3DF] rounded-2xl p-6 sm:p-8 space-y-5 max-w-xl"
              >
                <div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#18181B]">Change Administrator Password</h2>
                  <p className="text-xs text-[#71717A] mt-1">
                    Passwords are hashed securely with bcrypt before storage. Minimum 8 characters.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3F3F46] mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg focus:outline-none focus:border-[#5E4B94]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 bg-[#18181B] text-white text-xs font-medium rounded-lg hover:bg-[#5E4B94] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {savingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
