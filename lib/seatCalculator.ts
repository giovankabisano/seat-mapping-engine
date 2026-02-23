import { TentConfig, ChairPosition, LayoutResult, BlockInfo, ExclusionZone, FurnitureItem, WingConfig } from './types';

type Rect = { xCm: number; yCm: number; widthCm: number; heightCm: number };

function rectsOverlap(cx: number, cy: number, cw: number, ch: number, r: Rect): boolean {
    return cx < r.xCm + r.widthCm && cx + cw > r.xCm && cy < r.yCm + r.heightCm && cy + ch > r.yCm;
}

/**
 * Checks if a chair overlaps the altar, any exclusion zone, or any furniture item.
 */
function isExcluded(
    cx: number,
    cy: number,
    chairW: number,
    chairH: number,
    zones: ExclusionZone[],
    altar: Rect,
    furniture: FurnitureItem[]
): boolean {
    if (altar.widthCm > 0 && altar.heightCm > 0 && rectsOverlap(cx, cy, chairW, chairH, altar)) return true;
    for (const z of zones) {
        if (rectsOverlap(cx, cy, chairW, chairH, z)) return true;
    }
    for (const f of furniture) {
        if (rectsOverlap(cx, cy, chairW, chairH, f)) return true;
    }
    return false;
}

/**
 * Get the absolute rectangle of a wing in the global coordinate system.
 */
export function getWingRect(wing: WingConfig, tentWidthCm: number, tentLengthCm: number): Rect {
    switch (wing.side) {
        case 'left':
            return { xCm: -wing.widthCm, yCm: wing.offsetCm, widthCm: wing.widthCm, heightCm: wing.lengthCm };
        case 'right':
            return { xCm: tentWidthCm, yCm: wing.offsetCm, widthCm: wing.widthCm, heightCm: wing.lengthCm };
        case 'top':
            return { xCm: wing.offsetCm, yCm: -wing.widthCm, widthCm: wing.lengthCm, heightCm: wing.widthCm };
        case 'bottom':
            return { xCm: wing.offsetCm, yCm: tentLengthCm, widthCm: wing.lengthCm, heightCm: wing.widthCm };
    }
}

/**
 * Calculate the bounding box of the whole tent including wings.
 */
export function getTotalBounds(tent: TentConfig): Rect {
    const tentWidthCm = tent.widthM * 100;
    const tentLengthCm = tent.lengthM * 100;
    let minX = 0, minY = 0, maxX = tentWidthCm, maxY = tentLengthCm;

    for (const wing of tent.wings) {
        const wr = getWingRect(wing, tentWidthCm, tentLengthCm);
        minX = Math.min(minX, wr.xCm);
        minY = Math.min(minY, wr.yCm);
        maxX = Math.max(maxX, wr.xCm + wr.widthCm);
        maxY = Math.max(maxY, wr.yCm + wr.heightCm);
    }

    return { xCm: minX, yCm: minY, widthCm: maxX - minX, heightCm: maxY - minY };
}

/**
 * Generate a chair grid for a rectangular section.
 */
function generateChairGrid(
    sectionRect: Rect,
    tent: TentConfig,
    wingId: string | null
): ChairPosition[] {
    const chairs: ChairPosition[] = [];
    const cellWidth = tent.chairWidthCm + tent.sideGapCm;
    const cellDepth = tent.chairDepthCm + tent.frontGapCm;

    const cols = Math.floor(sectionRect.widthCm / cellWidth);
    const rows = Math.floor(sectionRect.heightCm / cellDepth);
    if (cols <= 0 || rows <= 0) return chairs;

    const usedWidth = cols * cellWidth - tent.sideGapCm;
    const padX = (sectionRect.widthCm - usedWidth) / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cx = sectionRect.xCm + padX + c * cellWidth;
            const cy = sectionRect.yCm + r * cellDepth;
            const excluded = isExcluded(
                cx, cy, tent.chairWidthCm, tent.chairDepthCm,
                tent.exclusionZones, tent.altar, tent.furniture
            );
            chairs.push({ row: r, col: c, block: 0, xCm: cx, yCm: cy, excluded, wingId });
        }
    }
    return chairs;
}

/**
 * Calculate the full seat layout for a tent, including wings.
 */
export function calculateLayout(tent: TentConfig): LayoutResult {
    const tentWidthCm = tent.widthM * 100;
    const tentLengthCm = tent.lengthM * 100;

    // ===== Main tent =====
    const aisleCount = Math.max(0, tent.aisleCount);
    const totalAisleWidth = aisleCount * tent.aisleWidthCm;
    const sideAisleWidth = (tent.leftAisleCm || 0) + (tent.rightAisleCm || 0);
    const availableWidthForChairs = tentWidthCm - totalAisleWidth - sideAisleWidth;
    const seatingStartX = tent.leftAisleCm || 0;

    const cellDepth = tent.chairDepthCm + tent.frontGapCm;
    const totalRows = Math.floor(tentLengthCm / cellDepth);
    const cellWidth = tent.chairWidthCm + tent.sideGapCm;

    const blocksInfo: BlockInfo[] = [];
    let mainChairs: ChairPosition[] = [];

    if (availableWidthForChairs > 0) {
        const numBlocks = aisleCount + 1;
        const blockWidth = availableWidthForChairs / numBlocks;
        const colsPerBlock = Math.floor(blockWidth / cellWidth);

        for (let b = 0; b < numBlocks; b++) {
            const xStart = seatingStartX + b * (blockWidth + tent.aisleWidthCm);
            const usedWidth = colsPerBlock * cellWidth - tent.sideGapCm;
            const blockPadding = (blockWidth - usedWidth) / 2;

            blocksInfo.push({
                blockIndex: b,
                cols: colsPerBlock,
                xStartCm: xStart,
                widthCm: blockWidth,
            });

            for (let r = 0; r < totalRows; r++) {
                for (let c = 0; c < colsPerBlock; c++) {
                    const cx = xStart + blockPadding + c * cellWidth;
                    const cy = r * cellDepth;
                    const excluded = isExcluded(
                        cx, cy, tent.chairWidthCm, tent.chairDepthCm,
                        tent.exclusionZones, tent.altar, tent.furniture
                    );
                    mainChairs.push({ row: r, col: c, block: b, xCm: cx, yCm: cy, excluded, wingId: null });
                }
            }
        }
    }

    // ===== Wing chairs =====
    let wingChairs: ChairPosition[] = [];
    let wingAreaM2 = 0;

    for (const wing of tent.wings) {
        const wr = getWingRect(wing, tentWidthCm, tentLengthCm);
        wingAreaM2 += (wr.widthCm / 100) * (wr.heightCm / 100);
        const wChairs = generateChairGrid(wr, tent, wing.id);
        wingChairs = wingChairs.concat(wChairs);
    }

    // ===== Combine =====
    const allChairs = [...mainChairs, ...wingChairs];
    const totalChairs = allChairs.filter((ch) => !ch.excluded).length;
    const mainAreaM2 = tent.widthM * tent.lengthM;
    const totalAreaM2 = mainAreaM2 + wingAreaM2;
    const chairAreaM2 = totalChairs * ((tent.chairWidthCm / 100) * (tent.chairDepthCm / 100));
    const usableWidthCm = availableWidthForChairs > 0 ? availableWidthForChairs : 0;

    return {
        chairs: allChairs,
        totalChairs,
        totalRows,
        blocksInfo,
        usableAreaM2: (tentLengthCm / 100) * (usableWidthCm / 100) + wingAreaM2,
        totalAreaM2,
        utilizationPercent: totalAreaM2 > 0 ? (chairAreaM2 / totalAreaM2) * 100 : 0,
    };
}
