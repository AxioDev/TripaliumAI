'use client';

import { useEffect, useState } from 'react';

interface ConfettiProps {
  active: boolean;
  count?: number;
}

export function Confetti({ active, count = 12 }: ConfettiProps) {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    if (active) {
      setParticles(Array.from({ length: count }, (_, i) => i));
      const timer = setTimeout(() => setParticles([]), 1000);
      return () => clearTimeout(timer);
    }
  }, [active, count]);

  if (!particles.length) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full animate-confetti"
          style={{
            left: `${30 + Math.random() * 40}%`,
            top: '40%',
            backgroundColor: i % 3 === 0 ? 'hsl(var(--success))' : i % 3 === 1 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            animationDelay: `${i * 0.05}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}
