'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function AmbientMusic() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Beautiful ambient forest sound loop
    audioRef.current = new Audio('https://www.soundjay.com/nature/sounds/forest-wind-1.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setPlaying(true);
      }).catch(err => {
        console.warn("Audio autoplay blocked by browser policies:", err);
      });
    }
  };

  return (
    <button
      onClick={togglePlay}
      className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-12 h-12 rounded-full glass-panel border border-neon/30 text-neon hover:border-neon hover:scale-110 active:scale-95 transition-all shadow-lg cursor-pointer"
      title={playing ? "Mute Forest Ambience" : "Play Forest Ambience"}
    >
      {playing ? (
        <Volume2 className="w-5 h-5 animate-pulse" />
      ) : (
        <VolumeX className="w-5 h-5 text-emerald-500/50" />
      )}
    </button>
  );
}
