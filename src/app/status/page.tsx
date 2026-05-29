'use client';

import { useState } from 'react';
import Link from 'next/link';
import CursorTrail from '@/components/CursorTrail';
import AmbientMusic from '@/components/AmbientMusic';
import { Search, ArrowLeft, CheckCircle2, Clock, XCircle, ShieldAlert, Loader2 } from 'lucide-react';

export default function CheckStatus() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!res.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await res.json();
      
      if (data.found) {
        setResult(data.data);
      } else {
        setError('No registration found with that UTR Number or Roll Number. Please double check your input.');
      }
    } catch (err) {
      setError('An error occurred while checking status. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-bg-dark text-slate-100 flex flex-col items-center justify-center py-16 px-6 font-sans">
      <CursorTrail />
      <AmbientMusic />

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors duration-300 font-playfair text-sm font-semibold mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Portal Home
        </Link>

        <div className="glass-panel border-neon/10 rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-8">
            <span className="text-[10px] uppercase font-mono tracking-widest text-neon font-semibold">Track Application</span>
            <h1 className="text-4xl font-semibold font-playfair text-white capitalize tracking-tight mt-1">
              Check Status
            </h1>
            <p className="text-sm font-light text-slate-400 mt-2">
              Enter your 12-digit PhonePe UTR Number or College Roll Number to check your registration status.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative">
              <input
                type="text"
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-black/40 border border-slate-800 focus:border-neon focus:outline-none text-white text-sm font-mono placeholder:font-sans placeholder-slate-600 transition-all"
                placeholder="UTR Number or Roll Number..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
              <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
            
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full py-4 mt-4 bg-neon text-black rounded-xl font-playfair font-semibold uppercase tracking-wider transition-all duration-300 border border-neon hover:bg-transparent hover:text-neon flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Searching...</>
              ) : (
                'Track Registration'
              )}
            </button>
          </form>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-start gap-3 text-sm font-light">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="bg-black/30 border border-slate-800 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-start mb-6 border-b border-slate-900 pb-4">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block mb-1">Registration ID: {result.id}</span>
                  <h3 className="text-2xl font-semibold font-playfair text-white capitalize">{result.teamName}</h3>
                  <span className="text-sm text-slate-400">{result.member1Name}</span>
                </div>
                
                <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 text-xs font-bold font-mono uppercase ${
                  result.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  result.status === 'rejected' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                  'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}>
                  {result.status === 'approved' && <CheckCircle2 className="w-4 h-4" />}
                  {result.status === 'rejected' && <XCircle className="w-4 h-4" />}
                  {result.status === 'pending' && <Clock className="w-4 h-4" />}
                  {result.status}
                </div>
              </div>

              <div className="space-y-4">
                {result.status === 'pending' && (
                  <p className="text-sm text-amber-300/80 font-light leading-relaxed">
                    Your registration is currently under review. Our Accounts department is verifying your PhonePe UTR number with the bank statements. Please check back later!
                  </p>
                )}
                {result.status === 'approved' && (
                  <p className="text-sm text-emerald-300/80 font-light leading-relaxed">
                    Congratulations! Your payment has been verified and your registration is officially confirmed. Keep an eye on your email for further updates.
                  </p>
                )}
                {result.status === 'rejected' && (
                  <p className="text-sm text-rose-300/80 font-light leading-relaxed">
                    Unfortunately, your registration was rejected. This usually happens if the payment screenshot was invalid or the UTR number could not be verified. Please contact a coordinator if you believe this is a mistake.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
