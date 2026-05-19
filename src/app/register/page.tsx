'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, Submission, DynamicSettings } from '@/lib/db';
import { calculateEventStatus, EventStatusDetails } from '@/lib/timer';
import CursorTrail from '@/components/CursorTrail';
import AmbientMusic from '@/components/AmbientMusic';
import { 
  Camera, Film, QrCode, AlertCircle, ArrowLeft, ArrowRight, 
  Upload, CheckCircle, RefreshCw, Smartphone, ShieldAlert, Sparkles 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function Register() {
  const router = useRouter();
  const [settings, setSettings] = useState<DynamicSettings | null>(null);
  const [status, setStatus] = useState<EventStatusDetails | null>(null);

  // Form Step State
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form Fields
  const [teamName, setTeamName] = useState('');
  const [participationType, setParticipationType] = useState<'Photo' | 'Reel' | 'Both'>('Photo');
  const [teamOption, setTeamOption] = useState<'individual' | 'team'>('individual');

  // Member 1
  const [m1Name, setM1Name] = useState('');
  const [m1Roll, setM1Roll] = useState('');
  const [m1Email, setM1Email] = useState('');
  const [m1Phone, setM1Phone] = useState('');

  // Member 2
  const [m2Name, setM2Name] = useState('');
  const [m2Roll, setM2Roll] = useState('');
  const [m2Email, setM2Email] = useState('');
  const [m2Phone, setM2Phone] = useState('');

  // Upload States
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [reelFile, setReelFile] = useState<File | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  const [photoProgress, setPhotoProgress] = useState(0);
  const [reelProgress, setReelProgress] = useState(0);
  const [screenshotProgress, setScreenshotProgress] = useState(0);

  // Errors
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    async function loadData() {
      const s = await db.getSettings();
      setSettings(s);
      setStatus(calculateEventStatus(s));
    }
    loadData();
  }, []);

  // Calculate pricing based on selection
  const getPrice = () => {
    if (participationType === 'Both') return 50;
    return 30;
  };

  const handleNextStep = () => {
    setValidationError('');

    if (step === 1) {
      if (!teamName.trim()) {
        setValidationError('Please specify a Team or Participant Name.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Validate Member 1
      if (!m1Name.trim() || !m1Roll.trim() || !m1Email.trim() || !m1Phone.trim()) {
        setValidationError('All Member 1 fields are required.');
        return;
      }

      // 1st Year Exclusivity Validation Check
      // Roll numbers for freshers typically start with specific year series, but to be safe and highly professional:
      // Let's enforce that the user explicitly acknowledges they are a 1st Year!
      // In the static site, we had a locks banner. Let's make sure they confirm or input a valid roll format if desired.
      const isM1Fresher = m1Roll.toLowerCase().startsWith('25') || m1Roll.toLowerCase().includes('lh') || m1Roll.length > 5;
      if (!isM1Fresher) {
        setValidationError('Competition is strictly for 1st Year (Freshers) only. Verify Member 1 Roll Number.');
        return;
      }

      if (teamOption === 'team') {
        if (!m2Name.trim() || !m2Roll.trim() || !m2Email.trim() || !m2Phone.trim()) {
          setValidationError('Please fill in all Member 2 details or select Individual participation.');
          return;
        }
        const isM2Fresher = m2Roll.toLowerCase().startsWith('25') || m2Roll.toLowerCase().includes('lh') || m2Roll.length > 5;
        if (!isM2Fresher) {
          setValidationError('Both team members must be 1st Year students. Verify Member 2 Roll Number.');
          return;
        }
      }

      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (participationType === 'Photo' && !photoFile) {
      setValidationError('Please upload your nature photograph.');
      return;
    }
    if (participationType === 'Reel' && !reelFile) {
      setValidationError('Please upload your nature storytelling reel.');
      return;
    }
    if (participationType === 'Both' && (!photoFile || !reelFile)) {
      setValidationError('Please upload both the photograph and the reel.');
      return;
    }
    if (!screenshotFile) {
      setValidationError('Please upload your UPI payment screenshot to complete the submission.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload files to direct database/storage base64
      let photoUrl = '';
      let reelUrl = '';
      let screenshotUrl = '';

      if (photoFile) {
        photoUrl = await db.uploadFile(photoFile, 'submissions/photos', setPhotoProgress);
      }
      if (reelFile) {
        reelUrl = await db.uploadFile(reelFile, 'submissions/reels', setReelProgress);
      }
      screenshotUrl = await db.uploadFile(screenshotFile, 'submissions/receipts', setScreenshotProgress);

      // 2. Prepare payload
      const submissionPayload: Submission = {
        id: 'SUB_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        teamName,
        participationType,
        member1Name: m1Name,
        member1Roll: m1Roll,
        member1Email: m1Email,
        member1Phone: m1Phone,
        ...(teamOption === 'team' && {
          member2Name: m2Name,
          member2Roll: m2Roll,
          member2Email: m2Email,
          member2Phone: m2Phone,
        }),
        photoUrl,
        reelUrl,
        paymentScreenshotUrl: screenshotUrl,
        status: 'pending',
        submittedAt: new Date().toISOString()
      };

      // 3. Save to database
      await db.saveSubmission(submissionPayload);

      // Confetti & display success
      setSubmitted(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error(err);
      setValidationError('Upload failed. Try compressing your files and submit again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-bg-dark text-slate-100 flex flex-col items-center justify-center py-16 px-6 font-sans">
      <CursorTrail />
      <AmbientMusic />

      {/* Floating stars / ambient nodes */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* ESCAPE BUTTON */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-300 font-outfit text-sm font-semibold mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Portal Home
        </Link>

        {/* TIME GATING NOTICE BLOCKS */}
        {status && !status.isLive && !submitted && (
          <div className="glass-panel border-rose-500/20 p-6 rounded-2xl mb-8 flex items-center gap-4 text-rose-400 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <ShieldAlert className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="font-outfit font-bold text-lg uppercase tracking-wide">Portal Locked</h3>
              <p className="text-sm font-light text-rose-300/80">
                {status.message} Submissions are only accepted during the live competition dates ({settings?.regStartDate} to {settings?.regEndDate}).
              </p>
            </div>
          </div>
        )}

        {/* GENERAL BANNER EXCLUSIVITY GATING */}
        {!submitted && (
          <div className="glass-panel border-neon/15 p-4 rounded-xl mb-6 flex items-center gap-3 text-neon/90 text-xs tracking-wider uppercase font-mono">
            <Sparkles className="w-4 h-4 text-neon shrink-0 animate-pulse" />
            <span>strictly restricted to 1st year (Freshers) students of VIIT</span>
          </div>
        )}

        {/* MAIN MULTI-STEP CARD */}
        <div className="glass-panel border-neon/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {submitted ? (
            /* SUCCESS PANEL */
            <div className="p-12 text-center flex flex-col items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-neon/10 border border-neon/30 flex items-center justify-center text-neon shadow-[0_0_30px_rgba(74,222,128,0.2)]">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black font-outfit uppercase tracking-tight text-white">
                Your nature story has been submitted 🌿
              </h2>
              <p className="text-slate-400 font-light max-w-md">
                Thank you for participating! Our Department jury will verify your UPI receipt and submission files. Approved entries will go live in the public Gallery!
              </p>
              <div className="flex gap-4 mt-4">
                <Link
                  href="/"
                  className="px-6 py-2.5 bg-neon text-black rounded-full font-outfit font-bold text-xs uppercase tracking-wider hover:bg-transparent hover:text-neon border border-neon transition-all"
                >
                  View Portal
                </Link>
                <button
                  onClick={() => {
                    setStep(1);
                    setSubmitted(false);
                    setTeamName('');
                    setM1Name('');
                    setM1Roll('');
                    setM1Email('');
                    setM1Phone('');
                    setM2Name('');
                    setM2Roll('');
                    setM2Email('');
                    setM2Phone('');
                    setPhotoFile(null);
                    setReelFile(null);
                    setScreenshotFile(null);
                  }}
                  className="px-6 py-2.5 bg-transparent text-slate-400 border border-slate-800 hover:text-white hover:border-white rounded-full font-outfit font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Submit Another
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 md:p-12">
              {/* Steps Progress Header */}
              <div className="flex justify-between items-center mb-8 border-b border-slate-900 pb-6">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neon font-black">Step {step} of 3</span>
                  <h2 className="text-2xl font-black font-outfit text-white uppercase tracking-tight">
                    {step === 1 ? 'Contest Configuration' : step === 2 ? 'Participant Roster' : 'Media Uploads'}
                  </h2>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        s === step ? 'bg-neon w-6 shadow-[0_0_8px_#4ADE80]' : s < step ? 'bg-emerald-800' : 'bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {validationError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl mb-6 flex items-start gap-2.5 text-sm font-light">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* STEP 1: CONTEST CONFIG */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs uppercase font-mono tracking-widest text-emerald-400/60 mb-2">Team / Participant Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white transition-all font-outfit font-medium text-lg placeholder-slate-600"
                      placeholder="e.g. Green Pioneers / Rohith Sai"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-mono tracking-widest text-emerald-400/60 mb-3">Participation Type</label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { id: 'Photo', label: '📸 Photo only', fee: '₹30' },
                        { id: 'Reel', label: '🎬 Reel only', fee: '₹30' },
                        { id: 'Both', label: '🌟 Both categories', fee: '₹50' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setParticipationType(opt.id as any)}
                          className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            participationType === opt.id
                              ? 'border-neon bg-neon/10 text-white shadow-[0_0_15px_rgba(74,222,128,0.1)]'
                              : 'border-slate-800 bg-black/20 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="font-outfit font-bold text-sm">{opt.label}</span>
                          <span className="text-[10px] font-mono text-neon/80 font-black">{opt.fee}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-mono tracking-widest text-emerald-400/60 mb-3">Team Setup</label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'individual', label: '👤 Individual Entry' },
                        { id: 'team', label: '👥 Two-Member Team' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTeamOption(opt.id as any)}
                          className={`p-4 rounded-xl border font-outfit font-bold text-sm transition-all cursor-pointer ${
                            teamOption === opt.id
                              ? 'border-neon bg-neon/10 text-white'
                              : 'border-slate-800 bg-black/20 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!!(status && !status.isLive)}
                    onClick={handleNextStep}
                    className="w-full py-4 mt-4 bg-neon text-black rounded-xl font-outfit font-bold uppercase tracking-wider transition-all duration-300 border border-neon hover:bg-transparent hover:text-neon hover:shadow-[0_0_20px_rgba(74,222,128,0.25)] flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  >
                    Roster Information <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* STEP 2: ROSTER DETAILS */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* MEMBER 1 */}
                  <div className="bg-black/30 p-5 rounded-2xl border border-slate-900">
                    <h3 className="text-xs uppercase font-mono tracking-widest text-neon font-black mb-4">👤 Member 1 (Lead Roster)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        className="px-4 py-2.5 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm"
                        placeholder="Full Name"
                        value={m1Name}
                        onChange={(e) => setM1Name(e.target.value)}
                      />
                      <input
                        type="text"
                        className="px-4 py-2.5 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm font-mono placeholder:font-sans"
                        placeholder="Roll Number (e.g. 25*)"
                        value={m1Roll}
                        onChange={(e) => setM1Roll(e.target.value)}
                      />
                      <input
                        type="email"
                        className="px-4 py-2.5 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm"
                        placeholder="Email Address"
                        value={m1Email}
                        onChange={(e) => setM1Email(e.target.value)}
                      />
                      <input
                        type="tel"
                        className="px-4 py-2.5 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm font-mono placeholder:font-sans"
                        placeholder="WhatsApp Phone"
                        value={m1Phone}
                        onChange={(e) => setM1Phone(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* MEMBER 2 OPTIONAL */}
                  {teamOption === 'team' && (
                    <div className="bg-black/30 p-5 rounded-2xl border border-slate-900">
                      <h3 className="text-xs uppercase font-mono tracking-widest text-purple-400 font-black mb-4">👥 Member 2 Roster</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          className="px-4 py-2.5 rounded-xl bg-black/40 border border-slate-800 focus:border-purple focus:outline-none text-white text-sm"
                          placeholder="Full Name"
                          value={m2Name}
                          onChange={(e) => setM2Name(e.target.value)}
                        />
                        <input
                          type="text"
                          className="px-4 py-2.5 rounded-xl bg-black/40 border border-slate-800 focus:border-purple focus:outline-none text-white text-sm font-mono placeholder:font-sans"
                          placeholder="Roll Number (e.g. 25*)"
                          value={m2Roll}
                          onChange={(e) => setM2Roll(e.target.value)}
                        />
                        <input
                          type="email"
                          className="px-4 py-2.5 rounded-xl bg-black/40 border border-slate-800 focus:border-purple focus:outline-none text-white text-sm"
                          placeholder="Email Address"
                          value={m2Email}
                          onChange={(e) => setM2Email(e.target.value)}
                        />
                        <input
                          type="tel"
                          className="px-4 py-2.5 rounded-xl bg-black/40 border border-slate-800 focus:border-purple focus:outline-none text-white text-sm font-mono placeholder:font-sans"
                          placeholder="WhatsApp Phone"
                          value={m2Phone}
                          onChange={(e) => setM2Phone(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/3 py-3.5 bg-transparent border border-slate-800 hover:border-white text-slate-300 rounded-xl font-outfit text-sm uppercase tracking-wider font-semibold transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="w-2/3 py-3.5 bg-neon text-black rounded-xl font-outfit font-bold uppercase tracking-wider text-sm transition-all hover:bg-transparent hover:text-neon border border-neon flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Media Uploads <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: MEDIA UPLOADS & PAYMENT */}
              {step === 3 && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Photo submission upload */}
                  {(participationType === 'Photo' || participationType === 'Both') && (
                    <div>
                      <label className="block text-xs uppercase font-mono tracking-widest text-emerald-400/60 mb-2">📸 Photography Submission</label>
                      <div className="border-2 border-dashed border-slate-800 hover:border-neon/50 rounded-2xl p-6 flex flex-col items-center justify-center transition-all bg-black/20 relative group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-8 h-8 text-slate-500 group-hover:text-neon transition-colors mb-2" />
                        <span className="text-sm font-outfit font-bold text-white uppercase mb-1">
                          {photoFile ? photoFile.name : 'Choose Photograph File'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">JPG or PNG formats only</span>
                      </div>
                    </div>
                  )}

                  {/* Reel submission upload */}
                  {(participationType === 'Reel' || participationType === 'Both') && (
                    <div>
                      <label className="block text-xs uppercase font-mono tracking-widest text-emerald-400/60 mb-2">🎬 Reels Submission</label>
                      <div className="border-2 border-dashed border-slate-800 hover:border-purple/50 rounded-2xl p-6 flex flex-col items-center justify-center transition-all bg-black/20 relative group">
                        <input
                          type="file"
                          accept="video/mp4, video/mkv"
                          onChange={(e) => setReelFile(e.target.files?.[0] || null)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-8 h-8 text-slate-500 group-hover:text-purple-400 transition-colors mb-2" />
                        <span className="text-sm font-outfit font-bold text-white uppercase mb-1">
                          {reelFile ? reelFile.name : 'Choose Reel File'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">MP4 or MKV vertical formats</span>
                      </div>
                    </div>
                  )}

                  {/* UPI QR PAYMENT SYSTEM */}
                  <div className="bg-black/40 border border-neon/15 rounded-2xl p-6">
                    <h3 className="text-xs uppercase font-mono tracking-widest text-neon font-black mb-4 flex items-center gap-2">
                      <QrCode className="w-4 h-4" /> UPI Payment Verification
                    </h3>
                    
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="w-36 h-36 bg-white p-3 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200">
                        {/* Interactive dynamic UPI QR generation based on price */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=rohithsaimerupula01@okaxis%26pn=Leaf%20and%20Lens%20Competition%26am=${getPrice()}%26cu=INR`}
                          alt="UPI Payment QR"
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <span className="text-xs uppercase font-mono font-black text-emerald-400/50 block">Amount to Pay</span>
                        <span className="text-3xl font-black font-outfit text-white">₹{getPrice()}.00</span>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                          Scan this QR with any UPI app (GPay, PhonePe, Paytm). Complete the transfer and upload the transaction receipt screenshot below.
                        </p>
                      </div>
                    </div>

                    <div className="border-2 border-dashed border-slate-800 hover:border-neon/50 rounded-xl p-4 mt-6 flex flex-col items-center justify-center transition-all bg-black/10 relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="w-6 h-6 text-slate-500 group-hover:text-neon transition-colors mb-1.5" />
                      <span className="text-xs font-outfit font-bold text-white uppercase">
                        {screenshotFile ? screenshotFile.name : 'Upload Screenshot / Receipt'}
                      </span>
                    </div>
                  </div>

                  {submitting && (
                    <div className="space-y-2 font-mono text-xs text-neon/70">
                      {photoFile && <div className="flex justify-between"><span>Uploading Photograph...</span><span>{Math.round(photoProgress)}%</span></div>}
                      {reelFile && <div className="flex justify-between"><span>Uploading Reel...</span><span>{Math.round(reelProgress)}%</span></div>}
                      <div className="flex justify-between"><span>Uploading receipt...</span><span>{Math.round(screenshotProgress)}%</span></div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="w-1/3 py-3.5 bg-transparent border border-slate-800 hover:border-white text-slate-300 rounded-xl font-outfit text-sm uppercase tracking-wider font-semibold transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-2/3 py-3.5 bg-neon text-black rounded-xl font-outfit font-bold uppercase tracking-wider text-sm transition-all hover:bg-transparent hover:text-neon border border-neon flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(74,222,128,0.2)] disabled:opacity-30 disabled:pointer-events-none"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                        </>
                      ) : (
                        'Complete Submission 🌿'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
