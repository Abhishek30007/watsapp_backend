const { createCanvas } = require('canvas');

/**
 * Generates a dynamic greeting card PNG as a Buffer.
 * @param {string} name       - Recipient name.
 * @param {string} eventType  - e.g. Birthday, Anniversary.
 * @param {string} message    - The greeting message (max ~200 chars recommended).
 * @returns {Buffer}          - PNG image buffer.
 */
function generateCard(name, eventType, message) {
  const W = 900, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // ── Background gradient (deep dark-purple) ────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0,   '#0d0b1e');
  bgGrad.addColorStop(0.5, '#12102a');
  bgGrad.addColorStop(1,   '#0a0818');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Decorative radial glows ───────────────────────────────────────────
  const drawGlow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  drawGlow(150,  100, 280, 'rgba(147,51,234,0.18)');
  drawGlow(750,  400, 260, 'rgba(236,72,153,0.18)');
  drawGlow(450,  250, 200, 'rgba(59,130,246,0.08)');

  // ── Glass card panel ──────────────────────────────────────────────────
  const panelX = 50, panelY = 50, panelW = W - 100, panelH = H - 100, radius = 24;
  ctx.beginPath();
  ctx.moveTo(panelX + radius, panelY);
  ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + panelH, radius);
  ctx.arcTo(panelX + panelW, panelY + panelH, panelX, panelY + panelH, radius);
  ctx.arcTo(panelX, panelY + panelH, panelX, panelY, radius);
  ctx.arcTo(panelX, panelY, panelX + panelW, panelY, radius);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Accent top bar ────────────────────────────────────────────────────
  const barGrad = ctx.createLinearGradient(panelX, 0, panelX + panelW, 0);
  barGrad.addColorStop(0, '#9333ea');
  barGrad.addColorStop(1, '#ec4899');
  ctx.fillStyle = barGrad;
  ctx.beginPath();
  ctx.moveTo(panelX + radius, panelY);
  ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + 6, radius);
  ctx.lineTo(panelX + panelW, panelY + 6);
  ctx.lineTo(panelX, panelY + 6);
  ctx.arcTo(panelX, panelY, panelX + panelW, panelY, radius);
  ctx.closePath();
  ctx.fill();

  // ── Event type pill ───────────────────────────────────────────────────
  const pillX = 90, pillY = 90, pillW = 160, pillH = 30;
  ctx.fillStyle = 'rgba(147,51,234,0.25)';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, 999);
  ctx.fill();
  ctx.strokeStyle = 'rgba(147,51,234,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#c084fc';
  ctx.textAlign = 'center';
  ctx.fillText(`✦ ${eventType.toUpperCase()} ✦`, pillX + pillW / 2, pillY + 20);

  // ── Emoji decoration ─────────────────────────────────────────────────
  const emojiMap = {
    birthday: '🎂', anniversary: '💍', graduation: '🎓',
    wedding: '💒', promotion: '🚀', farewell: '👋',
  };
  const emoji = Object.entries(emojiMap).find(([k]) =>
    eventType.toLowerCase().includes(k))?.[1] || '🎉';

  ctx.font = '80px serif';
  ctx.textAlign = 'right';
  ctx.fillText(emoji, W - 90, 185);

  // ── Recipient name ────────────────────────────────────────────────────
  ctx.textAlign = 'left';
  ctx.font = 'bold 52px sans-serif';
  const nameGrad = ctx.createLinearGradient(90, 0, 90 + 400, 0);
  nameGrad.addColorStop(0, '#f8fafc');
  nameGrad.addColorStop(1, '#c084fc');
  ctx.fillStyle = nameGrad;
  ctx.fillText(name, 90, 190);

  // ── Divider line ──────────────────────────────────────────────────────
  const divGrad = ctx.createLinearGradient(90, 0, W - 90, 0);
  divGrad.addColorStop(0, 'rgba(147,51,234,0.7)');
  divGrad.addColorStop(0.5, 'rgba(236,72,153,0.7)');
  divGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = divGrad;
  ctx.fillRect(90, 208, panelW - 80, 2);

  // ── Message text (word-wrapped) ───────────────────────────────────────
  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'rgba(241,245,249,0.82)';
  ctx.textAlign = 'left';

  const wrapText = (text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line.trim(), x, currentY);
        line = word + ' ';
        currentY += lineHeight;
        if (currentY > H - 120) { ctx.fillText('...', x, currentY); break; }
      } else {
        line = test;
      }
    }
    if (line.trim()) ctx.fillText(line.trim(), x, currentY);
  };
  wrapText(message, 90, 255, panelW - 100, 34);

  // ── Footer branding ───────────────────────────────────────────────────
  ctx.font = '13px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.textAlign = 'left';
  ctx.fillText('✦ Sent via CelebrateMate — Your Smart Celebration Gateway', 90, H - 65);

  // Gradient line footer
  const footGrad = ctx.createLinearGradient(90, 0, W - 90, 0);
  footGrad.addColorStop(0, 'rgba(147,51,234,0.4)');
  footGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = footGrad;
  ctx.fillRect(90, H - 80, panelW - 80, 1);

  return canvas.toBuffer('image/png');
}

module.exports = { generateCard };
