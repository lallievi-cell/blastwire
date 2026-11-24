import type { BiomeId } from '../types/game';

interface AmbientMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
}

const BIOME_PALETTES: Record<BiomeId, string[]> = {
  industrial: ['#f59e0b', '#e4b15a', '#fb923c', '#94a3b8'],
  quartz: ['#56c8e0', '#bae6fd', '#4ade80', '#e2e8f0'],
  forge: ['#ff5636', '#f59e0b', '#fbbf24', '#ff8c42'],
  bunker: ['#eab308', '#d4a146', '#94a3b8', '#f59e0b'],
  emp: ['#38bdf8', '#7dd3fc', '#fde047', '#e0f2fe'],
  omega: ['#ef4444', '#ff5636', '#f59e0b', '#fca5a5'],
};

/**
 * Full-screen atmospheric depth layer: floating embers, furnace sparks,
 * and subtle volumetric dust reactive to the current sector biome.
 */
export class AmbientFx {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private biome: BiomeId = 'industrial';
  private motes: AmbientMote[] = [];
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.seedMotes();
    window.addEventListener('resize', () => this.resize());
    this.rafId = requestAnimationFrame((ts) => this.loop(ts));
  }

  setBiome(biome: BiomeId): void {
    if (this.biome === biome) return;
    this.biome = biome;
    const colors = BIOME_PALETTES[biome];
    for (const m of this.motes) {
      m.color = colors[Math.floor(Math.random() * colors.length)];
    }
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private seedMotes(): void {
    const count = window.innerWidth < 700 ? 22 : 38;
    const colors = BIOME_PALETTES[this.biome];
    this.motes = [];
    for (let i = 0; i < count; i++) {
      this.motes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: -0.18 - Math.random() * 0.45,
        size: 1.1 + Math.random() * 2.1,
        alpha: 0.14 + Math.random() * 0.34,
        phase: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  private loop(ts: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    const t = ts * 0.0012;

    for (const m of this.motes) {
      m.x += m.vx + Math.sin(t + m.phase) * 0.18;
      m.y += m.vy;

      if (m.y < -12) {
        m.y = this.height + 12;
        m.x = Math.random() * this.width;
      }
      if (m.x < -12) m.x = this.width + 12;
      if (m.x > this.width + 12) m.x = -12;

      const flicker = 0.65 + 0.35 * Math.sin(t * 2.4 + m.phase);
      ctx.save();
      ctx.globalAlpha = m.alpha * flicker;
      ctx.fillStyle = m.color;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = m.size * 3.5;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this.rafId = requestAnimationFrame((next) => this.loop(next));
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
