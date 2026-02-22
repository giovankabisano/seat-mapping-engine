'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { TentConfig, LayoutResult, ExclusionZone, AltarConfig } from '@/lib/types';

interface LayoutCanvasProps {
    tent: TentConfig;
    layout: LayoutResult;
    onAddExclusionZone: (zone: ExclusionZone) => void;
    onUpdateExclusionZone: (zone: ExclusionZone) => void;
    onRemoveExclusionZone: (id: string) => void;
    onUpdateAltar: (altar: AltarConfig) => void;
}

const RULER_SIZE = 30; // px width/height of ruler bars
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5;

type DragTarget =
    | { type: 'altar' }
    | { type: 'zone'; id: string }
    | { type: 'pan' }
    | null;

export default function LayoutCanvas({
    tent,
    layout,
    onAddExclusionZone,
    onUpdateExclusionZone,
    onRemoveExclusionZone,
    onUpdateAltar,
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

    // Zoom & pan state
    const [zoom, setZoom] = useState(1);
    const [panX, setPanX] = useState(0);
    const [panY, setPanY] = useState(0);
    const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });

    const tentWidthCm = tent.widthM * 100;
    const tentLengthCm = tent.lengthM * 100;

    // Available area for drawing (minus ruler)
    const drawAreaW = canvasSize.w - RULER_SIZE;
    const drawAreaH = canvasSize.h - RULER_SIZE;

    // Base scale: fit tent into available area with some padding
    const basePad = 30;
    const baseScaleX = (drawAreaW - basePad * 2) / tentWidthCm;
    const baseScaleY = (drawAreaH - basePad * 2) / tentLengthCm;
    const baseScale = Math.min(baseScaleX, baseScaleY);

    // Final scale with zoom
    const scale = baseScale * zoom;

    // Center of the drawing area
    const centerX = RULER_SIZE + drawAreaW / 2;
    const centerY = RULER_SIZE + drawAreaH / 2;

    // Tent top-left position (in canvas px) with pan
    const tentOriginX = centerX - (tentWidthCm * scale) / 2 + panX;
    const tentOriginY = centerY - (tentLengthCm * scale) / 2 + panY;

    // Convert canvas pixel to tent cm
    const pxToCm = useCallback(
        (px: number, py: number) => ({
            xCm: (px - tentOriginX) / scale,
            yCm: (py - tentOriginY) / scale,
        }),
        [tentOriginX, tentOriginY, scale]
    );

    // Resize observer
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

    // Reset zoom when tent changes
    const resetZoom = useCallback(() => {
        setZoom(1);
        setPanX(0);
        setPanY(0);
    }, []);

    // Hit test
    function hitTest(xCm: number, yCm: number, rect: { xCm: number; yCm: number; widthCm: number; heightCm: number }) {
        return xCm >= rect.xCm && xCm <= rect.xCm + rect.widthCm && yCm >= rect.yCm && yCm <= rect.yCm + rect.heightCm;
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

        // Clear
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, canvasSize.w, canvasSize.h);

        // === Draw main content area (clipped to exclude ruler area) ===
        ctx.save();
        ctx.beginPath();
        ctx.rect(RULER_SIZE, RULER_SIZE, drawAreaW, drawAreaH);
        ctx.clip();

        // Tent boundary
        ctx.strokeStyle = '#3b3b5c';
        ctx.lineWidth = 2;
        ctx.strokeRect(tentOriginX, tentOriginY, tentWidthCm * scale, tentLengthCm * scale);

        // Grid
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 0.5;
        const gridStepCm = 100;
        for (let x = gridStepCm; x < tentWidthCm; x += gridStepCm) {
            ctx.beginPath();
            ctx.moveTo(tentOriginX + x * scale, tentOriginY);
            ctx.lineTo(tentOriginX + x * scale, tentOriginY + tentLengthCm * scale);
            ctx.stroke();
        }
        for (let y = gridStepCm; y < tentLengthCm; y += gridStepCm) {
            ctx.beginPath();
            ctx.moveTo(tentOriginX, tentOriginY + y * scale);
            ctx.lineTo(tentOriginX + tentWidthCm * scale, tentOriginY + y * scale);
            ctx.stroke();
        }

        // Side aisles
        const leftAisleCm = tent.leftAisleCm || 0;
        const rightAisleCm = tent.rightAisleCm || 0;

        if (leftAisleCm > 0) {
            const lw = leftAisleCm * scale;
            ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
            ctx.fillRect(tentOriginX, tentOriginY, lw, tentLengthCm * scale);
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(tentOriginX + lw, tentOriginY);
            ctx.lineTo(tentOriginX + lw, tentOriginY + tentLengthCm * scale);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (rightAisleCm > 0) {
            const rw = rightAisleCm * scale;
            const rx = tentOriginX + tentWidthCm * scale - rw;
            ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
            ctx.fillRect(rx, tentOriginY, rw, tentLengthCm * scale);
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(rx, tentOriginY);
            ctx.lineTo(rx, tentOriginY + tentLengthCm * scale);
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
                const aisleX = tentOriginX + (leftAisleCm + blockWidth * i + tent.aisleWidthCm * (i - 1)) * scale;
                const aisleW = tent.aisleWidthCm * scale;
                ctx.fillStyle = 'rgba(100, 120, 200, 0.08)';
                ctx.fillRect(aisleX, tentOriginY, aisleW, tentLengthCm * scale);

                ctx.strokeStyle = 'rgba(100, 120, 200, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(aisleX, tentOriginY);
                ctx.lineTo(aisleX, tentOriginY + tentLengthCm * scale);
                ctx.moveTo(aisleX + aisleW, tentOriginY);
                ctx.lineTo(aisleX + aisleW, tentOriginY + tentLengthCm * scale);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Chairs
        for (const chair of layout.chairs) {
            if (chair.excluded) continue;

            const cx = tentOriginX + chair.xCm * scale;
            const cy = tentOriginY + chair.yCm * scale;
            const cw = tent.chairWidthCm * scale;
            const ch = tent.chairDepthCm * scale;

            const chairGrad = ctx.createLinearGradient(cx, cy, cx, cy + ch);
            chairGrad.addColorStop(0, '#6c5ce7');
            chairGrad.addColorStop(1, '#4834d4');
            ctx.fillStyle = chairGrad;
            ctx.beginPath();
            ctx.roundRect(cx, cy, cw, ch, Math.max(1, 2 * scale));
            ctx.fill();

            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }

        // Altar
        const altar = tent.altar;
        if (altar.widthCm > 0 && altar.heightCm > 0) {
            const ax = tentOriginX + altar.xCm * scale;
            const ay = tentOriginY + altar.yCm * scale;
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

        // Exclusion zones
        for (const zone of tent.exclusionZones) {
            const zx = tentOriginX + zone.xCm * scale;
            const zy = tentOriginY + zone.yCm * scale;
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

        ctx.restore(); // end clip

        // ===== RULERS =====
        // Top ruler background
        ctx.fillStyle = '#141422';
        ctx.fillRect(RULER_SIZE, 0, drawAreaW, RULER_SIZE);
        // Left ruler background
        ctx.fillRect(0, RULER_SIZE, RULER_SIZE, drawAreaH);
        // Corner square
        ctx.fillStyle = '#181830';
        ctx.fillRect(0, 0, RULER_SIZE, RULER_SIZE);

        // Subtle border
        ctx.strokeStyle = '#2a2a45';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(RULER_SIZE, 0);
        ctx.lineTo(RULER_SIZE, canvasSize.h);
        ctx.moveTo(0, RULER_SIZE);
        ctx.lineTo(canvasSize.w, RULER_SIZE);
        ctx.stroke();

        // Ruler tick configuration — choose step based on zoom
        const pixelsPerMeter = 100 * scale;
        let rulerStepCm: number;
        if (pixelsPerMeter > 200) rulerStepCm = 25; // every 25cm
        else if (pixelsPerMeter > 100) rulerStepCm = 50; // every 50cm
        else if (pixelsPerMeter > 40) rulerStepCm = 100; // every 1m
        else rulerStepCm = 200; // every 2m

        ctx.fillStyle = '#888';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.font = '9px system-ui, sans-serif';

        // Top ruler (X axis — width)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        for (let cm = 0; cm <= tentWidthCm; cm += rulerStepCm) {
            const px = tentOriginX + cm * scale;
            if (px < RULER_SIZE - 5 || px > canvasSize.w + 5) continue;

            const isMajor = cm % 100 === 0;
            const tickH = isMajor ? 10 : 5;

            ctx.beginPath();
            ctx.moveTo(px, RULER_SIZE);
            ctx.lineTo(px, RULER_SIZE - tickH);
            ctx.stroke();

            if (isMajor) {
                const label = (cm / 100).toString();
                ctx.fillText(label, px, RULER_SIZE - tickH - 2);
            }
        }

        // Left ruler (Y axis — length)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let cm = 0; cm <= tentLengthCm; cm += rulerStepCm) {
            const py = tentOriginY + cm * scale;
            if (py < RULER_SIZE - 5 || py > canvasSize.h + 5) continue;

            const isMajor = cm % 100 === 0;
            const tickW = isMajor ? 10 : 5;

            ctx.beginPath();
            ctx.moveTo(RULER_SIZE, py);
            ctx.lineTo(RULER_SIZE - tickW, py);
            ctx.stroke();

            if (isMajor) {
                const label = (cm / 100).toString();
                ctx.fillText(label, RULER_SIZE - tickW - 3, py);
            }
        }

        // Ruler unit labels in corner
        ctx.fillStyle = '#555';
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('m', RULER_SIZE / 2, RULER_SIZE / 2);

    }, [canvasSize, tent, layout, drawing, drawStart, drawEnd, hoveredItem, zoom, panX, panY, tentOriginX, tentOriginY, scale, drawAreaW, drawAreaH, tentWidthCm, tentLengthCm]);

    // ===== WHEEL ZOOM =====
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Zoom factor
            const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * zoomDelta));

            // Zoom toward cursor position
            const zoomRatio = newZoom / zoom;
            const newPanX = mouseX - (mouseX - panX - centerX + (tentWidthCm * baseScale * zoom) / 2) * zoomRatio - centerX + (tentWidthCm * baseScale * newZoom) / 2;
            const newPanY = mouseY - (mouseY - panY - centerY + (tentLengthCm * baseScale * zoom) / 2) * zoomRatio - centerY + (tentLengthCm * baseScale * newZoom) / 2;

            setZoom(newZoom);
            setPanX(newPanX);
            setPanY(newPanY);
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [zoom, panX, panY, centerX, centerY, tentWidthCm, tentLengthCm, baseScale]);

    // ===== MOUSE HANDLERS =====
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const { xCm, yCm } = pxToCm(px, py);

        // Middle-click or right-click = pan
        if (e.button === 1 || e.button === 2) {
            e.preventDefault();
            setDragTarget({ type: 'pan' });
            setLastPanPos({ x: px, y: py });
            return;
        }

        if (mode === 'view') {
            // Check altar
            if (hitTest(xCm, yCm, tent.altar)) {
                setDragTarget({ type: 'altar' });
                setDragOffset({ x: xCm - tent.altar.xCm, y: yCm - tent.altar.yCm });
                return;
            }

            // Check exclusion zones
            for (const zone of tent.exclusionZones) {
                if (hitTest(xCm, yCm, zone)) {
                    setDragTarget({ type: 'zone', id: zone.id });
                    setDragOffset({ x: xCm - zone.xCm, y: yCm - zone.yCm });
                    return;
                }
            }

            // Left-click on empty = pan
            if (!hitTest(xCm, yCm, tent.altar) && !tent.exclusionZones.some(z => hitTest(xCm, yCm, z))) {
                setDragTarget({ type: 'pan' });
                setLastPanPos({ x: px, y: py });
                return;
            }
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

        if (drawing) {
            setDrawEnd({ x: px, y: py });
            return;
        }

        // Hover check
        let found: string | null = null;
        if (hitTest(xCm, yCm, tent.altar)) {
            found = 'altar';
        } else {
            for (const zone of tent.exclusionZones) {
                if (hitTest(xCm, yCm, zone)) {
                    found = zone.id;
                    break;
                }
            }
        }
        setHoveredItem(found);
    };

    const handleMouseUp = () => {
        if (dragTarget) {
            setDragTarget(null);
            return;
        }

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
                    <span>Zona Tanpa Kursi</span>
                </button>
                {tent.exclusionZones.length > 0 && (
                    <div className="zone-badges">
                        {tent.exclusionZones.map((z) => (
                            <span key={z.id} className="zone-badge">
                                {z.label}
                                <button
                                    className="zone-badge-remove"
                                    onClick={() => onRemoveExclusionZone(z.id)}
                                    title="Hapus zona"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                {mode === 'draw' && (
                    <span className="toolbar-hint">🖱 Klik & drag di canvas untuk membuat zona…</span>
                )}

                {/* Zoom controls */}
                <div className="zoom-controls">
                    <button
                        className="zoom-btn"
                        onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z * 0.8))}
                        title="Zoom Out"
                    >
                        −
                    </button>
                    <span className="zoom-label">{zoomPercent}%</span>
                    <button
                        className="zoom-btn"
                        onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.25))}
                        title="Zoom In"
                    >
                        +
                    </button>
                    <button
                        className="zoom-btn zoom-btn-reset"
                        onClick={resetZoom}
                        title="Reset View"
                    >
                        ⟲
                    </button>
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
                <span className="legend-item"><span className="legend-swatch legend-altar"></span> Altar</span>
                <span className="legend-item"><span className="legend-swatch legend-aisle"></span> Lorong Tengah</span>
                <span className="legend-item"><span className="legend-swatch legend-side-aisle"></span> Lorong Samping</span>
                <span className="legend-item"><span className="legend-swatch legend-zone"></span> Zona Exclusion</span>
                <span className="legend-item legend-hint">Scroll = Zoom · Drag = Pan</span>
            </div>
        </div>
    );
}
