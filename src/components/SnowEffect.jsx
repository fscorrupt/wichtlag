import React, { useMemo } from 'react';

export default function SnowEffect() {
  const flakes = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      left: `${(i * 3.6 + Math.random() * 2).toFixed(1)}%`,
      animationDuration: `${(7 + Math.random() * 8).toFixed(1)}s`,
      animationDelay: `${(Math.random() * 6).toFixed(1)}s`,
      fontSize: `${(10 + Math.random() * 14).toFixed(0)}px`,
      opacity: (0.15 + Math.random() * 0.45).toFixed(2),
      char: ['❄', '❅', '❆', '•'][i % 4]
    }));
  }, []);

  return (
    <div className="snow-container" aria-hidden="true">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="snowflake"
          style={{
            left: f.left,
            animationDuration: f.animationDuration,
            animationDelay: f.animationDelay,
            fontSize: f.fontSize,
            opacity: f.opacity
          }}
        >
          {f.char}
        </span>
      ))}
    </div>
  );
}
