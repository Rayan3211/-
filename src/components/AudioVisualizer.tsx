import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  audioElement: HTMLAudioElement | null;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying, audioElement }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 48;
      const barWidth = width / numBars - 2;

      for (let i = 0; i < numBars; i++) {
        // Calculate dynamic bar height
        let barHeight = 6;
        if (isPlaying) {
          const wave1 = Math.sin(phase + i * 0.22);
          const wave2 = Math.cos(phase * 0.7 + i * 0.15);
          const wave3 = Math.sin(phase * 1.3 - i * 0.35);
          const combined = Math.abs((wave1 + wave2 + wave3) / 3);
          // Emphasize center frequencies like documentary speech
          const bellCurve = Math.sin((i / numBars) * Math.PI);
          barHeight = 6 + combined * bellCurve * (height - 12);
        }

        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        // Gradient from warm gold to deep amber
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isPlaying) {
          gradient.addColorStop(0, '#fef08a'); // yellow-200
          gradient.addColorStop(0.5, '#f59e0b'); // amber-500
          gradient.addColorStop(1, '#b45309'); // amber-700
        } else {
          gradient.addColorStop(0, '#374151');
          gradient.addColorStop(1, '#1f2937');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        // Rounded bars
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (isPlaying) {
        phase += 0.08;
      }
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, audioElement]);

  return (
    <div className="w-full flex items-center justify-center py-2 px-3 bg-black/40 rounded-xl border border-amber-950/40 shadow-inner">
      <canvas
        ref={canvasRef}
        width={560}
        height={48}
        className="w-full max-w-xl h-12 block"
      />
    </div>
  );
};
