import { computeArcNetwork } from '../engine/DetonationResolver';
import type { Cell, GameSnapshot, WireModuleId } from '../types/game';
import { MODULES } from '../data/modules';

interface CellGeometry {
  x: number;
  y: number;
  size: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  square: boolean;
  smoke?: boolean;
  color: string;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  lineWidth: number;
  color: string;
}

interface Beam {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  jagged: boolean;
  life: number;
  decay: number;
}

interface Popup {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  big: boolean;
  life: number;
  decay: number;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export class FxEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private wrapper: HTMLElement;
  private flashEl: HTMLElement;
  private gridEl: HTMLElement;
  private getState: () => GameSnapshot;
  private getHovered: () => { r: number; c: number } | null;

  private cellCache = new Map<string, CellGeometry>();
  private cssWidth = 1;
  private cssHeight = 1;
  private particles: Particle[] = [];
  private shockwaves: Shockwave[] = [];
  private beams: Beam[] = [];
  private popups: Popup[] = [];
  private lastSparkTs = 0;
  private lastEmberTs = 0;
  private rafId = 0;
  private shakeTimer = 0;
  private flashTimer = 0;

  constructor(
    canvas: HTMLCanvasElement,
    wrapper: HTMLElement,
    flashEl: HTMLElement,
    gridEl: HTMLElement,
    getState: () => GameSnapshot,
    getHovered: () => { r: number; c: number } | null,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.wrapper = wrapper;
    this.flashEl = flashEl;
    this.gridEl = gridEl;
    this.getState = getState;
    this.getHovered = getHovered;

    this.syncLayout();
    window.addEventListener('resize', () => this.syncLayout());
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.syncLayout());
      ro.observe(this.wrapper);
      ro.observe(this.gridEl);
    }
    this.rafId = requestAnimationFrame((ts) => this.loop(ts));
  }

  /** Rebuilds canvas backing size and O(1) cell geometry cache (never called inside rAF). */
  syncLayout(): void {
    const rect = this.wrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssWidth = Math.max(1, rect.width);
    this.cssHeight = Math.max(1, rect.height);
    this.canvas.width = Math.floor(this.cssWidth * dpr);
    this.canvas.height = Math.floor(this.cssHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.cellCache.clear();
    const cRect = this.canvas.getBoundingClientRect();
    const children = this.gridEl.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      const r = el.dataset.r;
      const c = el.dataset.c;
      if (r === undefined || c === undefined) continue;
      const eRect = el.getBoundingClientRect();
      this.cellCache.set(`${r},${c}`, {
        x: eRect.left - cRect.left + eRect.width / 2,
        y: eRect.top - cRect.top + eRect.height / 2,
        size: eRect.width,
      });
    }
  }

  private getCenter(r: number, c: number): CellGeometry {
    return this.cellCache.get(`${r},${c}`) ?? { x: 0, y: 0, size: 32 };
  }

  spawnExplosion(r: number, c: number, color = '#e4b15a', scale = 1): void {
    const { x, y, size } = this.getCenter(r, c);
    this.shockwaves.push({
      x,
      y,
      radius: size * 0.2,
      maxRadius: size * (2.1 * scale),
      alpha: 0.95,
      lineWidth: 3.4,
      color,
    });
    this.shockwaves.push({
      x,
      y,
      radius: size * 0.1,
      maxRadius: size * (1.15 * scale),
      alpha: 0.85,
      lineWidth: 2,
      color: '#fff7ed',
    });

    const count = Math.floor(18 * scale);
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const spd = (1.7 + Math.random() * 4.2) * scale;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        decay: 0.024 + Math.random() * 0.022,
        size: 2.2 + Math.random() * 3.8,
        square: Math.random() > 0.45,
        color: Math.random() > 0.28 ? color : '#fff7ed',
      });
    }
  }

  spawnBeam(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    style: 'arc' | 'prism' | 'cross' | 'omega',
  ): void {
    const p1 = this.getCenter(r1, c1);
    const p2 = this.getCenter(r2, c2);
    const color =
      style === 'prism'
        ? '#e0f2fe'
        : style === 'arc'
          ? '#58c4dc'
          : style === 'omega'
            ? '#ff4d2e'
            : '#ff6b4a';
    this.beams.push({
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      color,
      jagged: style === 'arc' || style === 'prism',
      life: 1,
      decay: 0.028,
    });
  }

  spawnPopup(r: number, c: number, text: string, color = '#e4b15a', big = false): void {
    const { x, y } = this.getCenter(r, c);
    this.popups.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y - 5,
      vy: -0.95,
      text,
      color,
      big,
      life: 1,
      decay: 0.0155,
    });
  }

  flashBoard(color = 'rgba(228, 177, 90, 0.22)'): void {
    this.flashEl.style.background = color;
    this.flashEl.style.opacity = '1';
    window.clearTimeout(this.flashTimer);
    this.flashTimer = window.setTimeout(() => {
      this.flashEl.style.opacity = '0';
    }, 125);
  }

  shakeBoard(intensity = 6): void {
    const dx = (Math.random() - 0.5) * intensity * 2;
    const dy = (Math.random() - 0.5) * intensity * 2;
    this.wrapper.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    window.clearTimeout(this.shakeTimer);
    this.shakeTimer = window.setTimeout(() => {
      this.wrapper.style.transform = 'translate(0, 0)';
    }, 65);
  }

  private spawnAmbientSparks(wired: Cell[]): void {
    if (wired.length === 0) return;
    const w = wired[Math.floor(Math.random() * wired.length)];
    const { x, y, size } = this.getCenter(w.r, w.c);
    const colors: Record<WireModuleId, string> = {
      c4: '#e4b15a',
      arc: '#58c4dc',
      cross: '#ff5d47',
      amp: '#f0c85c',
      prism: '#bae6fd',
      siphon: '#4ade80',
    };
    this.particles.push({
      x: x + (Math.random() - 0.5) * size * 0.52,
      y: y + (Math.random() - 0.5) * size * 0.52,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -0.55 - Math.random() * 0.7,
      life: 0.85,
      decay: 0.028,
      size: 1.7 + Math.random() * 1.4,
      square: false,
      color: (w.wire && colors[w.wire]) || '#e4b15a',
    });
  }

  private spawnCraterEmbers(board: Cell[][]): void {
    const craters: Cell[] = [];
    for (const row of board) {
      for (const cell of row) {
        if (cell.crater) craters.push(cell);
      }
    }
    if (craters.length === 0) return;
    const target = craters[Math.floor(Math.random() * craters.length)];
    const { x, y, size } = this.getCenter(target.r, target.c);
    this.particles.push({
      x: x + (Math.random() - 0.5) * size * 0.4,
      y: y + (Math.random() - 0.5) * size * 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -0.35 - Math.random() * 0.4,
      life: 0.65,
      decay: 0.012,
      size: 3.5 + Math.random() * 3,
      square: false,
      smoke: true,
      color: 'rgba(180, 165, 150, 0.25)',
    });
  }

  private drawTacticalPreviews(ctx: CanvasRenderingContext2D, snap: GameSnapshot): void {
    if (!snap.board.length || snap.isDetonating) return;

    const wired: Cell[] = [];
    for (const row of snap.board) {
      for (const cell of row) {
        if (cell.wire) wired.push(cell);
      }
    }

    const t = performance.now() / 1000;
    const rows = snap.board.length;
    const cols = snap.board[0]?.length ?? 0;
    const allowDiag = snap.relics.includes('arc_diag');
    const ampRadius = snap.relics.includes('thermal_amp') ? 2 : 1;
    const crossRange = snap.relics.includes('cross_reach') ? 4 : 2;

    ctx.save();

    // A. Existing Amp fields
    for (const w of wired) {
      if (w.wire !== 'amp') continue;
      const center = this.getCenter(w.r, w.c);
      const span = center.size * (ampRadius * 2 + 1) + ampRadius * 8;
      ctx.strokeStyle = 'rgba(240, 200, 92, 0.62)';
      ctx.fillStyle = 'rgba(240, 200, 92, 0.08)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -t * 16;
      drawRoundedRect(ctx, center.x - span / 2, center.y - span / 2, span, span, 8);
      ctx.fill();
      ctx.stroke();
    }

    // B. Existing Cross sightlines
    for (const w of wired) {
      if (w.wire !== 'cross') continue;
      const p0 = this.getCenter(w.r, w.c);
      const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ];
      ctx.strokeStyle = 'rgba(255, 93, 71, 0.62)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -t * 20;
      for (const [dr, dc] of dirs) {
        const er = Math.max(0, Math.min(rows - 1, w.r + dr * crossRange));
        const ec = Math.max(0, Math.min(cols - 1, w.c + dc * crossRange));
        const pe = this.getCenter(er, ec);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(pe.x, pe.y);
        ctx.stroke();
      }
    }

    // C. Existing Arc + Prism 90° deflected network
    const net = computeArcNetwork(wired, allowDiag);
    for (const seg of net.segments) {
      const pa = this.getCenter(seg.from.r, seg.from.c);
      const pb = this.getCenter(seg.to.r, seg.to.c);
      ctx.strokeStyle = seg.isDeflected
        ? 'rgba(224, 242, 254, 0.92)'
        : 'rgba(88, 196, 220, 0.88)';
      ctx.shadowColor = seg.isDeflected ? '#bae6fd' : '#58c4dc';
      ctx.shadowBlur = 7;
      ctx.lineWidth = seg.isDeflected ? 2.4 : 2.6;
      ctx.setLineDash(seg.isDeflected ? [4, 4] : [7, 4]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // D. Ghost Hover Projection
    const hov = this.getHovered();
    if (hov && snap.firstClickDone) {
      const cell = snap.board[hov.r]?.[hov.c];
      if (cell && !cell.revealed && !cell.armored) {
        const tool = snap.activeTool;
        if (tool === 'sonar' && snap.charges.sonar > 0) {
          const center = this.getCenter(hov.r, hov.c);
          const span = center.size * 3 + 8;
          ctx.strokeStyle = 'rgba(74, 222, 128, 0.78)';
          ctx.fillStyle = 'rgba(74, 222, 128, 0.1)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          drawRoundedRect(ctx, center.x - span / 2, center.y - span / 2, span, span, 8);
          ctx.fill();
          ctx.stroke();
        } else if (MODULES[tool].isWire && !cell.wire && snap.charges[tool as WireModuleId] > 0) {
          if (tool === 'amp') {
            const center = this.getCenter(hov.r, hov.c);
            const span = center.size * (ampRadius * 2 + 1) + ampRadius * 8;
            ctx.strokeStyle = 'rgba(240, 200, 92, 0.45)';
            ctx.fillStyle = 'rgba(240, 200, 92, 0.06)';
            ctx.lineWidth = 1.6;
            ctx.setLineDash([3, 4]);
            drawRoundedRect(ctx, center.x - span / 2, center.y - span / 2, span, span, 8);
            ctx.fill();
            ctx.stroke();
          } else if (tool === 'cross') {
            const p0 = this.getCenter(hov.r, hov.c);
            const dirs = [
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ];
            ctx.strokeStyle = 'rgba(255, 93, 71, 0.48)';
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 4]);
            for (const [dr, dc] of dirs) {
              const er = Math.max(0, Math.min(rows - 1, hov.r + dr * crossRange));
              const ec = Math.max(0, Math.min(cols - 1, hov.c + dc * crossRange));
              const pe = this.getCenter(er, ec);
              ctx.beginPath();
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(pe.x, pe.y);
              ctx.stroke();
            }
          }

          // Project hypothetical Arc & Prism links formed by placing this wire here
          const hyp = [
            ...wired.map((w) => ({ r: w.r, c: w.c, wire: w.wire })),
            { r: hov.r, c: hov.c, wire: tool as WireModuleId },
          ];
          const hypNet = computeArcNetwork(hyp, allowDiag);
          const existingKeys = new Set(
            net.segments.map((s) => `${s.from.r},${s.from.c}-${s.to.r},${s.to.c}`),
          );
          for (const seg of hypNet.segments) {
            const k = `${seg.from.r},${seg.from.c}-${seg.to.r},${seg.to.c}`;
            if (existingKeys.has(k)) continue;
            const pa = this.getCenter(seg.from.r, seg.from.c);
            const pb = this.getCenter(seg.to.r, seg.to.c);
            ctx.strokeStyle = seg.isDeflected
              ? 'rgba(224, 242, 254, 0.55)'
              : 'rgba(88, 196, 220, 0.55)';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 5]);
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.stroke();
          }
        }
      }
    }

    ctx.restore();
  }

  private loop(ts: number): void {
    const ctx = this.ctx;
    const snap = this.getState();
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    if (ts - this.lastSparkTs > 190 && !snap.isDetonating) {
      this.lastSparkTs = ts;
      const wired: Cell[] = [];
      for (const row of snap.board) {
        for (const cell of row) {
          if (cell.wire) wired.push(cell);
        }
      }
      this.spawnAmbientSparks(wired);
    }

    if (ts - this.lastEmberTs > 420 && !snap.isDetonating) {
      this.lastEmberTs = ts;
      this.spawnCraterEmbers(snap.board);
    }

    this.drawTacticalPreviews(ctx, snap);

    // Beams
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, b.life);

      const pts = [{ x: b.x1, y: b.y1 }];
      if (b.jagged) {
        const steps = 8;
        for (let s = 1; s < steps; s++) {
          const f = s / steps;
          pts.push({
            x: b.x1 + (b.x2 - b.x1) * f + (Math.random() - 0.5) * 13,
            y: b.y1 + (b.y2 - b.y1) * f + (Math.random() - 0.5) * 13,
          });
        }
      }
      pts.push({ x: b.x2, y: b.y2 });

      ctx.strokeStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = b.jagged ? 5.2 : 7.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.lineWidth = b.jagged ? 2 : 2.8;
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      ctx.restore();
      b.life -= b.decay;
      if (b.life <= 0) this.beams.splice(i, 1);
    }

    // Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += (s.maxRadius - s.radius) * 0.22;
      s.alpha -= 0.045;
      if (s.alpha <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.lineWidth;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles & Crater smoke
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (!p.smoke) {
        p.vx *= 0.94;
        p.vy *= 0.94;
      }
      p.life -= p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      const sz = p.smoke ? p.size * (1.3 - p.life * 0.4) : p.size * p.life;
      if (p.square) {
        ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, sz), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Floating popups
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y += pop.vy;
      pop.life -= pop.decay;
      if (pop.life <= 0) {
        this.popups.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.min(1, pop.life * 1.5);
      ctx.font = `700 ${pop.big ? 16 : 13}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(7, 9, 14, 0.95)';
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }

    this.rafId = requestAnimationFrame((nextTs) => this.loop(nextTs));
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}
