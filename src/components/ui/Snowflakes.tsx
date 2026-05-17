"use client";

import { useEffect, useState } from "react";

export function Snowflakes() {
  const [snowflakes, setSnowflakes] = useState<Array<{ id: number; left: string; animationDuration: string; opacity: number }>>([]);

  useEffect(() => {
    // Generate snowflakes only on the client side to avoid hydration mismatch
    const flakes = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 3 + 4}s`, // 4-7s
      opacity: Math.random() * 0.5 + 0.3, // 0.3-0.8
    }));
    setSnowflakes(flakes);
  }, []);

  if (snowflakes.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute top-[-10%] rounded-full bg-white blur-[1px] animate-snow"
          style={{
            left: flake.left,
            width: `${Math.random() * 4 + 4}px`, // 4-8px
            height: `${Math.random() * 4 + 4}px`, // 4-8px
            opacity: flake.opacity,
            animationDuration: flake.animationDuration,
            animationDelay: `-${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}
