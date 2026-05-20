'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { db, Submission, Winner, DynamicSettings, CoordinatorsData } from '@/lib/db';
import { calculateEventStatus, EventStatusDetails } from '@/lib/timer';
import LoadingScreen from '@/components/LoadingScreen';
import CursorTrail from '@/components/CursorTrail';
import AmbientMusic from '@/components/AmbientMusic';
import LeafParticles from '@/components/LeafParticles';
import { 
  Camera, Film, Trophy, Compass, ShieldAlert, Award, Calendar, 
  MapPin, CheckCircle, Mail, Phone, ExternalLink, RefreshCw, AlertCircle, MessageSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Home() {
  const [settings, setSettings] = useState<DynamicSettings>({
    regStartDate: "2026-05-20",
    regEndDate: "2026-05-26",
    resultsPublic: false,
    resultDate: "2026-06-05"
  });
  const [status, setStatus] = useState<EventStatusDetails | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [coordinators, setCoordinators] = useState<CoordinatorsData | null>(null);

  // Ticking countdown states
  const [days, setDays] = useState('00');
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');

  // Stats Counters
  const [regCount, setRegCount] = useState(0);
  const [teamCount, setTeamCount] = useState(0);

  // Sound and active states
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('home');

  // Helper to format dates dynamically
  const formatDisplayDate = (dateStr: string) => {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      if (isNaN(d.getTime())) return dateStr;
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day < 10 ? '0' + day : day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  useEffect(() => {
    // Load Settings and calculate status
    async function loadData() {
      const s = await db.getSettings();
      setSettings(s);
      setStatus(calculateEventStatus(s));

      const w = await db.getWinners();
      setWinners(w);

      const coords = await db.getCoordinators();
      setCoordinators(coords);

      const allSubs = await db.getSubmissions();
      setSubmissions(allSubs);
      
      // Calculate animated counters fallback
      const totalRegs = allSubs.length;
      const totalTeams = allSubs.filter(x => x.member2Name).length + (totalRegs - allSubs.filter(x => x.member2Name).length);
      
      // Dynamic counter speed-up effect
      let currRegs = 0;
      let currTeams = 0;
      const targetRegs = Math.max(totalRegs, 85); // fallback default to look aesthetic if 0
      const targetTeams = Math.max(totalTeams, 52);

      const interval = setInterval(() => {
        if (currRegs < targetRegs) {
          currRegs += 1;
          setRegCount(currRegs);
        }
        if (currTeams < targetTeams) {
          currTeams += 1;
          setTeamCount(currTeams);
        }
        if (currRegs >= targetRegs && currTeams >= targetTeams) {
          clearInterval(interval);
        }
      }, 20);
    }
    loadData();

    // Scroll listener for sticky navbar & Active sections
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      const sections = ['home', 'about', 'rules', 'timeline', 'gallery', 'prize', 'coordinators', 'contact'];
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120 && rect.bottom >= 120) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!settings) return;

    const timerInterval = setInterval(() => {
      const now = new Date();
      const start = new Date(settings.regStartDate + 'T00:00:00');
      const end = new Date(settings.regEndDate + 'T23:59:59');
      const result = new Date(settings.resultDate + 'T00:00:00');

      let target = result.getTime();
      if (now < start) {
        target = start.getTime();
      } else if (now >= start && now <= end) {
        target = end.getTime();
      }

      const diff = target - now.getTime();

      if (diff <= 0) {
        setDays('00');
        setHours('00');
        setMinutes('00');
        setSeconds('00');
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        setDays(d.toString().padStart(2, '0'));
        setHours(h.toString().padStart(2, '0'));
        setMinutes(m.toString().padStart(2, '0'));
        setSeconds(s.toString().padStart(2, '0'));
      }
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [settings]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#4ADE80', '#14532D', '#7C5AA6', '#0A57A5']
    });
  };

  return (
    <div className="relative min-h-screen text-slate-100 font-sans selection:bg-neon selection:text-black">
      {/* Loading Shutter screen */}
      <LoadingScreen />

      {/* Floating Ambient controls & cursor trail */}
      <CursorTrail />
      <AmbientMusic />

      {/* FIXED TRANSPARENT BLUR NAVBAR */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'py-4 bg-bg-dark/85 backdrop-blur-md border-b border-neon/10' 
            : 'py-6 bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:rotate-12 transition-transform duration-300">🌿</span>
            <div className="font-outfit">
              <span className="font-black text-xl tracking-tight text-white">Leaf <span className="text-neon">&</span> Lens</span>
              <span className="block text-[9px] tracking-widest text-emerald-400/60 uppercase font-mono">BS&H DEPT · VIIT</span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-8 font-outfit text-sm font-semibold tracking-wide">
            {['Home', 'About', 'Rules', 'Timeline', 'Gallery', 'Coordinators', 'Contact'].map((sec) => {
              const id = sec.toLowerCase();
              return (
                <a
                  key={sec}
                  href={`#${id}`}
                  className={`relative transition-colors duration-300 ${
                    activeSection === id ? 'text-neon' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {sec}
                  {activeSection === id && (
                    <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-neon rounded-full shadow-[0_0_8px_#4ADE80]" />
                  )}
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/register"
              className={`px-5 py-2.5 rounded-full font-outfit text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${
                status?.isLive 
                  ? 'bg-neon text-black border-neon hover:bg-transparent hover:text-neon shadow-[0_0_15px_rgba(74,222,128,0.35)]'
                  : 'bg-transparent text-slate-500 border-slate-800 pointer-events-none'
              }`}
            >
              {status?.isLive ? 'Register Now' : 'Closed'}
            </Link>
          </div>
        </div>
      </nav>

      {/* FULLSCREEN CINEMATIC HERO SECTION */}
      <section id="home" className="relative h-screen flex flex-col justify-center items-center overflow-hidden">
        {/* Parallax loop Video Background */}
        <div className="absolute inset-0 z-0 bg-black">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-35 scale-105 pointer-events-none"
            src="https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c05c363d2745330e704e67d2685718df&profile_id=139&oauth2_token_id=57447761"
          />
          {/* Ambient forest mist layers */}
          <div className="ambient-fog" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-bg-dark/70" />
        </div>

        {/* Floating animated leaf particles */}
        <LeafParticles />

        {/* Center content box */}
        <div className="relative z-10 text-center max-w-4xl px-6 flex flex-col items-center">
          {status && (
            <div className={`px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest font-mono mb-4 animate-bounce ${status.badgeClass}`}>
              {status.badgeText}
            </div>
          )}

          <span className="text-xs uppercase tracking-[0.3em] font-mono text-neon font-black mb-1 animate-pulse">
            🌍 Vignan's Institute of Information Technology
          </span>
          <h1 className="text-5xl md:text-8xl font-black font-outfit tracking-tighter uppercase leading-none text-white mb-2">
            LEAF <span className="text-neon neon-text-glow font-light">&</span> LENS
          </h1>
          <p className="text-lg md:text-xl font-light tracking-widest text-emerald-300 font-mono mb-8 uppercase">
            See Green. Capture Change.
          </p>

          {status && (
            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400/70 mb-3 block animate-pulse">
              {status.status === 'Opening Soon' 
                ? '⏳ Launching in' 
                : status.status === 'Live' 
                  ? '⚡ Submissions close in' 
                  : '🏆 Results announcement in'}
            </span>
          )}

          {/* TIMER DESIGN: Glassmorphism glowing ticking timer cards */}
          <div className="grid grid-cols-4 gap-3 md:gap-6 mb-12 max-w-lg w-full">
            {[
              { label: 'Days', val: days },
              { label: 'Hours', val: hours },
              { label: 'Min', val: minutes },
              { label: 'Sec', val: seconds }
            ].map((t) => (
              <div key={t.label} className="glass-panel border-neon/20 p-4 rounded-xl flex flex-col items-center relative overflow-hidden group shadow-[0_0_20px_rgba(0,0,0,0.4)]">
                <div className="absolute inset-0 bg-gradient-to-t from-neon/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="text-3xl md:text-5xl font-black font-outfit text-white tracking-tight leading-none mb-1 text-neon neon-text-glow">
                  {t.val}
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400/50">
                  {t.label}
                </span>
              </div>
            ))}
          </div>

          {/* 3 HERO BUTTONS: Hover glow, magnetic focus feel */}
          <div className="flex flex-wrap gap-4 justify-center items-center w-full">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-neon text-black rounded-full font-outfit font-bold uppercase tracking-wider text-sm transition-all duration-300 hover:bg-transparent hover:text-neon border border-neon hover:shadow-[0_0_30px_rgba(74,222,128,0.5)] flex items-center gap-2"
            >
              <Compass className="w-5 h-5" /> Register & Submit
            </Link>
            <a
              href="#gallery"
              className="px-8 py-3.5 bg-transparent text-slate-100 rounded-full font-outfit font-bold uppercase tracking-wider text-sm border border-slate-700 hover:border-white transition-all duration-300 flex items-center gap-2"
            >
              <Film className="w-4 h-4" /> Explore Gallery
            </a>
            <Link
              href="/admin"
              className="px-8 py-3.5 bg-purple/10 text-purple-300 rounded-full font-outfit font-bold uppercase tracking-wider text-sm border border-purple/30 hover:bg-purple/20 hover:border-purple-400 transition-all duration-300 flex items-center gap-2 shadow-[0_0_20px_rgba(124,90,166,0.15)]"
            >
              <Trophy className="w-4 h-4" /> Admin Portal
            </Link>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION: Split nature-tech layout with counters */}
      <section id="about" className="relative py-24 bg-bg-dark border-t border-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative group">
            {/* Cinematic visual card stack */}
            <div className="absolute -inset-1 bg-gradient-to-r from-neon to-purple rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <div className="relative glass-panel rounded-2xl overflow-hidden aspect-[4/3] border-neon/10">
              <img
                src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1000"
                alt="Environmental Photography"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="px-3 py-1 bg-neon/15 border border-neon/30 text-neon rounded-full text-[10px] uppercase font-mono tracking-widest">BS&H Department</span>
                <h3 className="font-playfair text-2xl font-bold mt-2 text-white">Vignan's Institute of Information Technology</h3>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <span className="text-xs uppercase tracking-widest font-mono text-neon font-black">
              🌿 About the Competition
            </span>
            <h2 className="text-4xl md:text-5xl font-black font-outfit uppercase tracking-tight text-white leading-tight">
              Capturing nature through mobile storytelling.
            </h2>
            <p className="text-slate-300 text-lg leading-relaxed font-light">
              Leaf & Lens is a creative environmental photography and reels competition organized for <strong>first-year students</strong> to celebrate nature through the power of mobile cameras.
            </p>
            <p className="text-slate-400 leading-relaxed font-light">
              We challenge you to seek out and frame the micro-ecosystems and resilient green spaces on campus—the unnoticed moss scaling a concrete ledge, alpine pockets, or beautiful dewdrops. Turn your lens into a tool for environmental advocacy!
            </p>

            {/* Counters */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-900">
              <div className="text-center lg:text-left">
                <span className="block text-4xl font-extrabold font-outfit text-neon neon-text-glow">
                  {regCount}
                </span>
                <span className="text-xs font-mono text-slate-500 uppercase tracking-wider mt-1 block">Registrations</span>
              </div>
              <div className="text-center lg:text-left">
                <span className="block text-4xl font-extrabold font-outfit text-neon neon-text-glow">
                  {teamCount}
                </span>
                <span className="text-xs font-mono text-slate-500 uppercase tracking-wider mt-1 block">Teams Participating</span>
              </div>
              <div className="text-center lg:text-left">
                <span className="block text-4xl font-extrabold font-outfit text-neon neon-text-glow">
                  2
                </span>
                <span className="text-xs font-mono text-slate-500 uppercase tracking-wider mt-1 block">Categories</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMPETITION CATEGORIES */}
      <section id="rules" className="py-24 bg-black/60 relative">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <span className="text-xs uppercase tracking-widest font-mono text-neon font-black">
            📷 Category Guidelines
          </span>
          <h2 className="text-4xl md:text-5xl font-black font-outfit uppercase tracking-tight text-white mt-2 mb-16">
            Two Creative Arenas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* CARD 1: PHOTO */}
            <div className="glass-panel hover:border-neon/40 hover:shadow-[0_0_30px_rgba(74,222,128,0.15)] rounded-2xl p-8 flex flex-col items-center group transition-all duration-500 relative overflow-hidden neon-border-glow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-neon/5 rounded-bl-full pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-neon/10 text-neon flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black font-outfit text-white uppercase mb-2">Photography Category</h3>
              <p className="text-emerald-300/60 font-mono text-xs uppercase mb-6">Entry Fee: ₹30 Individual / ₹50 Team</p>
              
              <ul className="text-left w-full space-y-3 border-t border-slate-900 pt-6">
                {[
                  'Mobile photography only',
                  'Original photos only',
                  'No AI-generated images',
                  'No editing or digital manipulation',
                  'JPG / PNG format',
                  'No watermark allowed',
                  'Nature / Environment theme only'
                ].map((rule) => (
                  <li key={rule} className="flex items-start gap-2.5 text-sm text-slate-300 font-light">
                    <span className="text-neon mt-0.5">✓</span> {rule}
                  </li>
                ))}
              </ul>
            </div>

            {/* CARD 2: REEL */}
            <div className="glass-panel hover:border-purple/40 hover:shadow-[0_0_30px_rgba(124,90,166,0.15)] rounded-2xl p-8 flex flex-col items-center group transition-all duration-500 relative overflow-hidden neon-border-glow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple/5 rounded-bl-full pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-purple/10 text-purple-300 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Film className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black font-outfit text-white uppercase mb-2">Reels Category</h3>
              <p className="text-purple-300/60 font-mono text-xs uppercase mb-6">Entry Fee: ₹30 Individual / ₹50 Team</p>

              <ul className="text-left w-full space-y-3 border-t border-slate-900 pt-6">
                {[
                  'Duration: 30–60 seconds',
                  'MP4 format only',
                  'Vertical 9:16 aspect ratio',
                  'Original footage and edits only',
                  'Basic cuts/transitions allowed',
                  'No AI-generated visuals',
                  'Nature storytelling focus',
                  'Background music/narration allowed'
                ].map((rule) => (
                  <li key={rule} className="flex items-start gap-2.5 text-sm text-slate-300 font-light">
                    <span className="text-purple-400 mt-0.5">✓</span> {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE SECTION: Vine Timeline style */}
      <section id="timeline" className="py-24 bg-bg-dark relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-xs uppercase tracking-widest font-mono text-neon font-black">
              📅 Key Dates
            </span>
            <h2 className="text-4xl md:text-5xl font-black font-outfit uppercase tracking-tight text-white mt-2">
              Event Timeline
            </h2>
          </div>

          <div className="relative max-w-3xl mx-auto">
            {/* Glowing timeline vine line */}
            <div className="timeline-vine">
              <div className="timeline-vine-progress" style={{ height: '70%' }} />
            </div>

            {/* Items */}
            {[
              { 
                date: status?.status === 'Opening Soon' ? 'Registration opens soon' : formatDisplayDate(settings.regStartDate), 
                title: 'Registration Starts', 
                desc: 'Secure your spot and download the Green Leaf Pockets submission prompts.', 
                status: status?.status === 'Opening Soon' ? 'Active' as const : 'Past' as const 
              },
              { 
                date: status?.status === 'Opening Soon' ? 'Submission Deadline updated soon' : formatDisplayDate(settings.regEndDate), 
                title: 'Submission Deadline', 
                desc: status?.status === 'Opening Soon' ? 'Submission Deadline' : 'All high-resolution photos and vertical reels must be uploaded by midnight.', 
                status: status?.status === 'Live' ? 'Active' as const : (status?.status === 'Opening Soon' ? 'Upcoming' as const : 'Past' as const) 
              },
              { 
                date: 'June 1 to June 3, 2026', 
                title: 'Judging Phase', 
                desc: 'Evaluation Period', 
                status: status?.status === 'Live' || status?.status === 'Opening Soon' ? 'Upcoming' as const : (Date.now() < new Date('2026-06-03T23:59:59').getTime() ? 'Active' as const : 'Past' as const)
              },
              { 
                date: formatDisplayDate(settings.resultDate), 
                title: 'Results Announcement', 
                desc: 'Winners unveiled live at the Vignan\'s Institute of Information Technology auditorium on World Environment Day.', 
                status: status?.status === 'Closed' ? 'Active' as const : 'Upcoming' as const 
              }
            ].map((item, idx) => (
              <div key={idx} className="relative flex flex-col md:flex-row gap-8 items-center md:items-start mb-16 last:mb-0 group">
                {/* Node dot */}
                <div className={`absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-bg-dark z-25 flex items-center justify-center transition-all duration-300 ${
                  item.status === 'Active' 
                    ? 'bg-neon shadow-[0_0_15px_#4ADE80]' 
                    : item.status === 'Past'
                      ? 'bg-emerald-800'
                      : 'bg-slate-900 border-slate-700'
                }`} />

                {/* Left card */}
                <div className="w-full md:w-1/2 text-center md:text-right pr-0 md:pr-12 group-hover:translate-x-[-5px] transition-transform duration-300">
                  <span className={`font-mono text-sm font-bold uppercase tracking-wider ${
                    item.status === 'Active' ? 'text-neon' : 'text-slate-500'
                  }`}>
                    {item.date}
                  </span>
                </div>

                {/* Right card */}
                <div className="w-full md:w-1/2 text-center md:text-left pl-0 md:pl-12 group-hover:translate-x-[5px] transition-transform duration-300">
                  <div className="glass-panel border-neon/10 p-6 rounded-xl relative">
                    <h3 className="font-outfit font-black text-xl text-white uppercase mb-2">{item.title}</h3>
                    <p className="text-slate-400 text-sm font-light leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIZE SECTION */}
      <section id="prize" className="py-24 bg-black/40 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="glass-panel border-neon/20 rounded-3xl p-10 md:p-16 flex flex-col md:flex-row items-center gap-10 sweep-effect">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-neon/10 border border-neon/30 flex items-center justify-center text-neon relative group shadow-[0_0_40px_rgba(74,222,128,0.15)] shrink-0">
              <Trophy className="w-12 md:w-16 h-12 md:h-16 animate-bounce" />
            </div>
            <div className="text-center md:text-left flex-1">
              <span className="text-xs font-mono uppercase tracking-widest text-neon font-black">
                🏆 Big Stage Rewards
              </span>
              <h2 className="text-3xl md:text-5xl font-black font-outfit uppercase tracking-tight text-white mt-2 mb-4 leading-none">
                Cash Prizes & Honors
              </h2>
              <p className="text-slate-300 font-light text-base md:text-lg leading-relaxed">
                Trophies, certificates, and exciting cash prizes will be awarded separately for the **Photography** and **Reels** categories. Show us the best green leaf pockets on campus!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PINTEREST GALLERY SECTION */}
      <section id="gallery" className="py-24 bg-bg-dark relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-widest font-mono text-neon font-black">
              🎬 Live Submissions
            </span>
            <h2 className="text-4xl md:text-5xl font-black font-outfit uppercase tracking-tight text-white mt-2">
              Explore Gallery
            </h2>
            <p className="text-slate-400 mt-2 text-sm max-w-md mx-auto">
              Real-time student submissions approved by jury evaluators. Click to preview or support!
            </p>
          </div>

          {/* Pinterest-style masonry grid */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {[
              { url: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=600', name: 'Micro Moss Garden', branch: 'CSE', category: 'Photo' },
              { url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=600', name: 'Deep Forest Path', branch: 'ECE', category: 'Photo' },
              { url: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=600', name: 'Dewdrop Macro', branch: 'BS&H', category: 'Photo' },
              { url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=600', name: 'Vignan Pockets', branch: 'IT', category: 'Photo' },
              { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600', name: 'Himalayan Ridge', branch: 'MECH', category: 'Photo' },
              { url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?q=80&w=600', name: 'Nature Reclaims', branch: 'CIVIL', category: 'Photo' }
            ].map((img, idx) => (
              <div key={idx} className="break-inside-avoid glass-panel rounded-2xl overflow-hidden border-neon/10 group cursor-pointer relative shadow-lg hover:shadow-[0_0_25px_rgba(74,222,128,0.15)] hover:border-neon/30 transition-all duration-300">
                <div className="overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
                  />
                </div>
                <div className="p-5 bg-gradient-to-t from-bg-dark via-bg-dark/95 to-bg-dark/80">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-outfit font-black text-lg text-white uppercase">{img.name}</h3>
                    <span className="px-2 py-0.5 bg-neon/10 text-neon border border-neon/20 rounded text-[9px] font-mono tracking-widest uppercase">{img.category}</span>
                  </div>
                  <p className="text-slate-400 text-xs font-mono font-light">Submitted by: {img.branch} student</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COORDINATORS SECTION */}
      <section id="coordinators" className="py-24 bg-black/60 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs uppercase tracking-widest font-mono text-neon font-black">
              📞 Event Steering
            </span>
            <h2 className="text-4xl md:text-5xl font-black font-outfit uppercase tracking-tight text-white mt-2">
              Coordinators
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Faculty */}
            <div className="glass-panel border-neon/10 p-8 rounded-2xl">
              <h3 className="font-playfair text-xl font-bold text-neon mb-6 border-b border-slate-900 pb-3 uppercase tracking-wide">
                Faculty Coordinators
              </h3>
              <div className="space-y-4">
                {coordinators?.faculty.map((c, i) => (
                  <div key={i} className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-slate-900">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-900 to-emerald-700 border border-emerald-500/30 flex items-center justify-center font-playfair font-bold text-emerald-100 text-lg">
                        {c.initials}
                      </div>
                      <div>
                        <h4 className="font-outfit font-bold text-white text-lg">{c.name}</h4>
                        <p className="text-slate-400 text-xs font-mono mt-0.5">{c.role}</p>
                      </div>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                      title="Call"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Student */}
            <div className="glass-panel border-neon/10 p-8 rounded-2xl">
              <h3 className="font-playfair text-xl font-bold text-neon mb-6 border-b border-slate-900 pb-3 uppercase tracking-wide">
                Student Coordinators
              </h3>
              <div className="space-y-4">
                {coordinators?.student.map((c, i) => (
                  <div key={i} className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-slate-900">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-900 to-emerald-700 border border-emerald-500/30 flex items-center justify-center font-playfair font-bold text-emerald-100 text-lg">
                        {c.initials}
                      </div>
                      <div>
                        <h4 className="font-outfit font-bold text-white text-lg">{c.name}</h4>
                        <p className="text-slate-400 text-xs font-mono mt-0.5">{c.role}</p>
                      </div>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                      title="Call"
                    >
                      <Phone className="w-5 h-5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="relative bg-[#020703] border-t border-slate-900 pt-20 pb-10 overflow-hidden">
        {/* Animated Moving Leaves in Footer */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute bottom-10 left-10 text-4xl animate-bounce">🍃</div>
          <div className="absolute bottom-24 right-24 text-3xl animate-pulse">🌿</div>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-16 relative z-10">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-3xl">🌿</span>
              <div className="font-outfit">
                <span className="font-black text-2xl text-white">Leaf & Lens</span>
                <span className="block text-[9px] tracking-widest text-emerald-400/60 uppercase font-mono">Department of BS&H</span>
              </div>
            </Link>
            <p className="text-slate-400 text-sm font-light leading-relaxed mt-2">
              Vignan's Institute of Information Technology (VIIT), Duvvada, Visakhapatnam.
            </p>
            <p className="italic text-xs text-neon/60 mt-2 font-mono">
              "We do not inherit the earth from our ancestors, we borrow it from our children."
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-outfit font-black text-white text-lg uppercase tracking-wide">Contacts & Support</h4>
            <div className="space-y-3 font-mono text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neon" />
                <a href="mailto:rohithsaimerupula01@gmail.com" className="hover:text-white transition-colors">
                  rohithsaimerupula01@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-neon" />
                <span>+91 90141 23748</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-neon" />
                <span>Visakhapatnam, AP</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-outfit font-black text-white text-lg uppercase tracking-wide">Public Utilities</h4>
            <div className="flex flex-col gap-2 font-outfit text-sm text-slate-400">
              <a href="#about" className="hover:text-white transition-colors">About the Event</a>
              <a href="#rules" className="hover:text-white transition-colors">Photography Rules</a>
              <a href="#timeline" className="hover:text-white transition-colors">Timeline Schedule</a>
              <Link href="/admin" className="hover:text-neon transition-colors text-neon/80 flex items-center gap-1">
                ⚙️ Admin Login
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t border-slate-900/60 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 text-xs text-slate-500 font-mono">
          <p>© 2026 Leaf & Lens · VIIT BS&H. Celebrating World Environment Day.</p>
          <div className="flex gap-4">
            <a href="https://wa.me/919014123748" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp 9014123748</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
