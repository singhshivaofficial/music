import React, { useEffect, useRef } from 'react';
import { VisualizerMode } from '../types';
import { BarChart2, Radio, Activity, Eye, Zap } from 'lucide-react';
import { motion } from 'motion/react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  mode: VisualizerMode;
  onModeChange: (mode: VisualizerMode) => void;
  height?: number;
  compact?: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  mode,
  onModeChange,
  height = 140,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Equalizer state preservation for smooth freeze & pause
  const barValuesRef = useRef<number[]>(new Array(36).fill(10));
  const peaksRef = useRef<number[]>(new Array(36).fill(12));
  const lastTimeRef = useRef<number>(performance.now());
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const barCount = 36;

    const render = () => {
      const now = performance.now();
      const delta = Math.min(50, now - lastTimeRef.current);
      lastTimeRef.current = now;

      // Update rhythmic phase when playing
      if (isPlaying) {
        phaseRef.current += delta * 0.005;
      }

      const phase = phaseRef.current;
      const width = canvas.width / (window.devicePixelRatio || 1) || canvas.width;
      const h = canvas.height / (window.devicePixelRatio || 1) || canvas.height;

      ctx.save();
      ctx.clearRect(0, 0, width, h);

      if (mode === 'bars') {
        const barSpacing = 4;
        const totalBarWidth = width / barCount;
        const barWidth = Math.max(3, totalBarWidth - barSpacing);

        // Musical BPM simulation (approx 124 BPM rhythm kick)
        const kickPulse = Math.pow(Math.max(0, Math.sin(phase * 1.8)), 4) * 0.45;
        const snarePulse = Math.pow(Math.max(0, Math.sin(phase * 3.6 + 1.2)), 3) * 0.3;

        for (let i = 0; i < barCount; i++) {
          const normIndex = i / barCount;

          if (isPlaying) {
            // Harmonic wave formula creating natural musical EQ spectrum
            const wave1 = Math.sin(phase * 2.2 + i * 0.35) * 0.3;
            const wave2 = Math.cos(phase * 1.4 - i * 0.25) * 0.25;
            const wave3 = Math.sin(phase * 4.1 + i * 0.6) * 0.15;
            
            // Low-end bass boost on left, natural tapering off toward high frequencies
            const freqCurve = Math.max(0.2, 1.0 - normIndex * 0.55);
            const beatEffect = normIndex < 0.35 ? kickPulse : snarePulse;

            const targetHeight = Math.max(
              6,
              (freqCurve * (0.35 + wave1 + wave2 + wave3) + beatEffect) * (h - 16)
            );

            // Fluid spring-like smoothing
            barValuesRef.current[i] += (targetHeight - barValuesRef.current[i]) * 0.18;
          } else {
            // When paused: graceful freeze with tiny tranquil ambient resting floor
            barValuesRef.current[i] = Math.max(6, barValuesRef.current[i] * 0.96);
          }

          const currentBarH = barValuesRef.current[i];
          const x = i * totalBarWidth + barSpacing / 2;
          const y = h - currentBarH;

          // Peak cap gravity calculation
          if (currentBarH > (peaksRef.current[i] || 0)) {
            peaksRef.current[i] = currentBarH;
          } else if (isPlaying) {
            peaksRef.current[i] = Math.max(6, (peaksRef.current[i] || 6) - 0.7);
          }

          // Sleek gradient matching purple glassmorphic theme (#60519b -> #bfc0d1 -> white)
          const grad = ctx.createLinearGradient(0, y, 0, h);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.2, '#bfc0d1');
          grad.addColorStop(0.65, '#60519b');
          grad.addColorStop(1, 'rgba(96, 81, 155, 0.15)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, barWidth, currentBarH, [4, 4, 0, 0]);
          } else {
            ctx.rect(x, y, barWidth, currentBarH);
          }
          ctx.fill();

          // Peak cap indicator
          if (peaksRef.current[i] > 8) {
            const peakY = Math.max(2, h - peaksRef.current[i] - 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#60519b';
            ctx.shadowBlur = 8;
            ctx.fillRect(x, peakY, barWidth, 2);
            ctx.shadowBlur = 0;
          }
        }
      } else if (mode === 'circle') {
        // Cosmic Ring
        const centerX = width / 2;
        const centerY = h / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.42;
        const points = 48;
        const angleStep = (Math.PI * 2) / points;

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = i * angleStep;
          let val = 0;
          if (isPlaying) {
            val =
              (Math.sin(phase * 2.5 + i * 0.5) * 0.25 +
                Math.cos(phase * 1.8 - i * 0.3) * 0.2 +
                0.2) *
              (h * 0.3);
          } else {
            val = Math.sin(i * 0.5) * 4;
          }

          const r = baseRadius + val;
          const x = centerX + Math.cos(angle + phase * 0.1) * r;
          const y = centerY + Math.sin(angle + phase * 0.1) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.strokeStyle = '#60519b';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(96, 81, 155, 0.9)';
        ctx.shadowBlur = 16;
        ctx.stroke();

        ctx.fillStyle = 'rgba(96, 81, 155, 0.18)';
        ctx.fill();

        // Pulsing glowing center core
        const coreR = Math.max(
          8,
          baseRadius * 0.35 + (isPlaying ? Math.sin(phase * 3) * 6 : 0)
        );
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(191, 192, 209, 0.3)';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fill();
      } else if (mode === 'wave') {
        // Fluid Audio Waveform
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#60519b';
        ctx.shadowColor = '#60519b';
        ctx.shadowBlur = 14;

        const points = 64;
        const step = width / points;

        for (let i = 0; i <= points; i++) {
          const x = i * step;
          let y = h / 2;
          if (isPlaying) {
            y +=
              Math.sin(phase * 3.2 + i * 0.22) * (h * 0.22) +
              Math.cos(phase * 1.9 + i * 0.45) * (h * 0.12);
          } else {
            y += Math.sin(i * 0.25) * 3;
          }

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.stroke();

        // Gradient under the wave
        ctx.lineTo(width, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        const waveGrad = ctx.createLinearGradient(0, 0, 0, h);
        waveGrad.addColorStop(0, 'rgba(96, 81, 155, 0.35)');
        waveGrad.addColorStop(1, 'rgba(96, 81, 155, 0)');
        ctx.fillStyle = waveGrad;
        ctx.fill();
      } else if (mode === 'aura') {
        // Aura Pulsing Orb
        const centerX = width / 2;
        const centerY = h / 2;
        const pulse = isPlaying ? Math.sin(phase * 2.8) * 0.2 + 0.5 : 0.3;
        const maxR = Math.min(centerX, centerY) * (0.4 + pulse * 0.5);

        const radial = ctx.createRadialGradient(
          centerX,
          centerY,
          4,
          centerX,
          centerY,
          Math.max(12, maxR)
        );
        radial.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        radial.addColorStop(0.2, 'rgba(191, 192, 209, 0.7)');
        radial.addColorStop(0.55, 'rgba(96, 81, 155, 0.55)');
        radial.addColorStop(0.85, 'rgba(49, 50, 62, 0.25)');
        radial.addColorStop(1, 'rgba(10, 10, 15, 0)');

        ctx.fillStyle = radial;
        ctx.beginPath();
        ctx.arc(centerX, centerY, Math.max(12, maxR), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, mode]);

  // Responsive canvas scaling with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateSize = (w: number) => {
      const dpr = window.devicePixelRatio || 1;
      const targetWidth = w || container.clientWidth || 600;
      canvas.width = targetWidth * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    updateSize(container.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) {
          updateSize(width);
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [height]);

  const modes: { id: VisualizerMode; label: string; icon: React.ReactNode }[] = [
    { id: 'bars', label: 'Equalizer', icon: <BarChart2 className="w-3.5 h-3.5" /> },
    { id: 'circle', label: 'Cosmic Ring', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'wave', label: 'Waveform', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'aura', label: 'Aura', icon: <Eye className="w-3.5 h-3.5" /> },
  ];

  return (
    <motion.div
      id="aether-visualizer-container"
      ref={containerRef}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative w-full rounded-2xl overflow-hidden glass border border-[#31323e] p-2 flex flex-col items-center justify-center ${
        compact ? 'py-1' : 'py-3'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="w-full pointer-events-none"
        style={{ height: `${height}px` }}
      />

      {/* Real-time Status Badge */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1e202c]/80 border border-[#31323e] text-[10px] text-[#bfc0d1]">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-[#bfc0d1]/40'
          }`}
        />
        <span className="font-mono">{isPlaying ? 'LIVE SPECTRUM' : 'FROZEN'}</span>
      </div>

      {/* Visualizer Mode Controls */}
      <div
        id="visualizer-mode-bar"
        className="absolute bottom-2 right-2 flex items-center gap-1 bg-[#0a0a0f]/85 backdrop-blur-md rounded-xl p-1 border border-[#31323e] shadow-md z-10"
      >
        {modes.map((m) => {
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              id={`viz-mode-${m.id}`}
              onClick={() => onModeChange(m.id)}
              title={m.label}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg transition-all ${
                isActive
                  ? 'bg-[#60519b] text-white font-bold accent-glow'
                  : 'text-[#bfc0d1]/70 hover:text-white hover:bg-white/5'
              }`}
            >
              {m.icon}
              {!compact && <span>{m.label}</span>}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};
