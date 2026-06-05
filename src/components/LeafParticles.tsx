'use client';

import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  emoji: string;
  left: string;
  size: string;
  delay: string;
  duration: string;
}

export default function LeafParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const emojis = ['🍃', '🌿', '🍀', '🌱', '🍂'];
    const list: Particle[] = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      left: `${Math.random() * 100}vw`,
      size: `${14 + Math.random() * 20}px`,
      delay: `${Math.random() * 6}s`,
      duration: `${6 + Math.random() * 10}s`
    }));
    setParticles(list);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <span
          key={p.id}
          className="floating-leaf"
          style={{
            left: p.left,
            fontSize: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
