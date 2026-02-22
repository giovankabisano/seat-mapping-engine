'use client';

import React from 'react';
import { LayoutResult } from '@/lib/types';

interface SummaryProps {
    result: LayoutResult;
    tentName: string;
}

export default function Summary({ result, tentName }: SummaryProps) {
    return (
        <div className="summary-panel">
            <h3 className="summary-title">📊 Ringkasan — {tentName}</h3>
            <div className="summary-grid">
                <div className="summary-card summary-card-primary">
                    <div className="summary-value">{result.totalChairs}</div>
                    <div className="summary-label">Total Kursi</div>
                </div>
                <div className="summary-card">
                    <div className="summary-value">{result.totalRows}</div>
                    <div className="summary-label">Baris</div>
                </div>
                <div className="summary-card">
                    <div className="summary-value">{result.blocksInfo.length}</div>
                    <div className="summary-label">Blok</div>
                </div>
                <div className="summary-card">
                    <div className="summary-value">
                        {result.blocksInfo[0]?.cols ?? 0}
                    </div>
                    <div className="summary-label">Kolom / Blok</div>
                </div>
                <div className="summary-card">
                    <div className="summary-value">{result.totalAreaM2.toFixed(1)}</div>
                    <div className="summary-label">Luas Total (m²)</div>
                </div>
                <div className="summary-card">
                    <div className="summary-value">{result.usableAreaM2.toFixed(1)}</div>
                    <div className="summary-label">Area Kursi (m²)</div>
                </div>
                <div className="summary-card">
                    <div className="summary-value">
                        {result.utilizationPercent.toFixed(1)}%
                    </div>
                    <div className="summary-label">Utilisasi</div>
                </div>
            </div>
        </div>
    );
}
