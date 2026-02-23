'use client';

import { TentConfig, LayoutResult, generateAcPositions } from '@/lib/types';
import { getWingRect, getTotalBounds } from '@/lib/seatCalculator';

const EXPORT_SCALE = 2; // high-res multiplier
const RULER_SIZE = 40;  // ruler width in logical px
const PIXELS_PER_CM = 1.5; // scale: each cm = 1.5 logical px → chairs are clearly visible

interface ExportParams {
    tent: TentConfig;
    layout: LayoutResult;
    format: 'png' | 'pdf';
}

/**
 * Draw rulers along the top and left edges.
 */
function drawRulers(
    ctx: CanvasRenderingContext2D,
    totalBounds: { xCm: number; yCm: number; widthCm: number; heightCm: number },
    originX: number,
    originY: number,
    scale: number,
    canvasWidth: number,
    canvasHeight: number,
    headerH: number,
) {
    // Ruler background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, headerH, canvasWidth, RULER_SIZE); // top ruler
    ctx.fillRect(0, headerH + RULER_SIZE, RULER_SIZE, canvasHeight - headerH - RULER_SIZE); // left ruler

    // Corner
    ctx.fillStyle = '#12121e';
    ctx.fillRect(0, headerH, RULER_SIZE, RULER_SIZE);

    // Ruler borders
    ctx.strokeStyle = '#3b3b5c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RULER_SIZE, headerH);
    ctx.lineTo(RULER_SIZE, canvasHeight);
    ctx.moveTo(0, headerH + RULER_SIZE);
    ctx.lineTo(canvasWidth, headerH + RULER_SIZE);
    ctx.stroke();

    // Determine tick interval based on total size
    const totalWidthM = totalBounds.widthCm / 100;
    const totalHeightM = totalBounds.heightCm / 100;

    // Use 1m ticks if total < 30m, else 2m
    const tickIntervalM = Math.max(totalWidthM, totalHeightM) > 30 ? 2 : 1;
    const tickIntervalCm = tickIntervalM * 100;

    ctx.font = '10px system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    // Top ruler (horizontal) — marks in meters
    const startXCm = Math.ceil(totalBounds.xCm / tickIntervalCm) * tickIntervalCm;
    for (let cm = startXCm; cm <= totalBounds.xCm + totalBounds.widthCm; cm += tickIntervalCm) {
        const px = originX + cm * scale;
        if (px < RULER_SIZE || px > canvasWidth) continue;

        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, headerH + RULER_SIZE - 12);
        ctx.lineTo(px, headerH + RULER_SIZE);
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.fillText(`${(cm / 100).toFixed(0)}m`, px, headerH + RULER_SIZE - 18);
    }

    // Sub-ticks (every meter if main ticks are 2m)
    if (tickIntervalM > 1) {
        const subStart = Math.ceil(totalBounds.xCm / 100) * 100;
        for (let cm = subStart; cm <= totalBounds.xCm + totalBounds.widthCm; cm += 100) {
            if (cm % tickIntervalCm === 0) continue;
            const px = originX + cm * scale;
            if (px < RULER_SIZE || px > canvasWidth) continue;
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, headerH + RULER_SIZE - 6);
            ctx.lineTo(px, headerH + RULER_SIZE);
            ctx.stroke();
        }
    }

    // Left ruler (vertical) — marks in meters
    const startYCm = Math.ceil(totalBounds.yCm / tickIntervalCm) * tickIntervalCm;
    for (let cm = startYCm; cm <= totalBounds.yCm + totalBounds.heightCm; cm += tickIntervalCm) {
        const py = originY + cm * scale;
        if (py < headerH + RULER_SIZE || py > canvasHeight) continue;

        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(RULER_SIZE - 12, py);
        ctx.lineTo(RULER_SIZE, py);
        ctx.stroke();

        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(RULER_SIZE - 18, py);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${(cm / 100).toFixed(0)}m`, 0, 0);
        ctx.restore();
    }

    // Sub-ticks vertical
    if (tickIntervalM > 1) {
        const subStart = Math.ceil(totalBounds.yCm / 100) * 100;
        for (let cm = subStart; cm <= totalBounds.yCm + totalBounds.heightCm; cm += 100) {
            if (cm % tickIntervalCm === 0) continue;
            const py = originY + cm * scale;
            if (py < headerH + RULER_SIZE || py > canvasHeight) continue;
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(RULER_SIZE - 6, py);
            ctx.lineTo(RULER_SIZE, py);
            ctx.stroke();
        }
    }
}

/**
 * Draws the tent layout onto a given canvas context.
 */
function drawLayoutOnCanvas(
    ctx: CanvasRenderingContext2D,
    tent: TentConfig,
    layout: LayoutResult,
    originX: number,
    originY: number,
    scale: number,
) {
    const tentWidthCm = tent.widthM * 100;
    const tentLengthCm = tent.lengthM * 100;

    const toX = (cm: number) => originX + cm * scale;
    const toY = (cm: number) => originY + cm * scale;

    // Tent boundary
    ctx.strokeStyle = '#3b3b5c';
    ctx.lineWidth = 2;
    ctx.strokeRect(toX(0), toY(0), tentWidthCm * scale, tentLengthCm * scale);

    // Wings
    for (const wing of tent.wings) {
        const wr = getWingRect(wing, tentWidthCm, tentLengthCm);
        ctx.fillStyle = 'rgba(46, 139, 87, 0.06)';
        ctx.fillRect(toX(wr.xCm), toY(wr.yCm), wr.widthCm * scale, wr.heightCm * scale);
        ctx.strokeStyle = '#2e8b57';
        ctx.lineWidth = 2;
        ctx.strokeRect(toX(wr.xCm), toY(wr.yCm), wr.widthCm * scale, wr.heightCm * scale);

        // Wing label
        ctx.fillStyle = 'rgba(46, 139, 87, 0.6)';
        ctx.font = `bold ${Math.max(9, 10 * scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const sideLabel = wing.side === 'left' ? 'Kiri' : wing.side === 'right' ? 'Kanan' : wing.side === 'top' ? 'Atas' : 'Bawah';
        ctx.fillText(`✦ Sayap ${sideLabel}`, toX(wr.xCm) + wr.widthCm * scale / 2, toY(wr.yCm) + wr.heightCm * scale / 2);
    }

    // Side aisles
    const leftAisleCm = tent.leftAisleCm || 0;
    const rightAisleCm = tent.rightAisleCm || 0;
    const topAisleCm = tent.topAisleCm || 0;
    const bottomAisleCm = tent.bottomAisleCm || 0;

    const drawSideAisle = (x: number, y: number, w: number, h: number, lineStartX?: number, lineStartY?: number, lineEndX?: number, lineEndY?: number) => {
        ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
        ctx.fillRect(toX(x), toY(y), w * scale, h * scale);
        if (lineStartX !== undefined) {
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(toX(lineStartX!), toY(lineStartY!));
            ctx.lineTo(toX(lineEndX!), toY(lineEndY!));
            ctx.stroke();
            ctx.setLineDash([]);
        }
    };

    if (topAisleCm > 0) drawSideAisle(0, 0, tentWidthCm, topAisleCm, 0, topAisleCm, tentWidthCm, topAisleCm);
    if (bottomAisleCm > 0) drawSideAisle(0, tentLengthCm - bottomAisleCm, tentWidthCm, bottomAisleCm, 0, tentLengthCm - bottomAisleCm, tentWidthCm, tentLengthCm - bottomAisleCm);
    if (leftAisleCm > 0) drawSideAisle(0, 0, leftAisleCm, tentLengthCm, leftAisleCm, 0, leftAisleCm, tentLengthCm);
    if (rightAisleCm > 0) drawSideAisle(tentWidthCm - rightAisleCm, 0, rightAisleCm, tentLengthCm, tentWidthCm - rightAisleCm, 0, tentWidthCm - rightAisleCm, tentLengthCm);

    // Horizontal center aisles
    if (tent.aisleCount > 0) {
        const numBlocks = tent.aisleCount + 1;
        const sideAisleWidth = leftAisleCm + rightAisleCm;
        const totalCenterAisleWidth = tent.aisleCount * tent.aisleWidthCm;
        const avail = tentWidthCm - totalCenterAisleWidth - sideAisleWidth;
        const blockW = avail / numBlocks;
        for (let i = 1; i <= tent.aisleCount; i++) {
            const ax = leftAisleCm + blockW * i + tent.aisleWidthCm * (i - 1);
            ctx.fillStyle = 'rgba(100, 120, 200, 0.08)';
            ctx.fillRect(toX(ax), toY(0), tent.aisleWidthCm * scale, tentLengthCm * scale);
            ctx.strokeStyle = 'rgba(100, 120, 200, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(toX(ax), toY(0));
            ctx.lineTo(toX(ax), toY(tentLengthCm));
            ctx.moveTo(toX(ax + tent.aisleWidthCm), toY(0));
            ctx.lineTo(toX(ax + tent.aisleWidthCm), toY(tentLengthCm));
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Vertical center aisles
    const vAisleCount = tent.verticalAisleCount || 0;
    const vAisleWidth = tent.verticalAisleWidthCm || 100;
    if (vAisleCount > 0) {
        const totalVH = vAisleCount * vAisleWidth;
        const avH = tentLengthCm - topAisleCm - bottomAisleCm - totalVH;
        const numBands = vAisleCount + 1;
        const bandH = avH / numBands;
        for (let i = 1; i <= vAisleCount; i++) {
            const ay = topAisleCm + bandH * i + vAisleWidth * (i - 1);
            ctx.fillStyle = 'rgba(100, 120, 200, 0.08)';
            ctx.fillRect(toX(0), toY(ay), tentWidthCm * scale, vAisleWidth * scale);
            ctx.strokeStyle = 'rgba(100, 120, 200, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(toX(0), toY(ay));
            ctx.lineTo(toX(tentWidthCm), toY(ay));
            ctx.moveTo(toX(0), toY(ay + vAisleWidth));
            ctx.lineTo(toX(tentWidthCm), toY(ay + vAisleWidth));
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // Chairs
    for (const chair of layout.chairs) {
        if (chair.excluded) continue;
        const cw = tent.chairWidthCm * scale;
        const ch = tent.chairDepthCm * scale;
        const cx = toX(chair.xCm);
        const cy = toY(chair.yCm);
        if (chair.wingId) {
            ctx.fillStyle = 'rgba(46, 139, 87, 0.55)';
        } else {
            ctx.fillStyle = 'rgba(100, 100, 240, 0.6)';
        }
        ctx.fillRect(cx + 0.5, cy + 0.5, cw - 1, ch - 1);
    }

    // Altar
    if (tent.altar.widthCm > 0 && tent.altar.heightCm > 0) {
        const ax = toX(tent.altar.xCm);
        const ay = toY(tent.altar.yCm);
        const aw = tent.altar.widthCm * scale;
        const ah = tent.altar.heightCm * scale;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.beginPath();
        ctx.roundRect(ax, ay, aw, ah, Math.max(2, 4 * scale));
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(ax, ay, aw, ah, Math.max(2, 4 * scale));
        ctx.stroke();
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold ${Math.max(10, 14 * scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✝ ALTAR', ax + aw / 2, ay + ah / 2);
    }

    // Furniture
    for (const item of tent.furniture) {
        const fx = toX(item.xCm);
        const fy = toY(item.yCm);
        const fw = item.widthCm * scale;
        const fh = item.heightCm * scale;
        const color = item.type === 'tv' ? '#00b8d4' : '#ff7043';
        const icon = item.type === 'tv' ? '📺' : '🚪';
        ctx.fillStyle = color.replace(')', ', 0.25)').replace('rgb', 'rgba');
        ctx.beginPath();
        ctx.roundRect(fx, fy, fw, fh, Math.max(1, 3 * scale));
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(fx, fy, fw, fh, Math.max(1, 3 * scale));
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.font = `bold ${Math.max(8, 10 * scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${icon} ${item.label}`, fx + fw / 2, fy + fh / 2);
    }

    // ACs
    const acPositions = generateAcPositions(tent.acConfig || { count: 0, widthCm: 80, depthCm: 20 }, tentWidthCm, tentLengthCm);
    for (const ac of acPositions) {
        const ax = toX(ac.xCm);
        const ay = toY(ac.yCm);
        const aw = ac.widthCm * scale;
        const ah = ac.heightCm * scale;
        ctx.fillStyle = 'rgba(66, 165, 245, 0.25)';
        ctx.beginPath();
        ctx.roundRect(ax, ay, aw, ah, Math.max(1, 3 * scale));
        ctx.fill();
        ctx.strokeStyle = '#42a5f5';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(ax, ay, aw, ah, Math.max(1, 3 * scale));
        ctx.stroke();
        ctx.fillStyle = '#42a5f5';
        ctx.font = `bold ${Math.max(8, 10 * scale)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❄️', ax + aw / 2, ay + ah / 2);
    }

    // Exclusion zones
    for (const zone of tent.exclusionZones) {
        const zx = toX(zone.xCm);
        const zy = toY(zone.yCm);
        const zw = zone.widthCm * scale;
        const zh = zone.heightCm * scale;
        ctx.fillStyle = 'rgba(255, 0, 60, 0.1)';
        ctx.fillRect(zx, zy, zw, zh);
        ctx.strokeStyle = 'rgba(255, 0, 60, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(zx, zy, zw, zh);
        ctx.setLineDash([]);
    }

    ctx.textBaseline = 'alphabetic';
}

/**
 * Calculate the total height needed for the summary panel at a given width.
 */
function getSummaryHeight(panelWidth: number): number {
    const s = panelWidth / 1200;
    return Math.round(s * 240);
}

/**
 * Draw summary panel below the layout.
 * All sizes scale proportionally to panelWidth (baseline = 1200px).
 */
function drawSummaryPanel(
    ctx: CanvasRenderingContext2D,
    tent: TentConfig,
    layout: LayoutResult,
    panelX: number,
    panelY: number,
    panelWidth: number,
) {
    // Scale factor: everything is relative to a 1200px-wide baseline
    const s = panelWidth / 1200;
    const pad = 24 * s;
    const py = panelY + 16 * s;

    // Separator line above summary
    ctx.strokeStyle = '#3b3b5c';
    ctx.lineWidth = Math.max(1, 2 * s);
    ctx.beginPath();
    ctx.moveTo(panelX, panelY);
    ctx.lineTo(panelX + panelWidth, panelY);
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(22 * s)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`📊 Ringkasan — ${tent.name}`, panelX + pad, py);

    // Divider
    ctx.strokeStyle = '#3b3b5c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + pad, py + 34 * s);
    ctx.lineTo(panelX + panelWidth - pad, py + 34 * s);
    ctx.stroke();

    // Stats grid
    const stats = [
        { label: 'Total Kursi', value: `${layout.totalChairs}`, primary: true },
        { label: 'Baris', value: `${layout.totalRows}` },
        { label: 'Blok', value: `${layout.blocksInfo.length}` },
        { label: 'Kolom / Blok', value: `${layout.blocksInfo[0]?.cols ?? 0}` },
        { label: 'Luas Total', value: `${layout.totalAreaM2.toFixed(1)} m²` },
        { label: 'Area Kursi', value: `${layout.usableAreaM2.toFixed(1)} m²` },
        { label: 'Utilisasi', value: `${layout.utilizationPercent.toFixed(1)}%` },
    ];

    const colCount = Math.min(stats.length, 7);
    const gap = 12 * s;
    const cardW = (panelWidth - pad * 2 - (colCount - 1) * gap) / colCount;
    const cardH = 70 * s;
    const startY = py + 48 * s;

    stats.forEach((stat, i) => {
        const col = i % colCount;
        const cx = panelX + pad + col * (cardW + gap);
        const cy = startY;

        // Card background
        ctx.fillStyle = stat.primary ? 'rgba(100, 100, 240, 0.15)' : 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.roundRect(cx, cy, cardW, cardH, 8 * s);
        ctx.fill();
        ctx.strokeStyle = stat.primary ? 'rgba(100, 100, 240, 0.4)' : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = Math.max(1, s);
        ctx.beginPath();
        ctx.roundRect(cx, cy, cardW, cardH, 8 * s);
        ctx.stroke();

        // Value
        ctx.fillStyle = stat.primary ? '#7c7cff' : '#e0e0e0';
        ctx.font = `bold ${Math.round((stat.primary ? 26 : 20) * s)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(stat.value, cx + cardW / 2, cy + 22 * s);

        // Label
        ctx.fillStyle = '#888';
        ctx.font = `${Math.round(12 * s)}px system-ui, sans-serif`;
        ctx.fillText(stat.label, cx + cardW / 2, cy + cardH - 14 * s);
    });

    // Config details
    const detailY = startY + cardH + 24 * s;
    ctx.fillStyle = '#888';
    ctx.font = `${Math.round(13 * s)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    const details = [
        `Tenda: ${tent.widthM}m × ${tent.lengthM}m`,
        `Kursi: ${tent.chairWidthCm}cm × ${tent.chairDepthCm}cm`,
        `Jarak: samping ${tent.sideGapCm}cm, depan ${tent.frontGapCm}cm`,
        `Lorong Tengah (↔): ${tent.aisleCount} × ${tent.aisleWidthCm}cm`,
        tent.verticalAisleCount ? `Lorong Tengah (↕): ${tent.verticalAisleCount} × ${tent.verticalAisleWidthCm}cm` : '',
        tent.acConfig?.count ? `AC: ${tent.acConfig.count} unit (${tent.acConfig.widthCm}×${tent.acConfig.depthCm}cm)` : '',
    ].filter(Boolean);

    const detailColW = (panelWidth - pad * 2) / 3;
    details.forEach((d, i) => {
        ctx.fillText(d, panelX + pad + (i % 3) * detailColW, detailY + Math.floor(i / 3) * 20 * s);
    });

    // Timestamp
    const dateStr = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    ctx.fillStyle = '#555';
    ctx.font = `${Math.round(12 * s)}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`Dicetak: ${dateStr}`, panelX + panelWidth - pad, detailY + Math.ceil(details.length / 3) * 20 * s + 8 * s);

    ctx.textBaseline = 'alphabetic';
}

/**
 * Build the full export canvas with dynamic sizing, rulers, and summary.
 */
function buildExportCanvas(tent: TentConfig, layout: LayoutResult): HTMLCanvasElement {
    const totalBounds = getTotalBounds(tent);
    const scale = PIXELS_PER_CM;

    // Layout area sized to actual tent dimensions
    const layoutContentW = totalBounds.widthCm * scale;
    const layoutContentH = totalBounds.heightCm * scale;
    const layoutPadding = 30; // padding around layout inside ruler area

    const canvasW = RULER_SIZE + layoutContentW + layoutPadding * 2;

    // Ensure a reasonable minimum width for the summary panel
    const minWidth = 900;
    const finalW = Math.max(canvasW, minWidth);

    // Scale header and summary proportionally to canvas width
    const ws = finalW / 1200; // width scale factor
    const headerH = Math.round(50 * ws);
    const summaryH = getSummaryHeight(finalW);

    const canvasH = headerH + RULER_SIZE + layoutContentH + layoutPadding * 2 + summaryH;

    const canvas = document.createElement('canvas');
    canvas.width = finalW * EXPORT_SCALE;
    canvas.height = canvasH * EXPORT_SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);

    // Dark background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, finalW, canvasH);

    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(24 * ws)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`Seat Planner — ${tent.name}`, finalW / 2, Math.round(14 * ws));

    // Layout area background
    const layoutAreaX = RULER_SIZE;
    const layoutAreaY = headerH + RULER_SIZE;
    const layoutAreaW = finalW - RULER_SIZE;
    const layoutAreaH = layoutContentH + layoutPadding * 2;
    ctx.fillStyle = '#12121e';
    ctx.fillRect(layoutAreaX, layoutAreaY, layoutAreaW, layoutAreaH);

    // Center the layout content within the area
    const originX = layoutAreaX + layoutPadding + (layoutAreaW - layoutPadding * 2 - layoutContentW) / 2 - totalBounds.xCm * scale;
    const originY = layoutAreaY + layoutPadding - totalBounds.yCm * scale;

    // Draw the layout
    drawLayoutOnCanvas(ctx, tent, layout, originX, originY, scale);

    // Draw rulers
    drawRulers(ctx, totalBounds, originX, originY, scale, finalW, canvasH - summaryH, headerH);

    // Draw summary
    drawSummaryPanel(ctx, tent, layout, 0, canvasH - summaryH, finalW);

    return canvas;
}

/**
 * Export layout as PNG image download
 */
function exportAsPNG(tent: TentConfig, layout: LayoutResult) {
    const canvas = buildExportCanvas(tent, layout);

    const link = document.createElement('a');
    link.download = `seat-planner-${tent.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

/**
 * Export layout as PDF via print dialog
 */
function exportAsPDF(tent: TentConfig, layout: LayoutResult) {
    const canvas = buildExportCanvas(tent, layout);
    const imgData = canvas.toDataURL('image/png');

    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
        <!DOCTYPE html>
        <html><head>
        <title>Seat Planner — ${tent.name}</title>
        <style>
            @page { size: landscape; margin: 10mm; }
            body { margin: 0; display: flex; justify-content: center; align-items: flex-start; background: #fff; }
            img { max-width: 100%; height: auto; }
        </style>
        </head><body>
        <img src="${imgData}" />
        </body></html>
    `);
    printWin.document.close();
    printWin.onload = () => {
        setTimeout(() => { printWin.print(); }, 300);
    };
}

export function exportLayout({ tent, layout, format }: ExportParams) {
    if (format === 'pdf') {
        exportAsPDF(tent, layout);
    } else {
        exportAsPNG(tent, layout);
    }
}
