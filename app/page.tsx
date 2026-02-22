'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { TentConfig, ExclusionZone, createDefaultTent } from '@/lib/types';
import { calculateLayout } from '@/lib/seatCalculator';
import ConfigPanel from '@/components/ConfigPanel';
import LayoutCanvas from '@/components/LayoutCanvas';
import Summary from '@/components/Summary';

export default function Home() {
  const [tents, setTents] = useState<TentConfig[]>([
    createDefaultTent('tent-1', 'Tenda 1'),
  ]);
  const [activeTentId, setActiveTentId] = useState('tent-1');

  const activeTent = tents.find((t) => t.id === activeTentId) ?? tents[0];

  const layout = useMemo(() => calculateLayout(activeTent), [activeTent]);

  const updateTent = useCallback(
    (updated: TentConfig) => {
      setTents((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    },
    []
  );

  const addTent = () => {
    const id = `tent-${Date.now()}`;
    const newTent = createDefaultTent(id, `Tenda ${tents.length + 1}`);
    setTents((prev) => [...prev, newTent]);
    setActiveTentId(id);
  };

  const removeTent = (id: string) => {
    if (tents.length <= 1) return;
    setTents((prev) => prev.filter((t) => t.id !== id));
    if (activeTentId === id) {
      setActiveTentId(tents.find((t) => t.id !== id)!.id);
    }
  };

  const addExclusionZone = useCallback(
    (zone: ExclusionZone) => {
      updateTent({
        ...activeTent,
        exclusionZones: [...activeTent.exclusionZones, zone],
      });
    },
    [activeTent, updateTent]
  );

  const updateExclusionZone = useCallback(
    (zone: ExclusionZone) => {
      updateTent({
        ...activeTent,
        exclusionZones: activeTent.exclusionZones.map((z) =>
          z.id === zone.id ? zone : z
        ),
      });
    },
    [activeTent, updateTent]
  );

  const removeExclusionZone = useCallback(
    (id: string) => {
      updateTent({
        ...activeTent,
        exclusionZones: activeTent.exclusionZones.filter((z) => z.id !== id),
      });
    },
    [activeTent, updateTent]
  );

  // Total across all tents
  const totalAllTents = useMemo(() => {
    return tents.reduce((sum, t) => sum + calculateLayout(t).totalChairs, 0);
  }, [tents]);

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#headerGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#6c5ce7" />
              </linearGradient>
            </defs>
            <polygon points="12 2 2 22 22 22"></polygon>
          </svg>
          <div>
            <h1 className="header-title">Seat Planner</h1>
            <p className="header-subtitle">Simulasi Penataan Kursi Gereja</p>
          </div>
        </div>
        <div className="header-right">
          <div className="total-badge">
            <span className="total-badge-label">Total Semua Tenda</span>
            <span className="total-badge-value">{totalAllTents} kursi</span>
          </div>
        </div>
      </header>

      {/* Tent Tabs */}
      <div className="tent-tabs">
        <div className="tent-tab-list">
          {tents.map((t) => (
            <button
              key={t.id}
              className={`tent-tab ${t.id === activeTentId ? 'tent-tab-active' : ''}`}
              onClick={() => setActiveTentId(t.id)}
            >
              <span>{t.name}</span>
              {tents.length > 1 && (
                <span
                  className="tent-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTent(t.id);
                  }}
                >
                  ×
                </span>
              )}
            </button>
          ))}
          <button className="tent-tab-add" onClick={addTent}>
            + Tambah Tenda
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <ConfigPanel tent={activeTent} onChange={updateTent} />
        </aside>

        {/* Canvas + Summary */}
        <main className="main-area">
          <LayoutCanvas
            tent={activeTent}
            layout={layout}
            onAddExclusionZone={addExclusionZone}
            onUpdateExclusionZone={updateExclusionZone}
            onRemoveExclusionZone={removeExclusionZone}
          />
          <Summary result={layout} tentName={activeTent.name} />
        </main>
      </div>
    </div>
  );
}
