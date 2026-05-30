'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, Submission, Winner, DynamicSettings } from '@/lib/db';
import CursorTrail from '@/components/CursorTrail';
import AmbientMusic from '@/components/AmbientMusic';
import { 
  Users, CheckCircle2, XCircle, Clock, Calendar, Globe, Save, Trash2, 
  Download, Eye, KeyRound, LogOut, ArrowLeft, RefreshCw, BarChart2, ShieldAlert, Archive
} from 'lucide-react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

function getBranchFromRoll(roll: string | null | undefined): string {
  if (!roll || typeof roll !== 'string') return '';
  const r = roll.toUpperCase().trim();
  if (r.length < 8) return '';
  const code = r.substring(6, 8);
  const branches: Record<string, string> = {
    '05': 'CSE',
    '12': 'IT',
    '06': 'CS',
    '42': 'CSD',
    '43': 'CAI',
    '54': 'AIDS',
    '04': 'ECE',
    '19': 'ECM',
    '01': 'CIVIL',
    '03': 'MECH',
    '02': 'EEE'
  };
  return branches[code] || '';
}

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin Data states
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<DynamicSettings>({
    regStartDate: "2026-05-20",
    regEndDate: "2026-05-26",
    resultsPublic: false,
    resultDate: "2026-06-05"
  });
  const [winners, setWinners] = useState<Winner[]>([]);

  // Timer inputs
  const [regStartDate, setRegStartDate] = useState('');
  const [regEndDate, setRegEndDate] = useState('');
  const [resultDate, setResultDate] = useState('');
  const [resultsPublic, setResultsPublic] = useState(false);
  const [timerDuration, setTimerDuration] = useState('3');
  const [maxTeams, setMaxTeams] = useState('');

  // Active sub tab
  const [activeTab, setActiveTab] = useState<'submissions' | 'winners' | 'timers'>('submissions');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  // Stats Counters
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    photos: 0,
    reels: 0,
    both: 0
  });

  useEffect(() => {
    // Check if previously logged in this session
    if (typeof window !== 'undefined') {
      const logged = sessionStorage.getItem('ll_admin_logged');
      if (logged === 'true') {
        setIsLoggedIn(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    loadAllData();
  }, [isLoggedIn]);

  const loadAllData = async () => {
    const subs = await db.getSubmissions();
    setSubmissions(subs);

    const s = await db.getSettings();
    setSettings(s);
    setRegStartDate(s.regStartDate);
    setRegEndDate(s.regEndDate);
    setResultDate(s.resultDate);
    setResultsPublic(s.resultsPublic);
    setMaxTeams(s.maxTeams ? String(s.maxTeams) : '');

    const w = await db.getWinners();
    setWinners(w);

    // Calculate Analytics
    const pending = subs.filter(x => x.status === 'pending').length;
    const approved = subs.filter(x => x.status === 'approved').length;
    const rejected = subs.filter(x => x.status === 'rejected').length;
    const approvedSubs = subs.filter(x => x.status === 'approved');
    const photos = approvedSubs.filter(x => x.participationType === 'Photo' || x.participationType === 'Both').length;
    const reels = approvedSubs.filter(x => x.participationType === 'Reel' || x.participationType === 'Both').length;
    const both = approvedSubs.filter(x => x.participationType === 'Both').length;

    setStats({
      total: subs.length,
      pending,
      approved,
      rejected,
      photos,
      reels,
      both
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Premium, secure credential gate (credentials match custom defaults requested)
    if (username === 'admin' && password === 'leaflens2026') {
      setIsLoggedIn(true);
      sessionStorage.setItem('ll_admin_logged', 'true');
    } else {
      setLoginError('Invalid Administrator credentials.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem('ll_admin_logged');
  };

  const handleApprove = async (sub: Submission) => {
    const updated = { ...sub, status: 'approved' as const };
    await db.saveSubmission(updated);
    if (selectedSub?.id === sub.id) {
      setSelectedSub(updated);
    }
    loadAllData();
    
    // Trigger email notification
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sub.member1Email, name: sub.member1Name, status: 'approved', id: sub.id })
    }).catch(console.error);
  };

  const handleReject = async (sub: Submission) => {
    const updated = { ...sub, status: 'rejected' as const };
    await db.saveSubmission(updated);
    if (selectedSub?.id === sub.id) {
      setSelectedSub(updated);
    }
    loadAllData();

    // Trigger email notification
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: sub.member1Email, name: sub.member1Name, status: 'rejected', id: sub.id })
    }).catch(console.error);
  };

  const handleDelete = async (sub: Submission) => {
    if (confirm('Permanently delete this entry? This action cannot be undone.')) {
      await db.deleteSubmission(sub.id);
      setSelectedSub(null);
      loadAllData();

      // Trigger email notification
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sub.member1Email, name: sub.member1Name, status: 'deleted', id: sub.id })
      }).catch(console.error);
    }
  };

  const handleSaveSettings = async () => {
    const updated: DynamicSettings = {
      ...settings,
      regStartDate,
      regEndDate,
      resultDate,
      resultsPublic,
      maxTeams: maxTeams ? parseInt(maxTeams) : undefined
    };
    await db.saveSettings(updated);
    setSettings(updated);
    alert('Dynamic Timers and visibility rules saved successfully!');
    loadAllData();
  };

  const handleStartTimerNow = async () => {
    // 1. Get today's local date in YYYY-MM-DD format
    const today = new Date();
    const startStr = today.toISOString().split('T')[0];
    
    // 2. Add duration in days
    const end = new Date();
    end.setDate(today.getDate() + parseInt(timerDuration));
    const endStr = end.toISOString().split('T')[0];

    // 3. Set standard result date to 5 days after registration ends
    const result = new Date(end);
    result.setDate(end.getDate() + 5);
    const resultStr = result.toISOString().split('T')[0];

    // 4. Prepare updated settings
    const updated: DynamicSettings = {
      ...settings,
      regStartDate: startStr,
      regEndDate: endStr,
      resultDate: resultStr,
      resultsPublic: false,
      competitionActive: true,
      timerStarted: true,
      maxTeams: maxTeams ? parseInt(maxTeams) : undefined
    };

    // 5. Save settings directly
    await db.saveSettings(updated);
    setSettings(updated);
    setRegStartDate(startStr);
    setRegEndDate(endStr);
    setResultDate(resultStr);
    setResultsPublic(false);

    // 6. Confetti and feedback
    confetti({ particleCount: 100, spread: 80 });
    alert(`Registration timer started successfully! Portal is now LIVE.\nIt will close on ${endStr}.`);
    loadAllData();
  };

  const handleStopRegistrationNow = async () => {
    if (!confirm('Are you sure you want to stop registration and close the portal immediately?')) return;

    // Set registration end date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const endStr = yesterday.toISOString().split('T')[0];

    const updated: DynamicSettings = {
      ...settings,
      regEndDate: endStr,
      competitionActive: false,
      timerStarted: false
    };

    await db.saveSettings(updated);
    setSettings(updated);
    setRegEndDate(endStr);

    alert('Registration portal has been closed successfully!');
    loadAllData();
  };

  // Winner Configuration
  const handleAssignWinner = async (key: string, label: string, submissionId: string) => {
    const matchedSub = submissions.find(x => x.id === submissionId);
    if (!matchedSub) return;

    const list = [...winners];
    const existingIdx = list.findIndex(x => x.key === key);
    
    const newWinner: Winner = {
      key,
      label,
      submissionId,
      name: matchedSub.member1Name,
      branch: matchedSub.member1Roll,
      category: matchedSub.participationType,
      fileUrl: matchedSub.photoUrl || matchedSub.reelUrl,
    };

    if (existingIdx > -1) {
      list[existingIdx] = newWinner;
    } else {
      list.push(newWinner);
    }

    await db.saveWinners(list);
    setWinners(list);
    confetti({ particleCount: 50, spread: 60 });
  };

  const handleClearWinners = async () => {
    if (confirm('Reset and clear all announced winners?')) {
      await db.saveWinners([]);
      setWinners([]);
    }
  };

  // Export Roster Roster to Excel/CSV structure
  const handleExportCSV = () => {
    if (!submissions.length) return;
    const headers = 'ID,Team Name,Category,Member 1,Roll 1,Phone,Member 2,Roll 2,Status,UTR Number\n';
    const rows = submissions.map(s => 
      `"${s.id}","${s.teamName}","${s.participationType}","${s.member1Name}","${s.member1Roll}","${s.member1Phone}","${s.member2Name || ''}","${s.member2Roll || ''}","${s.status}","${s.transactionId || ''}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leaf-lens-roster.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    const approvedSubmissions = submissions.filter(s => s.status === 'approved' && s.paymentScreenshotUrl);
    if (!approvedSubmissions.length) {
      alert("No approved submissions with payment screenshots found.");
      return;
    }

    const zip = new JSZip();
    const folder = zip.folder("approved_screenshots");
    if (!folder) return;

    for (const sub of approvedSubmissions) {
      let data = sub.paymentScreenshotUrl;
      const fileName = `${sub.transactionId || 'NO_UTR'}_${sub.teamName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      if (!data) continue;
      
      if (data.startsWith('data:image')) {
        const base64Data = data.split(',')[1];
        folder.file(fileName, base64Data, { base64: true });
      } else {
        try {
          const res = await fetch(data);
          const blob = await res.blob();
          folder.file(fileName, blob);
        } catch (e) {
          console.error(`Failed to fetch ${fileName}`, e);
        }
      }
    }

    try {
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "approved_screenshots.zip");
    } catch (e) {
      console.error("Failed to generate zip", e);
      alert("Failed to generate zip file.");
    }
  };

  const handleDownloadPDF = async () => {
    const approvedSubmissions = submissions.filter(s => s.status === 'approved' && s.paymentScreenshotUrl);
    if (!approvedSubmissions.length) {
      alert("No approved submissions with payment screenshots found.");
      return;
    }

    try {
      const doc = new jsPDF();
      let isFirstPage = true;

      for (const sub of approvedSubmissions) {
        if (!isFirstPage) doc.addPage();
        isFirstPage = false;
        
        doc.setFontSize(16);
        doc.text(`Team Name: ${sub.teamName}`, 10, 20);
        doc.setFontSize(12);
        doc.text(`Team Lead Name: ${sub.member1Name}`, 10, 30);
        doc.text(`Team Lead Registration Number: ${sub.member1Roll}`, 10, 40);
        doc.text(`Phone Number: ${sub.member1Phone}`, 10, 50);
        doc.text(`Category (Photo/Reel/Both): ${sub.participationType}`, 10, 60);

        const data = sub.paymentScreenshotUrl;
        if (data && data.startsWith('data:image')) {
          try {
            const format = data.includes('image/png') ? 'PNG' : 'JPEG';
            doc.addImage(data, format, 10, 70, 180, 200, undefined, 'FAST');
          } catch (e) {
            console.error("Failed to add image to PDF", e);
            doc.text("Screenshot could not be rendered (unsupported format).", 10, 80);
          }
        } else {
          doc.text("No valid screenshot data found.", 10, 80);
        }
      }

      doc.save("approved_screenshots.pdf");
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF file.");
    }
  };

  const openMediaInNewTab = async (dataUrl: string) => {
    if (!dataUrl) return;
    if (!dataUrl.startsWith('data:')) {
      window.open(dataUrl, '_blank');
      return;
    }
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : '';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Error opening media:', err);
      alert('Could not open media file.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen bg-bg-dark text-slate-100 flex flex-col items-center justify-center py-16 px-6 font-sans">
        <CursorTrail />
        <AmbientMusic />

        <div className="w-full max-w-md relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-300 font-playfair text-sm font-semibold mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Public Portal Home
          </Link>

          <div className="glass-panel border-neon/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-neon/10 border border-neon/30 flex items-center justify-center text-neon mb-6">
              <KeyRound className="w-8 h-8" />
            </div>

            <h1 className="text-3xl font-black font-playfair uppercase tracking-tight text-white mb-1">
              Jury Control
            </h1>
            <p className="text-xs font-mono text-emerald-400/60 uppercase tracking-widest mb-8">
              Department of BS&H · VIIT
            </p>

            {loginError && (
              <div className="w-full p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl mb-6 text-xs text-center font-light flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-emerald-400/50 mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-mono tracking-widest text-emerald-400/50 mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 mt-4 bg-neon text-black rounded-xl font-playfair font-bold uppercase tracking-wider text-xs transition-all hover:bg-transparent hover:text-neon border border-neon hover:shadow-[0_0_20px_rgba(74,222,128,0.25)] cursor-pointer"
              >
                Access Dashboard
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-bg-dark text-slate-100 flex flex-col font-sans">
      <CursorTrail />
      <AmbientMusic />

      {/* TOP HEADER */}
      <header className="border-b border-slate-900 bg-black/40 backdrop-blur-md sticky top-0 z-40 py-4 px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <h1 className="font-playfair font-black text-lg text-white uppercase leading-none">Leaf & Lens Admin</h1>
              <span className="text-[10px] font-mono tracking-widest text-neon uppercase mt-0.5 block">BS&H DEPT · VIIT</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-black font-playfair text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="max-w-7xl mx-auto px-8 py-10 w-full flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* STATS OVERVIEW HEADER COLUMN */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="glass-panel border-neon/10 rounded-2xl p-6">
            <h3 className="font-playfair font-black text-sm uppercase tracking-wider text-white mb-4 flex items-center gap-2 border-b border-slate-900 pb-2">
              <BarChart2 className="w-4 h-4 text-neon" /> Analytics Snapshot
            </h3>
            
            <div className="space-y-4">
              {[
                { label: 'Total Registered', count: stats.total, color: 'text-white' },
                { label: 'Awaiting Review', count: stats.pending, color: 'text-amber-400' },
                { label: 'Approved Entries', count: stats.approved, color: 'text-emerald-400' },
                { label: 'Rejected Entries', count: stats.rejected, color: 'text-rose-400' },
                { label: 'Photo Categories', count: stats.photos + stats.both, color: 'text-emerald-300' },
                { label: 'Reel Categories', count: stats.reels + stats.both, color: 'text-purple-300' }
              ].map((stat) => (
                <div key={stat.label} className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">{stat.label}</span>
                  <span className={`font-mono font-bold text-sm ${stat.color}`}>{stat.count}</span>
                </div>
              ))}
            </div>

            {settings.maxTeams && (
              <div className="mt-4 pt-4 border-t border-slate-900">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 block mb-2">Registration Capacity</span>
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-2xl font-black font-playfair text-neon neon-text-glow">{stats.total}</span>
                  <span className="text-sm font-mono text-slate-500">/ {settings.maxTeams}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neon rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (stats.total / settings.maxTeams) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  {settings.maxTeams - stats.total > 0
                    ? `${settings.maxTeams - stats.total} slots remaining`
                    : '🔴 Registration Full'}
                </p>
              </div>
            )}
          </div>

          {/* QUICK LINKS SECTION */}
          <div className="glass-panel border-neon/10 rounded-2xl p-6 flex flex-col gap-3">
            <button
              onClick={() => setActiveTab('submissions')}
              className={`w-full py-2.5 rounded-xl font-playfair text-xs font-bold uppercase tracking-wider transition-all border text-left px-4 flex items-center justify-between cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-neon/10 border-neon text-white shadow-[0_0_10px_rgba(74,222,128,0.05)]'
                  : 'bg-black/10 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span>Submissions Portal</span>
              <Clock className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('winners')}
              className={`w-full py-2.5 rounded-xl font-playfair text-xs font-bold uppercase tracking-wider transition-all border text-left px-4 flex items-center justify-between cursor-pointer ${
                activeTab === 'winners'
                  ? 'bg-neon/10 border-neon text-white'
                  : 'bg-black/10 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span>Manage Winners</span>
              <Globe className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('timers')}
              className={`w-full py-2.5 rounded-xl font-playfair text-xs font-bold uppercase tracking-wider transition-all border text-left px-4 flex items-center justify-between cursor-pointer ${
                activeTab === 'timers'
                  ? 'bg-neon/10 border-neon text-white'
                  : 'bg-black/10 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span>Timer Gating Settings</span>
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* DETAILS PANEL CONTROLLER */}
        <div className="lg:col-span-3">
          {/* TAB 1: SUBMISSIONS MANAGEMENT */}
          {activeTab === 'submissions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black font-playfair uppercase tracking-tight text-white">Submissions</h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500 hover:text-black text-purple-400 text-xs font-bold font-playfair uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" /> Download Payments
                  </button>
                  <button
                    onClick={handleDownloadZip}
                    className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black text-emerald-400 text-xs font-bold font-playfair uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" /> ZIP Screenshots
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 rounded-xl bg-black/40 border border-slate-800 hover:border-white text-xs font-bold font-playfair uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Roster
                  </button>
                  <button
                    onClick={loadAllData}
                    className="px-4 py-2 rounded-xl bg-black/40 border border-slate-800 hover:border-white text-xs font-bold font-playfair uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LIST */}
                <div className="glass-panel border-neon/10 rounded-2xl overflow-hidden max-h-[500px] overflow-y-auto">
                  <div className="p-4 border-b border-slate-900 bg-black/20 text-xs font-mono tracking-widest text-emerald-400/50 uppercase">
                    Inbox ({submissions.length})
                  </div>
                  
                  {submissions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No registrations found.</div>
                  ) : (
                    <div className="divide-y divide-slate-900">
                      {submissions.map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => setSelectedSub(sub)}
                          className={`p-4 hover:bg-emerald-500/5 transition-all cursor-pointer ${
                            selectedSub?.id === sub.id ? 'bg-emerald-500/5 border-l-2 border-neon' : ''
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-playfair font-black text-white text-sm uppercase">{sub.teamName}</span>
                            <span className={`px-2 py-0.5 text-[8px] font-mono tracking-widest uppercase rounded ${
                              sub.status === 'approved' 
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                                : sub.status === 'rejected'
                                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                            }`}>
                              {sub.status}
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-slate-500">
                            <span>{sub.member1Roll}</span>
                            <span>{sub.participationType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DETAIL */}
                <div className="glass-panel border-neon/10 rounded-2xl p-6 relative">
                  {selectedSub ? (
                    <div className="space-y-6">
                      <div className="border-b border-slate-900 pb-4">
                        <span className="text-[10px] font-mono tracking-widest text-neon/60 uppercase">{selectedSub.id}</span>
                        <h3 className="text-2xl font-black font-outfit text-white uppercase mt-0.5">{selectedSub.teamName}</h3>
                        <p className="text-xs font-mono text-slate-500">Submitted at: {new Date(selectedSub.submittedAt).toLocaleString()}</p>
                      </div>

                      <div className="space-y-3 text-xs">
                        <h4 className="font-outfit font-black text-slate-400 uppercase tracking-wide">Roster Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/30 p-3 rounded-xl border border-slate-900">
                            <span className="text-[9px] uppercase font-mono text-emerald-400/50">Lead Member</span>
                            <span className="block font-outfit font-bold text-white text-sm mt-0.5">{selectedSub.member1Name}</span>
                            <span className="block font-mono text-[10px] text-slate-500 mt-1">
                              {selectedSub.member1Roll} · {(() => {
                                const b = selectedSub.branch || getBranchFromRoll(selectedSub.member1Roll);
                                const sec = selectedSub.section;
                                return b ? (sec ? `${b}-${sec}`.toUpperCase() : b.toUpperCase()) : '—';
                              })()} · {selectedSub.member1Phone}
                            </span>
                          </div>

                          {selectedSub.member2Name && (
                            <div className="bg-black/30 p-3 rounded-xl border border-slate-900">
                              <span className="text-[9px] uppercase font-mono text-purple-400/50">Member 2</span>
                              <span className="block font-outfit font-bold text-white text-sm mt-0.5">{selectedSub.member2Name}</span>
                              <span className="block font-mono text-[10px] text-slate-500 mt-1">
                                {selectedSub.member2Roll} · {(() => {
                                  const b1 = selectedSub.branch || getBranchFromRoll(selectedSub.member1Roll);
                                  const sec1 = selectedSub.section;
                                  const str1 = b1 ? (sec1 ? `${b1}-${sec1}`.toUpperCase() : b1.toUpperCase()) : '—';

                                  const b2 = selectedSub.member2Branch || getBranchFromRoll(selectedSub.member2Roll);
                                  const sec2 = selectedSub.member2Section;
                                  const str2 = b2 ? (sec2 ? `${b2}-${sec2}`.toUpperCase() : b2.toUpperCase()) : '—';

                                  return (str1 !== '—' && str1 === str2) ? '' : `${str2} · `;
                                })()}{selectedSub.member2Phone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Verification Section */}
                      <div className="space-y-3 pt-4 border-t border-slate-900">
                        <h4 className="font-outfit font-black text-slate-400 uppercase tracking-wide flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Payment Verification
                        </h4>
                        <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400/50 block mb-1">Transaction UTR Number</span>
                            <span className="font-mono font-bold text-white text-lg tracking-wider bg-black/40 px-3 py-1.5 rounded-lg border border-slate-800">
                              {selectedSub.transactionId || 'NOT PROVIDED'}
                            </span>
                          </div>
                          {selectedSub.paymentScreenshotUrl ? (
                            <button
                              onClick={() => openMediaInNewTab(selectedSub.paymentScreenshotUrl!)}
                              className="px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black text-emerald-400 text-xs font-bold font-outfit uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Eye className="w-4 h-4" /> View Payment Screenshot
                            </button>
                          ) : (
                            <span className="text-xs font-mono text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20">
                              No Screenshot
                            </span>
                          )}
                        </div>
                      </div>

                      {selectedSub.creativeSummary && (
                        <div className="space-y-2 pt-4 border-t border-slate-900">
                          <h4 className="font-outfit font-black text-slate-400 uppercase tracking-wide">✨ Creative Summary</h4>
                          <p className="text-sm text-slate-300 italic whitespace-pre-wrap bg-black/20 p-4 rounded-xl border border-slate-800">
                            {selectedSub.creativeSummary}
                          </p>
                        </div>
                      )}

                      <div className="space-y-4 pt-4 border-t border-slate-900">
                        <div className="flex justify-between items-center">
                          <h4 className="font-outfit font-black text-slate-400 uppercase tracking-wide">File Submissions</h4>
                          {selectedSub.aiFlags && selectedSub.aiFlags.toLowerCase().includes('ai') ? (
                            <span className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold font-mono uppercase rounded flex items-center gap-1">
                              🤖 AI
                            </span>
                          ) : selectedSub.aiFlags && selectedSub.aiFlags.toLowerCase().includes('edit') ? (
                            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold font-mono uppercase rounded flex items-center gap-1">
                              ✏️ Edited
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono uppercase rounded flex items-center gap-1">
                              🟢 Natural
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                          {selectedSub.photoUrl && (
                            <button
                              onClick={() => openMediaInNewTab(selectedSub.photoUrl!)}
                              className="px-4 py-2 bg-black/40 border border-slate-800 hover:border-white text-xs font-bold font-outfit uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Photo
                            </button>
                          )}
                          {selectedSub.reelUrl && (
                            <button
                              onClick={() => openMediaInNewTab(selectedSub.reelUrl!)}
                              className="px-4 py-2 bg-black/40 border border-slate-800 hover:border-white text-xs font-bold font-outfit uppercase tracking-wider rounded-xl flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Reel
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 pt-6 border-t border-slate-900">
                        <button
                          onClick={() => handleApprove(selectedSub)}
                          disabled={selectedSub.status === 'approved'}
                          className="flex-1 py-3 bg-neon text-black disabled:opacity-30 disabled:pointer-events-none rounded-xl font-outfit font-bold uppercase tracking-wider text-xs border border-neon hover:bg-transparent hover:text-neon transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(74,222,128,0.15)]"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Approve Entry
                        </button>
                        <button
                          onClick={() => handleReject(selectedSub)}
                          disabled={selectedSub.status === 'rejected'}
                          className="flex-1 py-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 disabled:opacity-30 disabled:pointer-events-none rounded-xl font-outfit font-bold uppercase tracking-wider text-xs hover:bg-rose-500 hover:text-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" /> Reject Entry
                        </button>
                        <button
                          onClick={() => handleDelete(selectedSub)}
                          className="px-4 py-3 bg-transparent border border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-500/30 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                          title="Delete submission permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-outfit text-sm">
                      Select a submission in the inbox to view details.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WINNERS ANNOUNCEMENT CONTROLS */}
          {activeTab === 'winners' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black font-outfit uppercase tracking-tight text-white">Declare Winners</h2>
                <button
                  onClick={handleClearWinners}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-black text-xs font-bold font-outfit uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Winners
                </button>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-xl text-xs font-light">
                ⚠️ Only <strong>Approved submissions</strong> can be selected as winners in the dropdown menus below.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* PHOTOGRAPHY */}
                <div className="glass-panel border-neon/10 rounded-2xl p-6 space-y-6">
                  <h3 className="font-outfit font-black text-lg text-white uppercase border-b border-slate-900 pb-2">
                    📸 Photo Category
                  </h3>

                  {[
                    { key: 'photo_1st', label: '🥇 1st Place' },
                    { key: 'photo_2nd', label: '🥈 2nd Place' },
                    { key: 'photo_3rd', label: '🥉 3rd Place' }
                  ].map((rank) => {
                    const current = winners.find(x => x.key === rank.key);
                    return (
                      <div key={rank.key} className="space-y-2">
                        <label className="block text-[10px] uppercase font-mono tracking-widest text-emerald-400/50">{rank.label}</label>
                        <select
                          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm"
                          value={current?.submissionId || ''}
                          onChange={(e) => handleAssignWinner(rank.key, rank.label, e.target.value)}
                        >
                          <option value="">— Select Winner —</option>
                          {submissions.filter(x => x.status === 'approved' && (x.participationType === 'Photo' || x.participationType === 'Both')).map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.member1Name} ({sub.id}) · {sub.member1Roll}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* REELS */}
                <div className="glass-panel border-neon/10 rounded-2xl p-6 space-y-6">
                  <h3 className="font-outfit font-black text-lg text-white uppercase border-b border-slate-900 pb-2">
                    🎬 Reel Category
                  </h3>

                  {[
                    { key: 'reel_1st', label: '🥇 1st Place' },
                    { key: 'reel_2nd', label: '🥈 2nd Place' },
                    { key: 'reel_3rd', label: '🥉 3rd Place' }
                  ].map((rank) => {
                    const current = winners.find(x => x.key === rank.key);
                    return (
                      <div key={rank.key} className="space-y-2">
                        <label className="block text-[10px] uppercase font-mono tracking-widest text-purple-400/50">{rank.label}</label>
                        <select
                          className="w-full px-4 py-3 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm"
                          value={current?.submissionId || ''}
                          onChange={(e) => handleAssignWinner(rank.key, rank.label, e.target.value)}
                        >
                          <option value="">— Select Winner —</option>
                          {submissions.filter(x => x.status === 'approved' && (x.participationType === 'Reel' || x.participationType === 'Both')).map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.member1Name} ({sub.id}) · {sub.member1Roll}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TIMER GATING & VISIBILITY */}
          {activeTab === 'timers' && (
            <div className="glass-panel border-neon/10 rounded-2xl p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black font-outfit uppercase tracking-tight text-white">Timer Controls</h2>
                  <p className="text-xs text-slate-500 font-light mt-1">Set registration dates and results public accessibility live gates.</p>
                </div>
              </div>

              {/* QUICK ACTION: DYNAMIC TIMER LAUNCHER */}
              <div className="bg-emerald-950/20 border border-neon/30 rounded-2xl p-6 relative overflow-hidden group shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon/5 rounded-bl-full pointer-events-none" />
                <h3 className="font-outfit font-black text-lg text-white uppercase mb-2 flex items-center gap-2">
                  🚀 Quick Timer Action (Start Registration Now)
                </h3>
                <p className="text-xs text-emerald-300/80 font-light mb-4">
                  Automatically set the portal to <strong className="text-neon">LIVE</strong> immediately by launching a registration timer for a selected duration. This will update the database instantly.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="w-full sm:w-1/3">
                    <label className="block text-[10px] uppercase font-mono tracking-widest text-emerald-400/50 mb-2">Timer Duration</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm"
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(e.target.value)}
                    >
                      <option value="1">1 Day (Quick Sprint)</option>
                      <option value="3">3 Days (Recommended)</option>
                      <option value="5">5 Days</option>
                      <option value="7">7 Days (Full Week)</option>
                      <option value="10">10 Days</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-1/3">
                    <label className="block text-[10px] uppercase font-mono tracking-widest text-emerald-400/50 mb-2">Max Teams Allowed</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm font-mono"
                      placeholder="e.g. 50 (leave blank for unlimited)"
                      value={maxTeams}
                      onChange={(e) => setMaxTeams(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 w-full sm:w-1/2">
                    <button
                      onClick={handleStartTimerNow}
                      className="flex-1 py-3 bg-neon text-black rounded-xl font-outfit font-bold uppercase tracking-wider text-xs border border-neon hover:bg-transparent hover:text-neon transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(74,222,128,0.25)]"
                    >
                      <Clock className="w-4 h-4" /> Start Registration Timer
                    </button>
                    
                    <button
                      onClick={handleStopRegistrationNow}
                      className="py-3 px-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-black rounded-xl font-outfit font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Force Close Registration Immediately"
                    >
                      Close Portal 🛑
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-emerald-400/50 mb-2">Registration Open Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white font-mono text-sm"
                    value={regStartDate}
                    onChange={(e) => setRegStartDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-emerald-400/50 mb-2">Registration Deadline</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white font-mono text-sm"
                    value={regEndDate}
                    onChange={(e) => setRegEndDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono tracking-widest text-emerald-400/50 mb-2">Result Declaration Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white font-mono text-sm"
                    value={resultDate}
                    onChange={(e) => setResultDate(e.target.value)}
                  />
                </div>

                <div className="bg-black/30 border border-slate-900 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <h4 className="font-outfit font-bold text-white text-sm">Announce Results Publicly</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Show declared winners on the live home page gallery.</p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={resultsPublic}
                      onChange={(e) => setResultsPublic(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon peer-checked:after:bg-black" />
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-900 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-3.5 bg-neon text-black rounded-xl font-outfit font-bold uppercase tracking-wider text-xs border border-neon hover:bg-transparent hover:text-neon transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(74,222,128,0.25)]"
                >
                  <Save className="w-4 h-4" /> Save Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
