'use client';

import React from 'react';
import { TentConfig } from '@/lib/types';

interface ConfigPanelProps {
    tent: TentConfig;
    onChange: (updated: TentConfig) => void;
}

function NumberInput({
    label,
    value,
    unit,
    min,
    max,
    step,
    onChange,
}: {
    label: string;
    value: number;
    unit: string;
    min?: number;
    max?: number;
    step?: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="config-field">
            <label className="config-label">{label}</label>
            <div className="config-input-wrap">
                <input
                    type="number"
                    className="config-input"
                    value={value}
                    min={min ?? 0}
                    max={max}
                    step={step ?? 0.1}
                    onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                />
                <span className="config-unit">{unit}</span>
            </div>
        </div>
    );
}

export default function ConfigPanel({ tent, onChange }: ConfigPanelProps) {
    const update = (partial: Partial<TentConfig>) => {
        onChange({ ...tent, ...partial });
    };

    return (
        <div className="config-panel">
            {/* Tent Dimensions */}
            <section className="config-section">
                <h3 className="config-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 22 22 22"></polygon></svg>
                    Dimensi Tenda
                </h3>
                <div className="config-grid">
                    <NumberInput
                        label="Lebar"
                        value={tent.widthM}
                        unit="m"
                        min={1}
                        max={100}
                        step={0.5}
                        onChange={(v) => update({ widthM: v })}
                    />
                    <NumberInput
                        label="Panjang"
                        value={tent.lengthM}
                        unit="m"
                        min={1}
                        max={100}
                        step={0.5}
                        onChange={(v) => update({ lengthM: v })}
                    />
                </div>
            </section>

            {/* Chair */}
            <section className="config-section">
                <h3 className="config-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="6" rx="1"></rect><path d="M5 11V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v5"></path><path d="M5 17v4"></path><path d="M19 17v4"></path></svg>
                    Ukuran Kursi
                </h3>
                <div className="config-grid">
                    <NumberInput
                        label="Lebar"
                        value={tent.chairWidthCm}
                        unit="cm"
                        min={20}
                        max={200}
                        step={1}
                        onChange={(v) => update({ chairWidthCm: v })}
                    />
                    <NumberInput
                        label="Kedalaman"
                        value={tent.chairDepthCm}
                        unit="cm"
                        min={20}
                        max={200}
                        step={1}
                        onChange={(v) => update({ chairDepthCm: v })}
                    />
                </div>
            </section>

            {/* Spacing */}
            <section className="config-section">
                <h3 className="config-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 6H3"></path><path d="M21 18H3"></path><path d="M12 2v20"></path></svg>
                    Jarak Antar Kursi
                </h3>
                <div className="config-grid">
                    <NumberInput
                        label="Samping"
                        value={tent.sideGapCm}
                        unit="cm"
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => update({ sideGapCm: v })}
                    />
                    <NumberInput
                        label="Depan"
                        value={tent.frontGapCm}
                        unit="cm"
                        min={0}
                        max={100}
                        step={1}
                        onChange={(v) => update({ frontGapCm: v })}
                    />
                </div>
            </section>

            {/* Aisles */}
            <section className="config-section">
                <h3 className="config-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V2"></path><path d="M20 22V2"></path><path d="M12 6v12"></path></svg>
                    Lorong Tengah (↔)
                </h3>
                <div className="config-grid">
                    <NumberInput
                        label="Jumlah"
                        value={tent.aisleCount}
                        unit="buah"
                        min={0}
                        max={10}
                        step={1}
                        onChange={(v) => update({ aisleCount: Math.floor(v) })}
                    />
                    <NumberInput
                        label="Lebar"
                        value={tent.aisleWidthCm}
                        unit="cm"
                        min={50}
                        max={300}
                        step={5}
                        onChange={(v) => update({ aisleWidthCm: v })}
                    />
                </div>
            </section>

            {/* Vertical Center Aisles */}
            <section className="config-section">
                <h3 className="config-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h20"></path><path d="M2 20h20"></path><path d="M6 12h12"></path></svg>
                    Lorong Tengah (↕)
                </h3>
                <div className="config-grid">
                    <NumberInput
                        label="Jumlah"
                        value={tent.verticalAisleCount || 0}
                        unit="buah"
                        min={0}
                        max={10}
                        step={1}
                        onChange={(v) => update({ verticalAisleCount: Math.floor(v) })}
                    />
                    <NumberInput
                        label="Lebar"
                        value={tent.verticalAisleWidthCm || 100}
                        unit="cm"
                        min={50}
                        max={300}
                        step={5}
                        onChange={(v) => update({ verticalAisleWidthCm: v })}
                    />
                </div>
            </section>

            {/* Side Aisles */}
            <section className="config-section">
                <h3 className="config-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22V2"></path><path d="M21 22V2"></path></svg>
                    Lorong Samping
                </h3>
                <div className="config-grid">
                    <NumberInput
                        label="Kiri"
                        value={tent.leftAisleCm}
                        unit="cm"
                        min={0}
                        max={300}
                        step={5}
                        onChange={(v) => update({ leftAisleCm: v })}
                    />
                    <NumberInput
                        label="Kanan"
                        value={tent.rightAisleCm}
                        unit="cm"
                        min={0}
                        max={300}
                        step={5}
                        onChange={(v) => update({ rightAisleCm: v })}
                    />
                    <NumberInput
                        label="Bawah"
                        value={tent.bottomAisleCm}
                        unit="cm"
                        min={0}
                        max={300}
                        step={5}
                        onChange={(v) => update({ bottomAisleCm: v })}
                    />
                    <NumberInput
                        label="Atas"
                        value={tent.topAisleCm}
                        unit="cm"
                        min={0}
                        max={300}
                        step={5}
                        onChange={(v) => update({ topAisleCm: v })}
                    />
                </div>
            </section>

            {/* Altar */}
            <section className="config-section">
                <h3 className="config-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><path d="M12 2v4"></path><path d="M8 2h8"></path></svg>
                    Altar
                </h3>
                <p className="config-hint">Drag altar di canvas untuk mengatur posisi</p>
                <div className="config-grid">
                    <NumberInput
                        label="Lebar"
                        value={tent.altar.widthCm}
                        unit="cm"
                        min={50}
                        max={tent.widthM * 100}
                        step={10}
                        onChange={(v) => update({ altar: { ...tent.altar, widthCm: v } })}
                    />
                    <NumberInput
                        label="Kedalaman"
                        value={tent.altar.heightCm}
                        unit="cm"
                        min={50}
                        max={tent.lengthM * 100}
                        step={10}
                        onChange={(v) => update({ altar: { ...tent.altar, heightCm: v } })}
                    />
                </div>
            </section>

            {/* AC */}
            <section className="config-section">
                <h3 className="config-section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="10" rx="2"></rect><line x1="6" y1="18" x2="6" y2="14"></line><line x1="12" y1="20" x2="12" y2="14"></line><line x1="18" y1="18" x2="18" y2="14"></line></svg>
                    ❄️ AC
                </h3>
                <p className="config-hint">AC otomatis tersebar simetris di setiap sisi</p>
                <div className="config-grid">
                    <NumberInput
                        label="Jumlah"
                        value={(tent.acConfig || { count: 0 }).count}
                        unit="unit"
                        min={0}
                        max={40}
                        step={1}
                        onChange={(v) => update({ acConfig: { ...(tent.acConfig || { count: 0, widthCm: 80, depthCm: 20 }), count: Math.floor(v) } })}
                    />
                    <NumberInput
                        label="Lebar"
                        value={(tent.acConfig || { widthCm: 80 }).widthCm}
                        unit="cm"
                        min={20}
                        max={200}
                        step={5}
                        onChange={(v) => update({ acConfig: { ...(tent.acConfig || { count: 0, widthCm: 80, depthCm: 20 }), widthCm: v } })}
                    />
                    <NumberInput
                        label="Kedalaman"
                        value={(tent.acConfig || { depthCm: 20 }).depthCm}
                        unit="cm"
                        min={5}
                        max={100}
                        step={5}
                        onChange={(v) => update({ acConfig: { ...(tent.acConfig || { count: 0, widthCm: 80, depthCm: 20 }), depthCm: v } })}
                    />
                </div>
            </section>

            {/* Exclusion Zones */}
            {tent.exclusionZones.length > 0 && (
                <section className="config-section">
                    <h3 className="config-section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
                        Zona Tanpa Kursi
                    </h3>
                    <p className="config-hint">Drag zona di canvas untuk mengatur posisi</p>
                    {tent.exclusionZones.map((zone) => (
                        <div key={zone.id} className="zone-item-config">
                            <span className="zone-item-label">
                                ✕ {zone.label}
                            </span>
                            <div className="config-grid">
                                <NumberInput
                                    label="Lebar"
                                    value={zone.widthCm}
                                    unit="cm"
                                    min={10}
                                    max={tent.widthM * 100}
                                    step={5}
                                    onChange={(v) => update({
                                        exclusionZones: tent.exclusionZones.map((z) =>
                                            z.id === zone.id ? { ...z, widthCm: v } : z
                                        ),
                                    })}
                                />
                                <NumberInput
                                    label="Kedalaman"
                                    value={zone.heightCm}
                                    unit="cm"
                                    min={10}
                                    max={tent.lengthM * 100}
                                    step={5}
                                    onChange={(v) => update({
                                        exclusionZones: tent.exclusionZones.map((z) =>
                                            z.id === zone.id ? { ...z, heightCm: v } : z
                                        ),
                                    })}
                                />
                                <NumberInput
                                    label="Posisi X"
                                    value={zone.xCm}
                                    unit="cm"
                                    min={0}
                                    max={Math.max(0, tent.widthM * 100 - zone.widthCm)}
                                    step={5}
                                    onChange={(v) => update({
                                        exclusionZones: tent.exclusionZones.map((z) =>
                                            z.id === zone.id ? { ...z, xCm: v } : z
                                        ),
                                    })}
                                />
                                <NumberInput
                                    label="Posisi Y"
                                    value={zone.yCm}
                                    unit="cm"
                                    min={0}
                                    max={Math.max(0, tent.lengthM * 100 - zone.heightCm)}
                                    step={5}
                                    onChange={(v) => update({
                                        exclusionZones: tent.exclusionZones.map((z) =>
                                            z.id === zone.id ? { ...z, yCm: v } : z
                                        ),
                                    })}
                                />
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Furniture items */}
            {tent.furniture.length > 0 && (
                <section className="config-section">
                    <h3 className="config-section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                        Perabot
                    </h3>
                    <p className="config-hint">Drag item di canvas untuk mengatur posisi</p>
                    {tent.furniture.map((item) => (
                        <div key={item.id} className="furniture-item-config">
                            <span className="furniture-item-label">
                                {item.type === 'tv' ? '📺' : '🚪'} {item.label}
                            </span>
                            <div className="config-grid">
                                <NumberInput
                                    label="Lebar"
                                    value={item.widthCm}
                                    unit="cm"
                                    min={10}
                                    max={tent.widthM * 100}
                                    step={5}
                                    onChange={(v) => update({
                                        furniture: tent.furniture.map((f) =>
                                            f.id === item.id ? { ...f, widthCm: v } : f
                                        ),
                                    })}
                                />
                                <NumberInput
                                    label="Kedalaman"
                                    value={item.heightCm}
                                    unit="cm"
                                    min={5}
                                    max={tent.lengthM * 100}
                                    step={5}
                                    onChange={(v) => update({
                                        furniture: tent.furniture.map((f) =>
                                            f.id === item.id ? { ...f, heightCm: v } : f
                                        ),
                                    })}
                                />
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Wings */}
            {tent.wings.length > 0 && (
                <section className="config-section">
                    <h3 className="config-section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v6H3z"></path><path d="M9 3v18"></path><path d="M15 3v18"></path></svg>
                        Sayap / Ekstensi
                    </h3>
                    <p className="config-hint">Atur dimensi sayap di sini</p>
                    {tent.wings.map((wing) => {
                        const sideLabel = wing.side === 'left' ? 'Kiri' : wing.side === 'right' ? 'Kanan' : wing.side === 'top' ? 'Atas' : 'Bawah';
                        const isHorizontal = wing.side === 'left' || wing.side === 'right';
                        const edgeLength = isHorizontal ? tent.lengthM * 100 : tent.widthM * 100;
                        return (
                            <div key={wing.id} className="wing-item-config">
                                <span className="wing-item-label">
                                    ✦ Sayap {sideLabel}
                                </span>
                                <div className="config-grid">
                                    <NumberInput
                                        label={isHorizontal ? 'Lebar (keluar)' : 'Tinggi (keluar)'}
                                        value={wing.widthCm}
                                        unit="cm"
                                        min={100}
                                        max={1000}
                                        step={10}
                                        onChange={(v) => update({
                                            wings: tent.wings.map((w) =>
                                                w.id === wing.id ? { ...w, widthCm: v } : w
                                            ),
                                        })}
                                    />
                                    <NumberInput
                                        label="Panjang"
                                        value={wing.lengthCm}
                                        unit="cm"
                                        min={100}
                                        max={edgeLength}
                                        step={10}
                                        onChange={(v) => update({
                                            wings: tent.wings.map((w) =>
                                                w.id === wing.id ? { ...w, lengthCm: v } : w
                                            ),
                                        })}
                                    />
                                    <NumberInput
                                        label="Offset"
                                        value={wing.offsetCm}
                                        unit="cm"
                                        min={0}
                                        max={Math.max(0, edgeLength - wing.lengthCm)}
                                        step={10}
                                        onChange={(v) => update({
                                            wings: tent.wings.map((w) =>
                                                w.id === wing.id ? { ...w, offsetCm: v } : w
                                            ),
                                        })}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
