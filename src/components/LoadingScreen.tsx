'use client';

import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    // Show loading for 2 seconds then fade out
    const t1 = setTimeout(() => setFade(true), 1500);
    const t2 = setTimeout(() => setVisible(false), 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`camera-shutter-wrap ${
        fade ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-8">
        <div className="camera-lens">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="camera-blade"
              style={{ transform: `rotate(${i * 45}deg)` }}
            />
          ))}
          <div className="z-10 text-4xl">📸</div>
        </div>

        <div className="text-center font-outfit animate-pulse">
          <h2 className="text-2xl font-bold tracking-widest text-neon neon-text-glow uppercase">
            Leaf & Lens
          </h2>
          <p className="text-xs tracking-wider text-emerald-400/60 mt-1 uppercase font-mono">
            BS&H Dept · VIIT
          </p>
        </div>
      </div>
    </div>
  );
}
