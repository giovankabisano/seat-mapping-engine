export type FurnitureType = 'tv' | 'door' | 'ac';

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  label: string;
  /** X position in cm from left edge */
  xCm: number;
  /** Y position in cm from top (front) edge */
  yCm: number;
  /** Width in cm */
  widthCm: number;
  /** Height/depth in cm */
  heightCm: number;
}

export type WingSide = 'left' | 'right' | 'top' | 'bottom';

export interface WingConfig {
  id: string;
  side: WingSide;
  /** Offset along the edge from its start (cm) */
  offsetCm: number;
  /** How far the wing extends outward from the tent edge (cm) */
  widthCm: number;
  /** How long the wing spans along the edge (cm) */
  lengthCm: number;
}

export interface AltarConfig {
  /** X position in cm from left edge */
  xCm: number;
  /** Y position in cm from top (front) edge */
  yCm: number;
  /** Width in cm */
  widthCm: number;
  /** Height/depth in cm */
  heightCm: number;
}

export interface TentConfig {
  id: string;
  name: string;
  /** Tent width in meters */
  widthM: number;
  /** Tent length/depth in meters */
  lengthM: number;
  /** Chair width in cm */
  chairWidthCm: number;
  /** Chair depth in cm */
  chairDepthCm: number;
  /** Side gap between chairs in cm */
  sideGapCm: number;
  /** Front gap between rows in cm */
  frontGapCm: number;
  /** Number of vertical aisles */
  aisleCount: number;
  /** Aisle width in cm */
  aisleWidthCm: number;
  /** Altar — draggable rectangle on the canvas */
  altar: AltarConfig;
  /** Left side aisle width in cm */
  leftAisleCm: number;
  /** Right side aisle width in cm */
  rightAisleCm: number;
  /** Bottom/rear aisle width in cm */
  bottomAisleCm: number;
  /** Top/front aisle width in cm */
  topAisleCm: number;
  /** Exclusion zones (no-chair areas) */
  exclusionZones: ExclusionZone[];
  /** Furniture items (TV monitors, doors) */
  furniture: FurnitureItem[];
  /** Wing extensions for non-rectangular shapes */
  wings: WingConfig[];
}

export interface ExclusionZone {
  id: string;
  label: string;
  /** X position in cm from left edge */
  xCm: number;
  /** Y position in cm from top (front) edge */
  yCm: number;
  /** Width in cm */
  widthCm: number;
  /** Height/depth in cm */
  heightCm: number;
}

export interface ChairPosition {
  row: number;
  col: number;
  block: number;
  /** Absolute X in the global coordinate system (cm) */
  xCm: number;
  /** Absolute Y in the global coordinate system (cm) */
  yCm: number;
  excluded: boolean;
  /** null = main tent, otherwise wing id */
  wingId: string | null;
}

export interface LayoutResult {
  chairs: ChairPosition[];
  totalChairs: number;
  totalRows: number;
  blocksInfo: BlockInfo[];
  usableAreaM2: number;
  totalAreaM2: number;
  utilizationPercent: number;
}

export interface BlockInfo {
  blockIndex: number;
  cols: number;
  xStartCm: number;
  widthCm: number;
}

export function createDefaultTent(id: string, name: string): TentConfig {
  return {
    id,
    name,
    widthM: 10,
    lengthM: 8,
    chairWidthCm: 45,
    chairDepthCm: 45,
    sideGapCm: 5,
    frontGapCm: 10,
    aisleCount: 1,
    aisleWidthCm: 100,
    altar: {
      xCm: 250,
      yCm: 0,
      widthCm: 500,
      heightCm: 150,
    },
    leftAisleCm: 0,
    rightAisleCm: 0,
    bottomAisleCm: 0,
    topAisleCm: 0,
    exclusionZones: [],
    furniture: [],
    wings: [],
  };
}
