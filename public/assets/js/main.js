// main.js — Leaf & Lens Shared Utilities

// ── STORAGE HELPERS ──────────────────────────────
const LL = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
  getSubmissions: () => LL.get('ll_submissions') || [],
  saveSubmissions: (arr) => LL.set('ll_submissions', arr),
  getLikes: () => LL.get('ll_gallery_likes') || {},
  getResults: () => LL.get('ll_results') || [],
  getSettings: () => LL.get('ll_settings') || { resultsPublic: false, competitionActive: true },
  saveSettings: (s) => LL.set('ll_settings', s),
  isAdminLoggedIn: () => !!sessionStorage.getItem('ll_admin_session'),
  adminLogin: () => sessionStorage.setItem('ll_admin_session', 'authenticated'),
  adminLogout: () => sessionStorage.removeItem('ll_admin_session'),
  getPledgeCount: () => LL.get('ll_pledge_count') || 0,
  addPledge: () => LL.set('ll_pledge_count', (LL.getPledgeCount() + 1))
};

// ── SUBMISSION ID GENERATOR ───────────────────────
function generateSubmissionId() {
  const subs = LL.getSubmissions();
  const num = String(subs.length + 1).padStart(4, '0');
  return `LL-2026-${num}`;
}

// ── TOAST NOTIFICATIONS ───────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── SCROLL REVEAL ─────────────────────────────────
function initReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}

// ── LUCIDE ICONS INIT ─────────────────────────────
function initIcons() {
  if (window.lucide) lucide.createIcons();
}

// ── COUNTER ANIMATION ─────────────────────────────
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const step = 16;
  const steps = duration / step;
  const increment = target / steps;
  let current = 0;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = (Number.isInteger(target) ? Math.floor(current) : current.toFixed(1)) + suffix;
  }, step);
}

function initCounters() {
  const els = document.querySelectorAll('.stat-number');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { animateCounter(e.target); obs.unobserve(e.target); }
    });
  }, { threshold: 0.3 });
  els.forEach(el => obs.observe(el));
}

// ── NAVBAR SCROLL ─────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const wedBanner = document.getElementById('wedBanner');
  const fab = document.getElementById('fab');
  if (!navbar) return;

  const bannerH = wedBanner ? wedBanner.offsetHeight : 0;
  navbar.style.top = bannerH + 'px';

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 60;
    navbar.classList.toggle('scrolled', scrolled);
    if (fab) fab.classList.toggle('visible', window.scrollY > 400);
  });

  // Hamburger
  const burger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (burger && navLinks) {
    burger.addEventListener('click', () => navLinks.classList.toggle('open'));
  }
}

// ── PLEDGE COUNTER ────────────────────────────────
function initPledge() {
  const el = document.getElementById('pledgeCount');
  const bar = document.getElementById('pledgeBarFill');
  if (!el) return;
  const count = LL.getPledgeCount();
  el.textContent = count;
  if (bar) bar.style.width = Math.min((count / 500) * 100, 100) + '%';
}

// ── FORMAT DATE ───────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── FILE TO BASE64 ────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── EXPORT CSV ────────────────────────────────────
function exportCSV(data, filename) {
  if (!data.length) return showToast('No data to export', 'error');
  const headers = ['ID', 'Name', 'Email', 'Phone', 'Roll No', 'Branch', 'Year', 'Category', 'Instagram', 'Caption', 'Status', 'Submitted At'];
  const rows = data.map(s => [
    s.id, s.name, s.email, s.phone,
    s.rollNum || '', s.branch || '', s.yearOfStudy ? `Year ${s.yearOfStudy}` : '',
    s.category, s.instagram || '', `"${(s.caption || '').replace(/"/g, '""')}"`,
    s.status, s.submittedAt
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'leaf_lens_participants.csv';
  a.click(); URL.revokeObjectURL(url);
  showToast('CSV exported successfully!', 'success');
}

// ── ON DOM READY ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initNavbar();
  initReveal();
  initCounters();
  initPledge();
});

window.LL = LL;
window.showToast = showToast;
window.generateSubmissionId = generateSubmissionId;
window.formatDate = formatDate;
window.fileToBase64 = fileToBase64;
window.exportCSV = exportCSV;
