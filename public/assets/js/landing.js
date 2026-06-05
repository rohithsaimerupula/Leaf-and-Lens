/* ============================================
   LEAF & LENS — landing.js
   Countdown, Leaf Particles, Scroll Reveals
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();

  initNavbar();
  initCountdown();
  initScrollReveal();
  initTicker();
});

/* ── NAVBAR ── */
function initNavbar() {
  const nav = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }
}

/* ── COUNTDOWN ── */
function initCountdown() {
  const target = new Date('2026-06-05T00:00:00+05:30').getTime();
  const dEl = document.getElementById('hcd-d');
  const hEl = document.getElementById('hcd-h');
  const mEl = document.getElementById('hcd-m');
  const sEl = document.getElementById('hcd-s');
  const celebrate = document.getElementById('wedCelebrate');
  const countdownEl = document.getElementById('heroCountdown');

  if (!dEl) return;

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    const now = Date.now();
    const diff = target - now;

    if (diff <= 0) {
      // Show WED celebration
      if (countdownEl) countdownEl.style.display = 'none';
      if (celebrate) {
        celebrate.style.display = 'block';
        launchConfetti();
      }
      return;
    }

    const days  = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins  = Math.floor((diff % 3600000)  / 60000);
    const secs  = Math.floor((diff % 60000)    / 1000);

    const prev = { d: dEl.textContent, h: hEl.textContent, m: mEl.textContent, s: sEl.textContent };
    const next = { d: pad(days), h: pad(hours), m: pad(mins), s: pad(secs) };

    [['d', dEl], ['h', hEl], ['m', mEl], ['s', sEl]].forEach(([k, el]) => {
      if (prev[k] !== next[k]) {
        el.style.transform = 'translateY(-10px)';
        el.style.opacity   = '0';
        setTimeout(() => {
          el.textContent     = next[k];
          el.style.transform = 'translateY(0)';
          el.style.opacity   = '1';
        }, 150);
      }
    });

    setTimeout(tick, 1000);
  }

  // Apply transition style to number elements
  [dEl, hEl, mEl, sEl].forEach(el => {
    if (el) el.style.transition = 'transform .15s ease, opacity .15s ease';
  });

  tick();
}

/* ── WED CONFETTI ── */
function launchConfetti() {
  const colors = ['#52b788','#b7e4c7','#f4a261','#e9c46a','#ffffff','#2d6a4f'];
  for (let i = 0; i < 120; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      el.style.cssText = `
        position:fixed;top:0;left:${Math.random()*100}vw;
        width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        border-radius:${Math.random()>0.5?'50%':'2px'};
        animation:confettiFall ${2+Math.random()*3}s ease-out forwards;
        z-index:9999;pointer-events:none;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 5000);
    }, i * 30);
  }

  if (!document.getElementById('confettiStyle')) {
    const s = document.createElement('style');
    s.id = 'confettiStyle';
    s.textContent = `@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`;
    document.head.appendChild(s);
  }
}

/* ── SCROLL REVEAL ── */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => obs.observe(el));
}

/* ── TICKER DUPLICATE ── */
function initTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  // duplicate for seamless loop
  track.innerHTML += track.innerHTML;
}
