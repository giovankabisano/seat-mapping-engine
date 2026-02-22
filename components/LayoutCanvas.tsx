'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { TentConfig, LayoutResult, ExclusionZone } from '@/lib/types';

interface LayoutCanvasProps {
    tent: TentConfig;
    layout: LayoutResult;
    onAddExclusionZone: (zone: ExclusionZone) => void;
    onUpdateExclusionZone: (zone: ExclusionZone) => void;
    onRemoveExclusionZone: (id: string) => void;
}

const PADDING = 40; // px padding around the tent drawing

export default function LayoutCanvas({
    tent,
    layout,
    onAddExclusionZone,
    onUpdateExclusionZone,
    onRemoveExclusionZone,
}: LayoutCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
    const [drawing, setDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
    const [drawEnd, setDrawEnd] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [mode, setMode] = useState<'view' | 'draw'>('view');
    const [hoveredZone, setHoveredZone] = useState<string | null>(null);

    const tentWidthCm = tent.widthM * 100;
    const tentLengthCm = tent.lengthM * 100;

    // Scale factor: how many px per cm
    const scaleX = (canvasSize.w - PADDING * 2) / tentWidthCm;
    const scaleY = (canvasSize.h - PADDING * 2) / tentLengthCm;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (canvasSize.w - tentWidthCm * scale) / 2;
    const offsetY = (canvasSize.h - tentLengthCm * scale) / 2;

    // Convert canvas pixel to tent cm
    const pxToCm = useCallback(
        (px: number, py: number) => ({
            xCm: (px - offsetX) / scale,
            yCm: (py - offsetY) / scale,
        }),
        [offsetX, offsetY, scale]
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

    // Draw the canvas
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

        // Draw tent boundary
        ctx.strokeStyle = '#3b3b5c';
        ctx.lineWidth = 2;
        ctx.strokeRect(offsetX, offsetY, tentWidthCm * scale, tentLengthCm * scale);

        // Grid lines (subtle)
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 0.5;
        const gridStepCm = 100; // 1m grid
        for (let x = gridStepCm; x < tentWidthCm; x += gridStepCm) {
            ctx.beginPath();
            ctx.moveTo(offsetX + x * scale, offsetY);
            ctx.lineTo(offsetX + x * scale, offsetY + tentLengthCm * scale);
            ctx.stroke();
        }
        for (let y = gridStepCm; y < tentLengthCm; y += gridStepCm) {
            ctx.beginPath();
            ctx.moveTo(offsetX, offsetY + y * scale);
            ctx.lineTo(offsetX + tentWidthCm * scale, offsetY + y * scale);
            ctx.stroke();
        }

        // Draw altar area
        const altarH = tent.altarDepthM * 100 * scale;
        if (altarH > 0) {
            const altarGrad = ctx.createLinearGradient(
                offsetX,
                offsetY,
                offsetX,
                offsetY + altarH
            );
            altarGrad.addColorStop(0, 'rgba(212, 175, 55, 0.35)');
            altarGrad.addColorStop(1, 'rgba(212, 175, 55, 0.08)');
            ctx.fillStyle = altarGrad;
            ctx.fillRect(offsetX, offsetY, tentWidthCm * scale, altarH);

            // Altar label
            ctx.fillStyle = '#d4af37';
            ctx.font = `bold ${Math.max(11, 14 * scale)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(
                '✝ ALTAR',
                offsetX + (tentWidthCm * scale) / 2,
                offsetY + altarH / 2 + 5
            );
        }

        // Draw side aisles
        const leftAisleCm = tent.leftAisleCm || 0;
        const rightAisleCm = tent.rightAisleCm || 0;
        const seatingYStart = offsetY + altarH;
        const seatingH = (tentLengthCm - tent.altarDepthM * 100) * scale;

        if (leftAisleCm > 0) {
            const lw = leftAisleCm * scale;
            ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
            ctx.fillRect(offsetX, seatingYStart, lw, seatingH);
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(offsetX + lw, seatingYStart);
            ctx.lineTo(offsetX + lw, offsetY + tentLengthCm * scale);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (rightAisleCm > 0) {
            const rw = rightAisleCm * scale;
            const rx = offsetX + tentWidthCm * scale - rw;
            ctx.fillStyle = 'rgba(46, 204, 113, 0.08)';
            ctx.fillRect(rx, seatingYStart, rw, seatingH);
            ctx.strokeStyle = 'rgba(46, 204, 113, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(rx, seatingYStart);
            ctx.lineTo(rx, offsetY + tentLengthCm * scale);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw center aisles
        if (tent.aisleCount > 0) {
            const numBlocks = tent.aisleCount + 1;
            const sideAisleWidth = leftAisleCm + rightAisleCm;
            const totalCenterAisleWidth = tent.aisleCount * tent.aisleWidthCm;
            const availableWidth = tentWidthCm - totalCenterAisleWidth - sideAisleWidth;
            const blockWidth = availableWidth / numBlocks;

            for (let i = 1; i <= tent.aisleCount; i++) {
                const aisleX = offsetX + (leftAisleCm + blockWidth * i + tent.aisleWidthCm * (i - 1)) * scale;
                const aisleW = tent.aisleWidthCm * scale;
                ctx.fillStyle = 'rgba(100, 120, 200, 0.08)';
                ctx.fillRect(aisleX, seatingYStart, aisleW, seatingH);

                // Dashed lines for aisle
                ctx.strokeStyle = 'rgba(100, 120, 200, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(aisleX, seatingYStart);
                ctx.lineTo(aisleX, offsetY + tentLengthCm * scale);
                ctx.moveTo(aisleX + aisleW, seatingYStart);
                ctx.lineTo(aisleX + aisleW, offsetY + tentLengthCm * scale);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // Draw chairs
        for (const chair of layout.chairs) {
            const cx = offsetX + chair.xCm * scale;
            const cy = offsetY + chair.yCm * scale;
            const cw = tent.chairWidthCm * scale;
            const ch = tent.chairDepthCm * scale;

            if (chair.excluded) {
                // Show faded placeholder for excluded chairs
                ctx.fillStyle = 'rgba(255, 60, 60, 0.12)';
                ctx.fillRect(cx, cy, cw, ch);
            } else {
                // Chair gradient
                const chairGrad = ctx.createLinearGradient(cx, cy, cx, cy + ch);
                chairGrad.addColorStop(0, '#6c5ce7');
                chairGrad.addColorStop(1, '#4834d4');
                ctx.fillStyle = chairGrad;
                ctx.beginPath();
                ctx.roundRect(cx, cy, cw, ch, 2 * scale);
                ctx.fill();

                // Chair border
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        // Draw exclusion zones
        for (const zone of tent.exclusionZones) {
            const zx = offsetX + zone.xCm * scale;
            const zy = offsetY + zone.yCm * scale;
            const zw = zone.widthCm * scale;
            const zh = zone.heightCm * scale;

            const isHovered = hoveredZone === zone.id;

            ctx.fillStyle = isHovered
                ? 'rgba(255, 100, 100, 0.25)'
                : 'rgba(255, 70, 70, 0.15)';
            ctx.fillRect(zx, zy, zw, zh);

            ctx.strokeStyle = isHovered ? '#ff6b6b' : 'rgba(255, 100, 100, 0.5)';
            ctx.lineWidth = isHovered ? 2 : 1;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(zx, zy, zw, zh);
            ctx.setLineDash([]);

            // Label
            ctx.fillStyle = '#ff6b6b';
            ctx.font = `${Math.max(9, 11 * scale)}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(zone.label || 'Zona', zx + zw / 2, zy + zh / 2 + 4);
        }

        // Draw current drawing rect
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

        // Scale labels
        ctx.fillStyle = '#555';
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${tent.widthM} m`,
            offsetX + (tentWidthCm * scale) / 2,
            offsetY + tentLengthCm * scale + 18
        );
        ctx.save();
        ctx.translate(offsetX - 18, offsetY + (tentLengthCm * scale) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(`${tent.lengthM} m`, 0, 0);
        ctx.restore();
    }, [canvasSize, tent, layout, drawing, drawStart, drawEnd, hoveredZone, offsetX, offsetY, scale, tentWidthCm, tentLengthCm]);

    // Mouse handlers for drawing/dragging exclusion zones
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const { xCm, yCm } = pxToCm(px, py);

        // Check if clicking on an existing zone (for drag)
        if (mode === 'view') {
            for (const zone of tent.exclusionZones) {
                if (
                    xCm >= zone.xCm &&
                    xCm <= zone.xCm + zone.widthCm &&
                    yCm >= zone.yCm &&
                    yCm <= zone.yCm + zone.heightCm
                ) {
                    setDragging(zone.id);
                    setDragOffset({ x: xCm - zone.xCm, y: yCm - zone.yCm });
                    return;
                }
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

        if (dragging) {
            const zone = tent.exclusionZones.find((z) => z.id === dragging);
            if (zone) {
                onUpdateExclusionZone({
                    ...zone,
                    xCm: Math.max(0, Math.min(tentWidthCm - zone.widthCm, xCm - dragOffset.x)),
                    yCm: Math.max(0, Math.min(tentLengthCm - zone.heightCm, yCm - dragOffset.y)),
                });
            }
            return;
        }

        if (drawing) {
            setDrawEnd({ x: px, y: py });
            return;
        }

        // Hover check
        let foundHover: string | null = null;
        for (const zone of tent.exclusionZones) {
            if (
                xCm >= zone.xCm &&
                xCm <= zone.xCm + zone.widthCm &&
                yCm >= zone.yCm &&
                yCm <= zone.yCm + zone.heightCm
            ) {
                foundHover = zone.id;
                break;
            }
        }
        setHoveredZone(foundHover);
    };

    const handleMouseUp = () => {
        if (dragging) {
            setDragging(null);
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
            </div>
            <div ref={containerRef} className="canvas-wrapper">
                <canvas
                    ref={canvasRef}
                    style={{ width: canvasSize.w, height: canvasSize.h }}
                    className={`layout-canvas ${mode === 'draw' ? 'canvas-draw-mode' : ''}`}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                        setDrawing(false);
                        setDragging(null);
                    }}
                />
            </div>
            <div className="canvas-legend">
                <span className="legend-item"><span className="legend-swatch legend-chair"></span> Kursi</span>
                <span className="legend-item"><span className="legend-swatch legend-altar"></span> Altar</span>
                <span className="legend-item"><span className="legend-swatch legend-aisle"></span> Lorong Tengah</span>
                <span className="legend-item"><span className="legend-swatch legend-side-aisle"></span> Lorong Samping</span>
                <span className="legend-item"><span className="legend-swatch legend-zone"></span> Zona Exclusion</span>
            </div>
        </div>
    );
}
