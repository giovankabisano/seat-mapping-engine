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
                    Lorong Tengah
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
        </div>
    );
}
