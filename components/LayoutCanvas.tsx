'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { TentConfig, LayoutResult, ExclusionZone, AltarConfig, FurnitureItem, FurnitureType, WingConfig, WingSide, generateAcPositions } from '@/lib/types';
import { getWingRect, getTotalBounds } from '@/lib/seatCalculator';

interface LayoutCanvasProps {
    tent: TentConfig;
    layout: LayoutResult;
    onAddExclusionZone: (zone: ExclusionZone) => void;
    onUpdateExclusionZone: (zone: ExclusionZone) => void;
    onRemoveExclusionZone: (id: string) => void;
    onUpdateAltar: (altar: AltarConfig) => void;
    onAddFurniture: (item: FurnitureItem) => void;
    onUpdateFurniture: (item: FurnitureItem) => void;
    onRemoveFurniture: (id: string) => void;
    onAddWing: (wing: WingConfig) => void;
    onUpdateWing: (wing: WingConfig) => void;
    onRemoveWing: (id: string) => void;
}

const RULER_SIZE = 30;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5;

const FURNITURE_STYLES: Record<FurnitureType, { color: string; hoverColor: string; icon: string; bgAlpha: number; hoverBgAlpha: number }> = {
    tv: { color: '#00b8d4', hoverColor: '#26c6da', icon: '📺', bgAlpha: 0.25, hoverBgAlpha: 0.35 },
    door: { color: '#ff7043', hoverColor: '#ff8a65', icon: '🚪', bgAlpha: 0.25, hoverBgAlpha: 0.35 },
};

const WING_SIDE_LABELS: Record<WingSide, string> = {
    left: 'Kiri', right: 'Kanan', top: 'Atas', bottom: 'Bawah',
};

type DragTarget =
    | { type: 'altar' }
    | { type: 'zone'; id: string }
    | { type: 'furniture'; id: string }
    | { type: 'pan' }
    | null;

export default function LayoutCanvas({
    tent,
    layout,
    onAddExclusionZone,
    onUpdateExclusionZone,
    onRemoveExclusionZone,
    onUpdateAltar,
    onAddFurniture,
    onUpdateFurniture,
    onRemoveFurniture,
    onAddWing,
    onUpdateWing,
    onRemoveWing,
}: LayoutCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
    const [drawing, setDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
    const [drawEnd, setDrawEnd] = useState({ x: 0, y: 0 });
    const [dragTarget, setDragTarget] = useState<DragTarget>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [mode, setMode] = useState<'view' | 'draw'>('view');
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);
    const [showWingMenu, setShowWingMenu] = useState(false);

    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

    const tentWidthCm = tent.widthM * 100;
    const tentLengthCm = tent.lengthM * 100;

    // Compute bounding box of entire layout (main + wings)
    const bounds = getTotalBounds(tent);

    const drawAreaW = canvasSize.w - RULER_SIZE;
    const drawAreaH = canvasSize.h - RULER_SIZE;
    const basePad = 40;
    const baseScaleX = (drawAreaW - basePad * 2) / bounds.widthCm;
    const baseScaleY = (drawAreaH - basePad * 2) / bounds.heightCm;
    const baseScale = Math.min(baseScaleX, baseScaleY);
    const scale = baseScale * zoom;

    const centerX = RULER_SIZE + drawAreaW / 2;
    const centerY = RULER_SIZE + drawAreaH / 2;

    // The origin shifts so the bounding box is centered
    const globalOriginX = centerX - (bounds.widthCm * scale) / 2 + panX - bounds.xCm * scale;
    const globalOriginY = centerY - (bounds.heightCm * scale) / 2 + panY - bounds.yCm * scale;

    const pxToCm = useCallback(
        (px: number, py: number) => ({
            xCm: (px - globalOriginX) / scale,
            yCm: (py - globalOriginY) / scale,
        }),
        [globalOriginX, globalOriginY, scale]
    );

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setCanvasSize({ w: width, h: height });
            }
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, []);

    const resetZoom = useCallback(() => {
        setZoom(1);
        setPanX(0);
        setPanY(0);
    }, []);

    function hitTest(xCm: number, yCm: number, rect: { xCm: number; yCm: number; widthCm: number; heightCm: number }) {
        return xCm >= rect.xCm && xCm <= rect.xCm + rect.widthCm && yCm >= rect.yCm && yCm <= rect.yCm + rect.heightCm;
    }

    function addNewFurniture(type: FurnitureType) {
        const countOfType = tent.furniture.filter(f => f.type === type).length + 1;
        const defaults = type === 'tv'
            ? { widthCm: 120, heightCm: 15, label: `TV ${countOfType}` }
            : type === 'door'
                ? { widthCm: 100, heightCm: 30, label: `Pintu ${countOfType}` }
                : { widthCm: 80, heightCm: 20, label: `AC ${countOfType}` };
        onAddFurniture({
            id: `${type}-${Date.now()}`,
            type,
            label: defaults.label,
            xCm: (tentWidthCm - defaults.widthCm) / 2,
            yCm: type === 'door' ? tentLengthCm - defaults.heightCm : 0,
            widthCm: defaults.widthCm,
            heightCm: defaults.heightCm,
        });
    }

    function addWing(side: WingSide) {
        const existing = tent.wings.filter(w => w.side === side);
        const wingId = `wing-${side}-${Date.now()}`;
        const lengthAlong = (side === 'left' || side === 'right') ? tentLengthCm : tentWidthCm;
        const wingLength = Math.min(300, lengthAlong);
        const offset = (lengthAlong - wingLength) / 2;
        onAddWing({
            id: wingId,
            side,
            offsetCm: Math.round(offset),
            widthCm: 300,
            lengthCm: Math.round(wingLength),
        });
        setShowWingMenu(false);
    }

    // ===== DRAW =====
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvasSize.w * dpr;
        canvas.height = canvasSize.h * dpr;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

        ctx.save();
        ctx.beginPath();
        ctx.rect(RULER_SIZE, RULER_SIZE, drawAreaW, drawAreaH);
        ctx.clip();

        // === Helper to convert cm to px ===
        const toX = (cm: number) => globalOriginX + cm * scale;
        const toY = (cm: number) => globalOriginY + cm * scale;

        // === Draw main tent boundary ===
        ctx.strokeStyle = '#3b3b5c';
        ctx.lineWidth = 2;
        ctx.strokeRect(toX(0), toY(0), tentWidthCm * scale, tentLengthCm * scale);

        // === Draw wing boundaries ===
        for (const wing of tent.wings) {
            const wr = getWingRect(wing, tentWidthCm, tentLengthCm);
            const wx = toX(wr.xCm);
            const wy = toY(wr.yCm);
            const ww = wr.widthCm * scale;
            const wh = wr.heightCm * scale;

            // Wing fill
            ctx.fillStyle = 'rgba(46, 139, 87, 0.06)';
            ctx.fillRect(wx, wy, ww, wh);

            // Wing border
            ctx.strokeStyle = '#2e8b57';
            ctx.lineWidth = 2;
            ctx.strokeRect(wx, wy, ww, wh);

            // Wing label
            ctx.fillStyle = 'rgba(46, 139, 87, 0.6)';
            ctx.font = `bold ${Math.max(9, 10 * scale)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`✦ Sayap ${WING_SIDE_LABELS[wing.side]}`, wx + ww / 2, wy + wh / 2);
            ctx.textBaseline = 'alphabetic';
        }

        // === Grid (main tent only) ===
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 0.5;
        const gridStepCm = 100;
        for (let x = gridStepCm; x < tentWidthCm; x += gridStepCm) {
            ctx.beginPath();
            ctx.moveTo(toX(x), toY(0));
            ctx.lineTo(toX(x), toY(tentLengthCm));
            ctx.stroke();
        }
        for (let y = gridStepCm; y < tentLengthCm; y += gridStepCm) {
            ctx.beginPath();
            ctx.moveTo(toX(0), toY(y));
            ctx.lineTo(toX(tentWidthCm), toY(y));
            ctx.stroke();
        }

        // Side aisles
        const leftAisleCm = tent.leftAisleCm || 0;
        const rightAisleCm = tent.rightAisleCm || 0;
        const topAisleCm = tent.topAisleCm || 0;

        // Top/front aisle
        if (topAisleCm > 0) {
            const th = topAisleCm * scale;
            ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
            ctx.fillRect(toX(0), toY(0), tentWidthCm * scale, th);
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(toX(0), toY(topAisleCm));
            ctx.lineTo(toX(tentWidthCm), toY(topAisleCm));
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (leftAisleCm > 0) {
            const lw = leftAisleCm * scale;
            ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
            ctx.fillRect(toX(0), toY(0), lw, tentLengthCm * scale);
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(toX(leftAisleCm), toY(0));
            ctx.lineTo(toX(leftAisleCm), toY(tentLengthCm));
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (rightAisleCm > 0) {
            const rw = rightAisleCm * scale;
            ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
            ctx.fillRect(toX(tentWidthCm) - rw, toY(0), rw, tentLengthCm * scale);
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(toX(tentWidthCm - rightAisleCm), toY(0));
            ctx.lineTo(toX(tentWidthCm - rightAisleCm), toY(tentLengthCm));
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Bottom/rear aisle
        const bottomAisleCm = tent.bottomAisleCm || 0;
        if (bottomAisleCm > 0) {
            const bh = bottomAisleCm * scale;
            ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
            ctx.fillRect(toX(0), toY(tentLengthCm) - bh, tentWidthCm * scale, bh);
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(toX(0), toY(tentLengthCm - bottomAisleCm));
            ctx.lineTo(toX(tentWidthCm), toY(tentLengthCm - bottomAisleCm));
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Center aisles
        if (tent.aisleCount > 0) {
            const numBlocks = tent.aisleCount + 1;
            const sideAisleWidth = leftAisleCm + rightAisleCm;
            const totalCenterAisleWidth = tent.aisleCount * tent.aisleWidthCm;
            const availableWidth = tentWidthCm - totalCenterAisleWidth - sideAisleWidth;
            const blockWidth = availableWidth / numBlocks;

            for (let i = 1; i <= tent.aisleCount; i++) {
                const aisleXCm = leftAisleCm + blockWidth * i + tent.aisleWidthCm * (i - 1);
                const aisleW = tent.aisleWidthCm * scale;
                ctx.fillStyle = 'rgba(100, 120, 200, 0.08)';
                ctx.fillRect(toX(aisleXCm), toY(0), aisleW, tentLengthCm * scale);
                ctx.strokeStyle = 'rgba(100, 120, 200, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(toX(aisleXCm), toY(0));
                ctx.lineTo(toX(aisleXCm), toY(tentLengthCm));
                ctx.moveTo(toX(aisleXCm + tent.aisleWidthCm), toY(0));
                ctx.lineTo(toX(aisleXCm + tent.aisleWidthCm), toY(tentLengthCm));
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // === Chairs (main + wing) ===
        for (const chair of layout.chairs) {
            if (chair.excluded) continue;
            const cx = toX(chair.xCm);
            const cy = toY(chair.yCm);
            const cw = tent.chairWidthCm * scale;
            const ch = tent.chairDepthCm * scale;

            const isWing = chair.wingId !== null;
            const chairGrad = ctx.createLinearGradient(cx, cy, cx, cy + ch);
            if (isWing) {
                chairGrad.addColorStop(0, '#2e8b57');
                chairGrad.addColorStop(1, '#1a6b42');
            } else {
                chairGrad.addColorStop(0, '#6c5ce7');
                chairGrad.addColorStop(1, '#4834d4');
            }
            ctx.fillStyle = chairGrad;
            ctx.beginPath();
            ctx.roundRect(cx, cy, cw, ch, Math.max(1, 2 * scale));
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // === Altar ===
        const altar = tent.altar;
        if (altar.widthCm > 0 && altar.heightCm > 0) {
            const ax = toX(altar.xCm);
            const ay = toY(altar.yCm);
            const aw = altar.widthCm * scale;
            const ah = altar.heightCm * scale;
            const isHov = hoveredItem === 'altar';

            const altarGrad = ctx.createLinearGradient(ax, ay, ax, ay + ah);
            altarGrad.addColorStop(0, isHov ? 'rgba(212, 175, 55, 0.45)' : 'rgba(212, 175, 55, 0.35)');
            altarGrad.addColorStop(1, isHov ? 'rgba(212, 175, 55, 0.2)' : 'rgba(212, 175, 55, 0.1)');
            ctx.fillStyle = altarGrad;
            ctx.beginPath();
            ctx.roundRect(ax, ay, aw, ah, Math.max(1, 4 * scale));
            ctx.fill();

            ctx.strokeStyle = isHov ? '#f0d668' : '#d4af37';
            ctx.lineWidth = isHov ? 2 : 1.5;
            ctx.beginPath();
            ctx.roundRect(ax, ay, aw, ah, Math.max(1, 4 * scale));
            ctx.stroke();

            ctx.fillStyle = '#d4af37';
            ctx.font = `bold ${Math.max(10, 14 * scale)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✝ ALTAR', ax + aw / 2, ay + ah / 2);
            ctx.textBaseline = 'alphabetic';

            if (isHov) {
                ctx.fillStyle = 'rgba(240, 214, 104, 0.7)';
                ctx.font = `${Math.max(8, 10 * scale)}px system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('drag untuk pindah', ax + aw / 2, ay + ah / 2 + Math.max(12, 18 * scale));
                ctx.textBaseline = 'alphabetic';
            }
        }

        // === Furniture ===
        for (const item of tent.furniture) {
            const fx = toX(item.xCm);
            const fy = toY(item.yCm);
            const fw = item.widthCm * scale;
            const fh = item.heightCm * scale;
            const isHov = hoveredItem === item.id;
            const style = FURNITURE_STYLES[item.type];

            ctx.fillStyle = hexToRgba(style.color, isHov ? style.hoverBgAlpha : style.bgAlpha);
            ctx.beginPath();
            ctx.roundRect(fx, fy, fw, fh, Math.max(1, 3 * scale));
            ctx.fill();

            ctx.strokeStyle = isHov ? style.hoverColor : style.color;
            ctx.lineWidth = isHov ? 2 : 1.5;
            ctx.beginPath();
            ctx.roundRect(fx, fy, fw, fh, Math.max(1, 3 * scale));
            ctx.stroke();

            ctx.fillStyle = isHov ? style.hoverColor : style.color;
            ctx.font = `bold ${Math.max(9, 11 * scale)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${style.icon} ${item.label}`, fx + fw / 2, fy + fh / 2);
            ctx.textBaseline = 'alphabetic';

            if (isHov) {
                ctx.fillStyle = hexToRgba(style.hoverColor, 0.7);
                ctx.font = `${Math.max(7, 9 * scale)}px system-ui, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('drag untuk pindah', fx + fw / 2, fy + fh / 2 + Math.max(10, 14 * scale));
                ctx.textBaseline = 'alphabetic';
            }
        }

        // === Auto-generated ACs ===
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
            ctx.textBaseline = 'alphabetic';
        }

        // === Exclusion zones ===
        for (const zone of tent.exclusionZones) {
            const zx = toX(zone.xCm);
            const zy = toY(zone.yCm);
            const zw = zone.widthCm * scale;
            const zh = zone.heightCm * scale;
            const isHov = hoveredItem === zone.id;

            ctx.fillStyle = isHov ? 'rgba(255, 100, 100, 0.25)' : 'rgba(255, 70, 70, 0.15)';
            ctx.fillRect(zx, zy, zw, zh);
            ctx.strokeStyle = isHov ? '#ff6b6b' : 'rgba(255, 100, 100, 0.5)';
            ctx.lineWidth = isHov ? 2 : 1;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(zx, zy, zw, zh);
            ctx.setLineDash([]);

            ctx.fillStyle = '#ff6b6b';
            ctx.font = `${Math.max(9, 11 * scale)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(zone.label || 'Zona', zx + zw / 2, zy + zh / 2 + 4);
        }

        // Drawing rect
        if (drawing) {
            const dx = Math.min(drawStart.x, drawEnd.x);
            const dy = Math.min(drawStart.y, drawEnd.y);
            const dw = Math.abs(drawEnd.x - drawStart.x);
            const dh = Math.abs(drawEnd.y - drawStart.y);
            ctx.fillStyle = 'rgba(255, 100, 100, 0.2)';
            ctx.fillRect(dx, dy, dw, dh);
            ctx.strokeStyle = '#ff6b6b';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(dx, dy, dw, dh);
            ctx.setLineDash([]);
        }

        ctx.restore();

        // ===== RULERS =====
        ctx.fillStyle = '#141422';
        ctx.fillRect(RULER_SIZE, 0, drawAreaW, RULER_SIZE);
        ctx.fillRect(0, RULER_SIZE, RULER_SIZE, drawAreaH);
        ctx.fillStyle = '#181830';
        ctx.fillRect(0, 0, RULER_SIZE, RULER_SIZE);

        ctx.strokeStyle = '#2a2a45';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(RULER_SIZE, 0);
        ctx.lineTo(RULER_SIZE, canvasSize.h);
        ctx.moveTo(0, RULER_SIZE);
        ctx.lineTo(canvasSize.w, RULER_SIZE);
        ctx.stroke();

        // Ruler ticks — use global coordinates
        const pixelsPerMeter = 100 * scale;
        let rulerStepCm: number;
        if (pixelsPerMeter > 200) rulerStepCm = 25;
        else if (pixelsPerMeter > 100) rulerStepCm = 50;
        else if (pixelsPerMeter > 40) rulerStepCm = 100;
        else rulerStepCm = 200;

        ctx.fillStyle = '#888';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.font = '9px system-ui, sans-serif';

        // Top ruler — covers from bounds.xCm to bounds.xCm + bounds.widthCm
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const rulerStartXCm = Math.floor(bounds.xCm / rulerStepCm) * rulerStepCm;
        const rulerEndXCm = bounds.xCm + bounds.widthCm;
        for (let cm = rulerStartXCm; cm <= rulerEndXCm; cm += rulerStepCm) {
            const px = toX(cm);
            if (px < RULER_SIZE - 5 || px > canvasSize.w + 5) continue;
            const isMajor = cm % 100 === 0;
            const tickH = isMajor ? 10 : 5;
            ctx.beginPath();
            ctx.moveTo(px, RULER_SIZE);
            ctx.lineTo(px, RULER_SIZE - tickH);
            ctx.stroke();
            if (isMajor) ctx.fillText((cm / 100).toString(), px, RULER_SIZE - tickH - 2);
        }

        // Left ruler
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const rulerStartYCm = Math.floor(bounds.yCm / rulerStepCm) * rulerStepCm;
        const rulerEndYCm = bounds.yCm + bounds.heightCm;
        for (let cm = rulerStartYCm; cm <= rulerEndYCm; cm += rulerStepCm) {
            const py = toY(cm);
            if (py < RULER_SIZE - 5 || py > canvasSize.h + 5) continue;
            const isMajor = cm % 100 === 0;
            const tickW = isMajor ? 10 : 5;
            ctx.beginPath();
            ctx.moveTo(RULER_SIZE, py);
            ctx.lineTo(RULER_SIZE - tickW, py);
            ctx.stroke();
            if (isMajor) ctx.fillText((cm / 100).toString(), RULER_SIZE - tickW - 3, py);
        }

        ctx.fillStyle = '#555';
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('m', RULER_SIZE / 2, RULER_SIZE / 2);

    }, [canvasSize, tent, layout, drawing, drawStart, drawEnd, hoveredItem, zoom, panX, panY, globalOriginX, globalOriginY, scale, drawAreaW, drawAreaH, tentWidthCm, tentLengthCm, bounds]);

    // Wheel zoom
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * zoomDelta));

            // Zoom toward cursor: keep the point under cursor fixed
            const zoomRatio = newZoom / zoom;
            // Current point under cursor in "unzoomed" space
            const newPanX = mouseX - (mouseX - panX) * zoomRatio;
            const newPanY = mouseY - (mouseY - panY) * zoomRatio;

            setZoom(newZoom);
            setPanX(newPanX);
            setPanY(newPanY);
        };
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [zoom, panX, panY]);

    // Mouse handlers
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const { xCm, yCm } = pxToCm(px, py);

        if (e.button === 1 || e.button === 2) {
            e.preventDefault();
            setDragTarget({ type: 'pan' });
            setLastPanPos({ x: px, y: py });
            return;
        }

        if (mode === 'view') {
            for (const item of [...tent.furniture].reverse()) {
                if (hitTest(xCm, yCm, item)) {
                    setDragTarget({ type: 'furniture', id: item.id });
                    setDragOffset({ x: xCm - item.xCm, y: yCm - item.yCm });
                    return;
                }
            }
            if (hitTest(xCm, yCm, tent.altar)) {
                setDragTarget({ type: 'altar' });
                setDragOffset({ x: xCm - tent.altar.xCm, y: yCm - tent.altar.yCm });
                return;
            }
            for (const zone of tent.exclusionZones) {
                if (hitTest(xCm, yCm, zone)) {
                    setDragTarget({ type: 'zone', id: zone.id });
                    setDragOffset({ x: xCm - zone.xCm, y: yCm - zone.yCm });
                    return;
                }
            }

            setDragTarget({ type: 'pan' });
            setLastPanPos({ x: px, y: py });
            return;
        }

        if (mode === 'draw') {
            setDrawing(true);
            setDrawStart({ x: px, y: py });
            setDrawEnd({ x: px, y: py });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const { xCm, yCm } = pxToCm(px, py);

        if (dragTarget) {
            if (dragTarget.type === 'pan') {
                setPanX((prev) => prev + (px - lastPanPos.x));
                setPanY((prev) => prev + (py - lastPanPos.y));
                setLastPanPos({ x: px, y: py });
                return;
            }
            if (dragTarget.type === 'altar') {
                const alt = tent.altar;
                onUpdateAltar({
                    ...alt,
                    xCm: Math.max(0, Math.min(tentWidthCm - alt.widthCm, xCm - dragOffset.x)),
                    yCm: Math.max(0, Math.min(tentLengthCm - alt.heightCm, yCm - dragOffset.y)),
                });
                return;
            }
            if (dragTarget.type === 'furniture') {
                const item = tent.furniture.find((f) => f.id === dragTarget.id);
                if (item) {
                    onUpdateFurniture({
                        ...item,
                        xCm: Math.max(0, Math.min(tentWidthCm - item.widthCm, xCm - dragOffset.x)),
                        yCm: Math.max(0, Math.min(tentLengthCm - item.heightCm, yCm - dragOffset.y)),
                    });
                }
                return;
            }
            if (dragTarget.type === 'zone') {
                const zone = tent.exclusionZones.find((z) => z.id === dragTarget.id);
                if (zone) {
                    onUpdateExclusionZone({
                        ...zone,
                        xCm: Math.max(0, Math.min(tentWidthCm - zone.widthCm, xCm - dragOffset.x)),
                        yCm: Math.max(0, Math.min(tentLengthCm - zone.heightCm, yCm - dragOffset.y)),
                    });
                }
                return;
            }
        }

        if (drawing) { setDrawEnd({ x: px, y: py }); return; }

        // Hover
        let found: string | null = null;
        for (const item of [...tent.furniture].reverse()) {
            if (hitTest(xCm, yCm, item)) { found = item.id; break; }
        }
        if (!found && hitTest(xCm, yCm, tent.altar)) found = 'altar';
        if (!found) {
            for (const zone of tent.exclusionZones) {
                if (hitTest(xCm, yCm, zone)) { found = zone.id; break; }
            }
        }
        setHoveredItem(found);
    };

    const handleMouseUp = () => {
        if (dragTarget) { setDragTarget(null); return; }
        if (drawing) {
            setDrawing(false);
            const start = pxToCm(drawStart.x, drawStart.y);
            const end = pxToCm(drawEnd.x, drawEnd.y);
            const xCm = Math.max(0, Math.min(start.xCm, end.xCm));
            const yCm = Math.max(0, Math.min(start.yCm, end.yCm));
            const widthCm = Math.min(tentWidthCm - xCm, Math.abs(end.xCm - start.xCm));
            const heightCm = Math.min(tentLengthCm - yCm, Math.abs(end.yCm - start.yCm));
            if (widthCm > 10 && heightCm > 10) {
                onAddExclusionZone({
                    id: `zone-${Date.now()}`,
                    label: `Zona ${tent.exclusionZones.length + 1}`,
                    xCm: Math.round(xCm),
                    yCm: Math.round(yCm),
                    widthCm: Math.round(widthCm),
                    heightCm: Math.round(heightCm),
                });
            }
            setMode('view');
        }
    };

    const cursorClass = mode === 'draw'
        ? 'canvas-draw-mode'
        : dragTarget?.type === 'pan'
            ? 'canvas-panning'
            : hoveredItem
                ? 'canvas-grab-mode'
                : '';

    const zoomPercent = Math.round(zoom * 100);

    // Count wing chairs
    const wingChairCount = layout.chairs.filter(c => !c.excluded && c.wingId !== null).length;

    return (
        <div className="canvas-container">
            <div className="canvas-toolbar">
                <button
                    className={`toolbar-btn ${mode === 'draw' ? 'toolbar-btn-active' : ''}`}
                    onClick={() => setMode(mode === 'draw' ? 'view' : 'draw')}
                    title="Gambar zona tanpa kursi"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                    </svg>
                    <span>Zona</span>
                </button>

                <button className="toolbar-btn" onClick={() => addNewFurniture('tv')} title="Tambah TV Monitor">
                    <span>📺</span><span>+ TV</span>
                </button>
                <button className="toolbar-btn" onClick={() => addNewFurniture('door')} title="Tambah Pintu">
                    <span>🚪</span><span>+ Pintu</span>
                </button>

                {/* Wing dropdown */}
                <div className="wing-dropdown-container">
                    <button className="toolbar-btn" onClick={() => setShowWingMenu(!showWingMenu)} title="Tambah Sayap">
                        <span>🏗️</span><span>+ Sayap</span>
                    </button>
                    {showWingMenu && (
                        <div className="wing-dropdown-menu">
                            <button onClick={() => addWing('left')}>← Sayap Kiri</button>
                            <button onClick={() => addWing('right')}>Sayap Kanan →</button>
                            <button onClick={() => addWing('top')}>↑ Sayap Atas</button>
                            <button onClick={() => addWing('bottom')}>↓ Sayap Bawah</button>
                        </div>
                    )}
                </div>

                {/* Badges */}
                {tent.exclusionZones.length > 0 && (
                    <div className="zone-badges">
                        {tent.exclusionZones.map((z) => (
                            <span key={z.id} className="zone-badge">
                                {z.label}
                                <button className="zone-badge-remove" onClick={() => onRemoveExclusionZone(z.id)}>×</button>
                            </span>
                        ))}
                    </div>
                )}
                {tent.furniture.length > 0 && (
                    <div className="zone-badges">
                        {tent.furniture.map((f) => {
                            const style = FURNITURE_STYLES[f.type] || { color: '#888', icon: '?' };
                            return (
                                <span key={f.id} className="zone-badge" style={{ borderColor: style.color }}>
                                    {style.icon} {f.label}
                                    <button className="zone-badge-remove" onClick={() => onRemoveFurniture(f.id)}>×</button>
                                </span>
                            );
                        })}
                    </div>
                )}
                {tent.wings.length > 0 && (
                    <div className="zone-badges">
                        {tent.wings.map((w) => (
                            <span key={w.id} className="zone-badge" style={{ borderColor: '#2e8b57' }}>
                                ✦ Sayap {WING_SIDE_LABELS[w.side]}
                                <button className="zone-badge-remove" onClick={() => onRemoveWing(w.id)}>×</button>
                            </span>
                        ))}
                    </div>
                )}

                {mode === 'draw' && (
                    <span className="toolbar-hint">🖱 Klik & drag di canvas untuk membuat zona…</span>
                )}

                <div className="zoom-controls">
                    <button className="zoom-btn" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z * 0.8))}>−</button>
                    <span className="zoom-label">{zoomPercent}%</span>
                    <button className="zoom-btn" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25))}>+</button>
                    <button className="zoom-btn zoom-btn-reset" onClick={resetZoom}>⟲</button>
                </div>
            </div>
            <div ref={containerRef} className="canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    style={{ width: canvasSize.w, height: canvasSize.h }}
                    className={`layout-canvas ${cursorClass}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseLeave={() => {
                        setDrawing(false);
                        setDragTarget(null);
                    }}
                />
            </div>
            <div className="canvas-legend">
                <span className="legend-item"><span className="legend-swatch legend-chair"></span> Kursi</span>
                <span className="legend-item"><span className="legend-swatch" style={{ background: 'rgba(46,139,87,0.4)', border: '1px solid #2e8b57' }}></span> Sayap</span>
                <span className="legend-item"><span className="legend-swatch legend-altar"></span> Altar</span>
                <span className="legend-item"><span className="legend-swatch" style={{ background: 'rgba(0,184,212,0.3)', border: '1px solid rgba(0,184,212,0.6)' }}></span> TV</span>
                <span className="legend-item"><span className="legend-swatch" style={{ background: 'rgba(255,112,67,0.3)', border: '1px solid rgba(255,112,67,0.6)' }}></span> Pintu</span>
                <span className="legend-item"><span className="legend-swatch" style={{ background: 'rgba(66,165,245,0.3)', border: '1px solid rgba(66,165,245,0.6)' }}></span> AC</span>
                <span className="legend-item"><span className="legend-swatch legend-zone"></span> Zona</span>
                <span className="legend-item legend-hint">Scroll = Zoom · Drag = Pan</span>
            </div>
        </div>
    );
}

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
