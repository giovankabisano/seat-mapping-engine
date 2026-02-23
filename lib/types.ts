export type FurnitureType = 'tv' | 'door';

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
  /** AC auto-distribution config */
  acConfig: AcConfig;
}

export interface AcConfig {
  /** Total number of ACs */
  count: number;
  /** Width of each AC unit in cm */
  widthCm: number;
  /** Depth of each AC unit in cm */
  depthCm: number;
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
    acConfig: { count: 0, widthCm: 80, depthCm: 20 },
  };
}

/**
 * Generate AC positions distributed symmetrically along all 4 walls.
 * Remainder priority: left, right, top, bottom — so left/right stay equal.
 */
export function generateAcPositions(
  acConfig: AcConfig,
  tentWidthCm: number,
  tentLengthCm: number
): { xCm: number; yCm: number; widthCm: number; heightCm: number; wall: string }[] {
  if (acConfig.count <= 0) return [];

  // Distribute across 4 walls as evenly as possible
  const perWall = Math.floor(acConfig.count / 4);
  const remainder = acConfig.count % 4;
  // Priority: left, right first (keeps sides symmetrical), then top, bottom
  const leftCount = perWall + (remainder > 0 ? 1 : 0);
  const rightCount = perWall + (remainder > 1 ? 1 : 0);
  const topCount = perWall + (remainder > 2 ? 1 : 0);
  const bottomCount = perWall;
  const wallCounts = [topCount, rightCount, bottomCount, leftCount];

  const positions: { xCm: number; yCm: number; widthCm: number; heightCm: number; wall: string }[] = [];
  const w = acConfig.widthCm;
  const d = acConfig.depthCm;

  // Top wall — ACs along the top edge, facing down
  for (let i = 0; i < wallCounts[0]; i++) {
    const spacing = tentWidthCm / (wallCounts[0] + 1);
    positions.push({ xCm: spacing * (i + 1) - w / 2, yCm: 0, widthCm: w, heightCm: d, wall: 'top' });
  }

  // Right wall — ACs along the right edge, facing left
  for (let i = 0; i < wallCounts[1]; i++) {
    const spacing = tentLengthCm / (wallCounts[1] + 1);
    positions.push({ xCm: tentWidthCm - d, yCm: spacing * (i + 1) - w / 2, widthCm: d, heightCm: w, wall: 'right' });
  }

  // Bottom wall — ACs along the bottom edge, facing up
  for (let i = 0; i < wallCounts[2]; i++) {
    const spacing = tentWidthCm / (wallCounts[2] + 1);
    positions.push({ xCm: spacing * (i + 1) - w / 2, yCm: tentLengthCm - d, widthCm: w, heightCm: d, wall: 'bottom' });
  }

  // Left wall — ACs along the left edge, facing right
  for (let i = 0; i < wallCounts[3]; i++) {
    const spacing = tentLengthCm / (wallCounts[3] + 1);
    positions.push({ xCm: 0, yCm: spacing * (i + 1) - w / 2, widthCm: d, heightCm: w, wall: 'left' });
  }

  return positions;
}
