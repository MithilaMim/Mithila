import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowUpRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Mail,
  MapPin,
  Menu,
  Phone,
  Send,
  X,
  AlertCircle,
} from 'lucide-react';
import defaultPortrait from '../assets/images/mithila_portrait_1794639241032.jpg';
import { Scene3D } from '../components/Scene3D';
import { TiltCard } from '../components/TiltCard';
import { api } from '../lib/api';
import type { PortfolioData, ProjectItem } from '../types/portfolio';

gsap.registerPlugin(ScrollTrigger);

interface PortfolioPageProps {
  onNavigate: (path: string) => void;
}

export function PortfolioPage({ onNavigate }: PortfolioPageProps) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portraitFailed, setPortraitFailed] = useState(false);

  // Projects filtering & lightbox
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [failedProjectImages, setFailedProjectImages] = useState<Record<number, boolean>>({});

  // Contact form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [contactStatus, setContactStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getPortfolio()
      .then((res) => {
        if (!active) return;
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Unable to load portfolio content.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Close lightbox on ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProject(null);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // GSAP scroll parallax & section choreography
  useEffect(() => {
    if (!data || !pageRef.current) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.gsap-reveal').forEach((el) => {
        gsap.fromTo(
          el,
          { y: 24, opacity: 0.92 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 88%',
              once: true,
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>('.gsap-parallax-frame').forEach((el) => {
        gsap.to(el, {
          y: -26,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8,
          },
        });
      });
    }, pageRef);

    return () => ctx.revert();
  }, [data]);

  const categories = useMemo(() => {
    if (!data) return ['All'];
    const unique = Array.from(new Set(data.projects.map((p) => p.category)));
    return ['All', ...unique];
  }, [data]);

  const filteredProjects = useMemo(() => {
    if (!data) return [];
    if (activeCategory === 'All') return data.projects;
    return data.projects.filter((p) => p.category === activeCategory);
  }, [data, activeCategory]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setContactStatus(null);

    if (fullName.trim().length < 2) {
      setContactStatus({ type: 'error', text: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setContactStatus({ type: 'error', text: 'Please provide a valid email address.' });
      return;
    }
    if (subject.trim().length < 2) {
      setContactStatus({ type: 'error', text: 'Please enter a subject for your message.' });
      return;
    }
    if (message.trim().length < 10) {
      setContactStatus({ type: 'error', text: 'Please write a message of at least 10 characters.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitContact({
        fullName: fullName.trim(),
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      setContactStatus({ type: 'success', text: res.message });
      setFullName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setContactStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to send your message right now.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#5E4B94] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#52525B] tracking-wide">Loading portfolio</p>
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white border border-[#E6E3DF] p-8 rounded-2xl text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-[#B91C1C] mx-auto" />
          <h1 className="font-editorial text-2xl font-semibold text-[#18181B]">Unable to load portfolio</h1>
          <p className="text-sm text-[#52525B]">{loadError || 'Please refresh the page to try again.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-[#18181B] text-[#FAF9F7] text-sm font-medium rounded-lg hover:bg-[#5E4B94] transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  const { profile, education, skills, projects } = data;
  const portraitSrc =
    !profile.profilePhotoUrl || profile.profilePhotoUrl === 'default'
      ? defaultPortrait
      : profile.profilePhotoUrl;

  return (
    <div ref={pageRef} className="relative min-h-screen bg-[#FAF9F7] text-[#18181B] overflow-x-hidden">
      {/* Subtle Interactive 3D Backdrop */}
      <div className="fixed inset-0 z-0 opacity-70">
        <Scene3D className="w-full h-full" />
      </div>

      {/* Top Navigation Bar — Strictly 3 zones, single-line controls, solid surface (no backdrop-blur over WebGL) */}
      <header className="sticky top-0 z-40 bg-[#FAF9F7] border-b border-[#E6E3DF]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-editorial text-xl font-semibold tracking-tight text-[#18181B] whitespace-nowrap shrink-0"
          >
            Mithila Mim
          </a>

          {/* Zone 2: 5 concise single-line text links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#52525B]" aria-label="Primary">
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="hover:text-[#18181B] hover:underline underline-offset-4 decoration-[#8B7BB8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('education')}
              className="hover:text-[#18181B] hover:underline underline-offset-4 decoration-[#8B7BB8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Education
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('skills')}
              className="hover:text-[#18181B] hover:underline underline-offset-4 decoration-[#8B7BB8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Skills
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('projects')}
              className="hover:text-[#18181B] hover:underline underline-offset-4 decoration-[#8B7BB8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Projects
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className="hover:text-[#18181B] hover:underline underline-offset-4 decoration-[#8B7BB8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Contact
            </button>
          </nav>

          {/* Zone 3: 1 primary action + mobile menu trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="/api/cv/download"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#18181B] text-[#FAF9F7] rounded-lg hover:bg-[#5E4B94] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5E4B94]"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download CV</span>
            </a>

            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2.5 text-[#18181B] border border-[#E6E3DF] rounded-lg bg-white hover:bg-[#F3F1EE] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="md:hidden bg-[#FAF9F7] border-t border-[#E6E3DF] px-6 py-4 space-y-2"
            >
              {[
                { label: 'About', id: 'about' },
                { label: 'Education', id: 'education' },
                { label: 'Skills', id: 'skills' },
                { label: 'Projects', id: 'projects' },
                { label: 'Contact', id: 'contact' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left py-2.5 text-sm font-medium text-[#18181B] border-b border-[#EFECE7] last:border-b-0"
                >
                  {item.label}
                </button>
              ))}
              <a
                href="/api/cv/download"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[#18181B] text-[#FAF9F7] rounded-lg"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download CV</span>
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main id="top" className="relative z-10">
        {/* HERO SECTION */}
        <section className="max-w-[1200px] mx-auto px-6 py-16 lg:py-24 min-h-[72vh] flex items-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center w-full">
            {/* Typographic Hierarchy (3D sculpture occupies the open right space) */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-8 flex flex-col justify-center bg-[#FAF9F7]/92 lg:bg-transparent p-2 lg:p-0 rounded-2xl"
            >
              <p className="text-sm font-medium text-[#5E4B94] tracking-wide mb-4">
                {profile.subtitle}
              </p>

              <h1 className="font-editorial text-[clamp(2.5rem,4.6vw,4.35rem)] font-semibold leading-[1.06] tracking-[0.015em] text-[#18181B] [text-wrap:balance] mb-6 uppercase">
                {profile.fullName}
              </h1>

              <p className="text-base sm:text-lg text-[#3F3F46] leading-[1.7] max-w-[58ch] mb-9">
                {profile.heroDescription}
              </p>

              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => scrollToSection('projects')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-[#18181B] text-[#FAF9F7] rounded-lg hover:bg-[#5E4B94] transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5E4B94]"
                >
                  <span>View My Portfolio</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <a
                  href="/api/cv/download"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-[#ECE7F8] text-[#18181B] border border-[#D9CFF2] rounded-lg hover:bg-[#DFD6F4] transition-colors duration-200 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5E4B94]"
                >
                  <Download className="w-4 h-4 text-[#5E4B94]" aria-hidden="true" />
                  <span>Download My CV</span>
                </a>

                <button
                  type="button"
                  onClick={() => scrollToSection('contact')}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-white text-[#18181B] border border-[#D9D5CE] rounded-lg hover:border-[#18181B] transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5E4B94]"
                >
                  <span>Contact Me</span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Subtle Editorial Divider */}
        <div className="border-y border-[#E6E3DF] bg-[#F3F1EE]">
          <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-[#52525B]">
            <span>Portfolio & Curriculum Vitae</span>
            <span aria-hidden="true">·</span>
            <span>{profile.location}</span>
            <span aria-hidden="true">·</span>
            <span>{profile.availability}</span>
          </div>
        </div>

        {/* 01. ABOUT ME SECTION */}
        <section id="about" className="gsap-reveal max-w-[1200px] mx-auto px-6 py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-4 space-y-6">
              <div>
                <p className="font-tabular text-xs text-[#5E4B94] tracking-wide mb-2">01. About Me</p>
                <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#18181B] leading-tight [text-wrap:balance]">
                  Dedicated to Growth & Integrity
                </h2>
              </div>

              <div className="gsap-parallax-frame relative aspect-[3/4] max-w-[300px] rounded-2xl overflow-hidden border border-[#E4E0D8] bg-[#ECE8F4]">
                {!portraitFailed ? (
                  <img
                    src={portraitSrc}
                    alt={`${profile.fullName} portrait`}
                    referrerPolicy="no-referrer"
                    onError={() => setPortraitFailed(true)}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#EFEBF8] to-[#E6E2DC] p-6 text-center">
                    <span className="font-editorial text-4xl font-semibold text-[#5E4B94] mb-1">M.M.</span>
                    <span className="text-xs text-[#52525B]">{profile.fullName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white border border-[#E6E3DF] rounded-2xl p-7 sm:p-9 space-y-6">
                <p className="text-base sm:text-lg text-[#27272A] leading-[1.75]">
                  {profile.aboutBio}
                </p>

                <div className="pt-6 border-t border-[#EFECE7]">
                  <h3 className="text-xs font-semibold tracking-wide text-[#5E4B94] mb-2">
                    Career Objective
                  </h3>
                  <p className="text-sm sm:text-base text-[#52525B] leading-[1.7]">
                    {profile.careerObjective}
                  </p>
                </div>
              </div>

              {/* Clean Personal Information Grid (No cards-within-cards, hairline separation) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 pt-2">
                <div className="pb-4 border-b border-[#E6E3DF]">
                  <dt className="text-xs text-[#71717A] mb-1">Full Name</dt>
                  <dd className="text-sm font-medium text-[#18181B]">{profile.fullName}</dd>
                </div>
                <div className="pb-4 border-b border-[#E6E3DF]">
                  <dt className="text-xs text-[#71717A] mb-1">Location</dt>
                  <dd className="text-sm font-medium text-[#18181B]">{profile.location}</dd>
                </div>
                <div className="pb-4 border-b border-[#E6E3DF]">
                  <dt className="text-xs text-[#71717A] mb-1">Nationality</dt>
                  <dd className="text-sm font-medium text-[#18181B]">{profile.nationality}</dd>
                </div>
                <div className="pb-4 border-b border-[#E6E3DF]">
                  <dt className="text-xs text-[#71717A] mb-1">Availability</dt>
                  <dd className="text-sm font-medium text-[#18181B]">{profile.availability}</dd>
                </div>
                {profile.contactEmail && (
                  <div className="pb-4 border-b border-[#E6E3DF]">
                    <dt className="text-xs text-[#71717A] mb-1">Email</dt>
                    <dd className="text-sm font-medium text-[#18181B] break-all">{profile.contactEmail}</dd>
                  </div>
                )}
                {profile.contactPhone && (
                  <div className="pb-4 border-b border-[#E6E3DF]">
                    <dt className="text-xs text-[#71717A] mb-1">Phone</dt>
                    <dd className="text-sm font-medium text-[#18181B] font-tabular">{profile.contactPhone}</dd>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 02. EDUCATION SECTION */}
        <section id="education" className="gsap-reveal border-t border-[#E6E3DF] bg-[#F3F1EE]/75">
          <div className="max-w-[1200px] mx-auto px-6 py-20 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-4">
                <p className="font-tabular text-xs text-[#5E4B94] tracking-wide mb-2">02. Education</p>
                <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#18181B] leading-tight [text-wrap:balance]">
                  Academic Foundation
                </h2>
                <p className="text-sm text-[#52525B] mt-3 leading-relaxed">
                  Verified academic credentials and examination records.
                </p>
              </div>

              <div className="lg:col-span-8">
                {education.length === 0 ? (
                  <div className="bg-white border border-[#E6E3DF] rounded-2xl p-8 text-sm text-[#52525B]">
                    Education records will appear here once added.
                  </div>
                ) : (
                  <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-[7px] before:top-3 before:bottom-3 before:w-[1px] before:bg-[#D8D3CC]">
                    {education.map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.4, delay: idx * 0.08 }}
                        className="relative bg-white border border-[#E6E3DF] rounded-2xl p-6 sm:p-7 hover:border-[#C4B5FD] transition-colors duration-200"
                      >
                        {/* Timeline node */}
                        <span
                          aria-hidden="true"
                          className="absolute -left-[23px] sm:-left-[31px] top-8 w-3 h-3 rounded-full bg-[#FAF9F7] border-2 border-[#5E4B94]"
                        />

                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                          <h3 className="font-editorial text-2xl font-semibold text-[#18181B]">
                            {item.degree} – <span className="font-tabular text-xl">{item.year}</span>
                          </h3>
                          <span className="font-tabular text-sm font-medium text-[#5E4B94]">
                            GPA: {item.gpa}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#52525B]">
                          <span>Group: {item.studyGroup}</span>
                          <span aria-hidden="true">·</span>
                          <span>Board: {item.board}</span>
                          {item.institution && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{item.institution}</span>
                            </>
                          )}
                        </div>

                        {item.notes && (
                          <p className="mt-3 text-xs text-[#71717A] leading-relaxed">{item.notes}</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 03. SKILLS & LANGUAGES SECTION */}
        <section id="skills" className="gsap-reveal max-w-[1200px] mx-auto px-6 py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-4">
              <p className="font-tabular text-xs text-[#5E4B94] tracking-wide mb-2">03. Skills & Languages</p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#18181B] leading-tight [text-wrap:balance]">
                Languages & Core Capabilities
              </h2>
              <p className="text-sm text-[#52525B] mt-3 leading-relaxed">
                Communication abilities and developing competencies maintained directly through the portfolio workspace.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {skills.length === 0 ? (
                <div className="sm:col-span-2 bg-white border border-[#E6E3DF] rounded-2xl p-8 text-sm text-[#52525B]">
                  No skills or languages listed yet.
                </div>
              ) : (
                skills.map((skill, idx) => (
                  <motion.div
                    key={skill.id}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.35, delay: idx * 0.06 }}
                  >
                    <TiltCard className="h-full bg-white border border-[#E6E3DF] rounded-2xl p-6 hover:border-[#B6A5E2] transition-colors duration-200">
                      <div className="flex items-baseline justify-between gap-3 mb-2">
                        <span className="text-xs text-[#71717A]">{skill.category}</span>
                        <span className="text-xs font-medium text-[#5E4B94]">{skill.proficiency}</span>
                      </div>
                      <h3 className="font-editorial text-2xl font-semibold text-[#18181B] mb-2">
                        {skill.name}
                      </h3>
                      {skill.description && (
                        <p className="text-sm text-[#52525B] leading-relaxed">{skill.description}</p>
                      )}
                    </TiltCard>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 04. PROJECTS SECTION */}
        <section id="projects" className="gsap-reveal border-t border-[#E6E3DF] bg-[#F3F1EE]/75">
          <div className="max-w-[1200px] mx-auto px-6 py-20 lg:py-24">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="font-tabular text-xs text-[#5E4B94] tracking-wide mb-2">04. Projects</p>
                <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#18181B] leading-tight [text-wrap:balance]">
                  Selected Work & Upcoming Projects
                </h2>
              </div>

              {projects.length > 0 && categories.length > 1 && (
                <div className="flex flex-wrap items-center gap-1 p-1 bg-[#E8E4DF] rounded-lg self-start md:self-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeCategory === cat
                          ? 'bg-white text-[#18181B] shadow-xs'
                          : 'text-[#52525B] hover:text-[#18181B]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {projects.length === 0 ? (
              <div className="bg-white border border-[#E6E3DF] rounded-2xl p-10 sm:p-14 text-center max-w-3xl mx-auto">
                <p className="text-xs font-medium text-[#5E4B94] tracking-wide mb-3">
                  Curated Gallery
                </p>
                <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#18181B] mb-3 [text-wrap:balance]">
                  Upcoming Projects Are on the Horizon
                </h3>
                <p className="text-sm sm:text-base text-[#52525B] leading-relaxed max-w-xl mx-auto mb-7">
                  This space is dedicated to showcasing future creative work, learning initiatives, and personal projects as they are completed. Thank you for visiting—feel free to check back soon or reach out directly.
                </p>
                <button
                  type="button"
                  onClick={() => scrollToSection('contact')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#18181B] text-[#FAF9F7] rounded-lg hover:bg-[#5E4B94] transition-colors cursor-pointer"
                >
                  <span>Connect With Me</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project, idx) => (
                  <motion.article
                    key={project.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.4, delay: idx * 0.06 }}
                  >
                    <TiltCard
                      onClick={() => setSelectedProject(project)}
                      className="group h-full bg-white border border-[#E6E3DF] rounded-2xl overflow-hidden cursor-pointer hover:border-[#B6A5E2] transition-colors duration-200 flex flex-col"
                    >
                      <div className="aspect-[4/3] w-full bg-[#ECE8F4] overflow-hidden relative">
                        {project.imageUrl && !failedProjectImages[project.id] ? (
                          <img
                            src={project.imageUrl}
                            alt={project.title}
                            referrerPolicy="no-referrer"
                            onError={() =>
                              setFailedProjectImages((prev) => ({ ...prev, [project.id]: true }))
                            }
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EDE9F6] to-[#E6E2DC] p-6 text-center">
                            <span className="font-editorial text-2xl font-semibold text-[#5E4B94]">
                              {project.title}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 text-xs text-[#71717A] mb-2">
                          <span>{project.category}</span>
                          {project.featured && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#5E4B94] font-medium">Featured</span>
                            </>
                          )}
                        </div>
                        <h3 className="font-editorial text-2xl font-semibold text-[#18181B] mb-2 group-hover:text-[#5E4B94] transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-sm text-[#52525B] leading-relaxed line-clamp-3 flex-1">
                          {project.description}
                        </p>
                      </div>
                    </TiltCard>
                  </motion.article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 05. CONTACT SECTION */}
        <section id="contact" className="gsap-reveal max-w-[1200px] mx-auto px-6 py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div>
                <p className="font-tabular text-xs text-[#5E4B94] tracking-wide mb-2">05. Contact</p>
                <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#18181B] leading-tight [text-wrap:balance]">
                  Get In Touch
                </h2>
                <p className="text-sm sm:text-base text-[#52525B] mt-3 leading-relaxed">
                  I welcome opportunities for entry-level roles, learning programs, and professional conversations. Send a message anytime using the form.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#E6E3DF]">
                {profile.contactEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-[#5E4B94] mt-1 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-[#71717A]">Email</p>
                      <a
                        href={`mailto:${profile.contactEmail}`}
                        className="text-sm font-medium text-[#18181B] hover:text-[#5E4B94] transition-colors break-all"
                      >
                        {profile.contactEmail}
                      </a>
                    </div>
                  </div>
                )}

                {profile.contactPhone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-[#5E4B94] mt-1 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-[#71717A]">Phone</p>
                      <p className="text-sm font-medium text-[#18181B] font-tabular">{profile.contactPhone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#5E4B94] mt-1 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-[#71717A]">Location</p>
                    <p className="text-sm font-medium text-[#18181B]">{profile.location}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <form
                onSubmit={handleContactSubmit}
                noValidate
                className="bg-white border border-[#E6E3DF] rounded-2xl p-6 sm:p-8 space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-fullName" className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="contact-fullName"
                      type="text"
                      required
                      maxLength={120}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#5E4B94] transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#5E4B94] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    required
                    maxLength={180}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Reason for reaching out"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#5E4B94] transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-xs font-medium text-[#3F3F46] mb-1.5">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    maxLength={4000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message here..."
                    className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F7] border border-[#DFDBD4] rounded-lg text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#5E4B94] transition-colors resize-y"
                  />
                </div>

                {contactStatus && (
                  <div
                    role="status"
                    className={`flex items-start gap-2.5 p-3.5 rounded-lg text-sm border ${
                      contactStatus.type === 'success'
                        ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                        : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    }`}
                  >
                    {contactStatus.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                    )}
                    <span>{contactStatus.text}</span>
                  </div>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium bg-[#18181B] text-[#FAF9F7] rounded-lg hover:bg-[#5E4B94] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                    <span>{submitting ? 'Sending Message...' : 'Send Message'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[#E6E3DF] bg-[#18181B] text-[#FAF9F7]">
        <div className="max-w-[1200px] mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-[#2E2E35]">
            <div className="md:col-span-6 space-y-3">
              <p className="font-editorial text-2xl font-semibold tracking-wide uppercase">
                {profile.fullName}
              </p>
              <p className="text-sm text-[#D4D4D8] max-w-md leading-relaxed">
                "{profile.footerQuote}"
              </p>
            </div>

            <div className="md:col-span-3 space-y-2.5">
              <p className="text-xs font-semibold text-[#C4B5FD] tracking-wide">Navigation</p>
              <ul className="space-y-2 text-sm text-[#D4D4D8]">
                <li>
                  <button type="button" onClick={() => scrollToSection('about')} className="hover:text-white cursor-pointer">
                    About Me
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('education')} className="hover:text-white cursor-pointer">
                    Education
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('skills')} className="hover:text-white cursor-pointer">
                    Skills & Languages
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('projects')} className="hover:text-white cursor-pointer">
                    Projects
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('contact')} className="hover:text-white cursor-pointer">
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2.5">
              <p className="text-xs font-semibold text-[#C4B5FD] tracking-wide">Contact</p>
              <div className="space-y-2 text-sm text-[#D4D4D8]">
                {profile.contactEmail && <p className="break-all">{profile.contactEmail}</p>}
                {profile.contactPhone && <p className="font-tabular">{profile.contactPhone}</p>}
                <p>{profile.location}</p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A1A1AA]">
            <p>© {new Date().getFullYear()} {profile.fullName}. All rights reserved.</p>
            <a
              href="/admin"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/admin');
              }}
              className="text-[#A1A1AA] hover:text-[#E4DCF5] transition-colors"
            >
              Admin
            </a>
          </div>
        </div>
      </footer>

      {/* Project Lightbox Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#18181B]/80 flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedProject(null)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lightbox-title"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#FAF9F7] border border-[#E6E3DF] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E3DF]">
                <span className="text-xs text-[#5E4B94] font-medium">{selectedProject.category}</span>
                <button
                  type="button"
                  onClick={() => setSelectedProject(null)}
                  aria-label="Close project details"
                  className="p-2 rounded-lg text-[#52525B] hover:text-[#18181B] hover:bg-[#EFECE7] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedProject.imageUrl && !failedProjectImages[selectedProject.id] && (
                <div className="aspect-[16/10] w-full bg-[#ECE8F4]">
                  <img
                    src={selectedProject.imageUrl}
                    alt={selectedProject.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-6 sm:p-8 space-y-4">
                <h3 id="lightbox-title" className="font-editorial text-3xl font-semibold text-[#18181B]">
                  {selectedProject.title}
                </h3>
                <p className="text-sm sm:text-base text-[#3F3F46] leading-[1.7] whitespace-pre-line">
                  {selectedProject.description}
                </p>

                {selectedProject.projectUrl && (
                  <div className="pt-3">
                    <a
                      href={selectedProject.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#18181B] text-[#FAF9F7] rounded-lg hover:bg-[#5E4B94] transition-colors"
                    >
                      <span>View Project</span>
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
