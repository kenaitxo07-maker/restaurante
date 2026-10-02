/** Texturas generadas en el navegador: no hay que descargar imágenes. */
import * as THREE from 'three';

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Halo de luz cálida (para la llama, el núcleo de los anillos y destellos). */
export const glowTexture = () =>
  canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,236,200,0.7)');
    g.addColorStop(0.45, 'rgba(255,200,140,0.18)');
    g.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });

/** Llama de vela en forma de gota. */
export const flameTexture = () =>
  canvasTexture(128, (ctx, s) => {
    ctx.translate(s / 2, s * 0.62);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.42);
    g.addColorStop(0, 'rgba(255,255,240,1)');
    g.addColorStop(0.25, 'rgba(255,226,160,0.95)');
    g.addColorStop(0.6, 'rgba(255,160,70,0.5)');
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.58);
    ctx.bezierCurveTo(s * 0.22, -s * 0.22, s * 0.2, s * 0.22, 0, s * 0.3);
    ctx.bezierCurveTo(-s * 0.2, s * 0.22, -s * 0.22, -s * 0.22, 0, -s * 0.58);
    ctx.fill();
  });

/** Sombra de contacto suave bajo los objetos de la mesa. */
export const shadowTexture = () =>
  canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.85)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.4)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });

/** Veta de nogal oscuro para la mesa. */
export const woodTexture = () => {
  const tex = canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#2a1f19';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      const y = Math.random() * s;
      const a = 0.03 + Math.random() * 0.07;
      ctx.strokeStyle = Math.random() > 0.5 ? `rgba(70,50,38,${a})` : `rgba(10,7,5,${a * 1.6})`;
      ctx.lineWidth = 0.5 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= s; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 4 + Math.random() * 1.5);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = 4;
  return tex;
};
