'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { TentConfig, ExclusionZone, AltarConfig, FurnitureItem, createDefaultTent } from '@/lib/types';
import { calculateLayout } from '@/lib/seatCalculator';
import ConfigPanel from '@/components/ConfigPanel';
import LayoutCanvas from '@/components/LayoutCanvas';
import Summary from '@/components/Summary';

const STORAGE_KEY = 'seat-planner-state';

function loadSavedState(): { tents: TentConfig[]; activeTentId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.tents?.length > 0 && parsed?.activeTentId) {
      return parsed;
    }
  } catch {
    // ignore corrupt data
  }
  return null;
}

export default function Home() {
  const [tents, setTents] = useState<TentConfig[]>(() => {
    const saved = loadSavedState();
    return saved ? saved.tents : [createDefaultTent('tent-1', 'Tenda 1')];
  });
  const [activeTentId, setActiveTentId] = useState(() => {
    const saved = loadSavedState();
    return saved ? saved.activeTentId : 'tent-1';
  });

  // Auto-save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tents, activeTentId }));
    } catch {
      // ignore quota exceeded
    }
  }, [tents, activeTentId]);

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

  const updateAltar = useCallback(
    (altar: AltarConfig) => {
      updateTent({ ...activeTent, altar });
    },
    [activeTent, updateTent]
  );

  const addFurniture = useCallback(
    (item: FurnitureItem) => {
      updateTent({ ...activeTent, furniture: [...activeTent.furniture, item] });
    },
    [activeTent, updateTent]
  );

  const updateFurniture = useCallback(
    (item: FurnitureItem) => {
      updateTent({
        ...activeTent,
        furniture: activeTent.furniture.map((f) => (f.id === item.id ? item : f)),
      });
    },
    [activeTent, updateTent]
  );

  const removeFurniture = useCallback(
    (id: string) => {
      updateTent({
        ...activeTent,
        furniture: activeTent.furniture.filter((f) => f.id !== id),
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
            onUpdateAltar={updateAltar}
            onAddFurniture={addFurniture}
            onUpdateFurniture={updateFurniture}
            onRemoveFurniture={removeFurniture}
          />
          <Summary result={layout} tentName={activeTent.name} />
        </main>
      </div>
    </div>
  );
}
