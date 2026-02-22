import { TentConfig, ChairPosition, LayoutResult, BlockInfo, ExclusionZone, FurnitureItem } from './types';

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
 * Calculate the full seat layout for a tent.
 * Chairs fill the entire tent area; the altar acts as an exclusion object.
 */
export function calculateLayout(tent: TentConfig): LayoutResult {
    const tentWidthCm = tent.widthM * 100;
    const tentLengthCm = tent.lengthM * 100;

    const totalAreaM2 = tent.widthM * tent.lengthM;

    // Seating fills the full tent height
    const seatingStartY = 0;
    const seatingHeight = tentLengthCm;

    // Calculate rows
    const cellDepth = tent.chairDepthCm + tent.frontGapCm;
    const totalRows = Math.floor(seatingHeight / cellDepth);

    // Calculate blocks from aisles
    const aisleCount = Math.max(0, tent.aisleCount);
    const totalAisleWidth = aisleCount * tent.aisleWidthCm;
    const sideAisleWidth = (tent.leftAisleCm || 0) + (tent.rightAisleCm || 0);
    const availableWidthForChairs = tentWidthCm - totalAisleWidth - sideAisleWidth;
    const seatingStartX = tent.leftAisleCm || 0;

    if (availableWidthForChairs <= 0) {
        return {
            chairs: [],
            totalChairs: 0,
            totalRows,
            blocksInfo: [],
            usableAreaM2: 0,
            totalAreaM2,
            utilizationPercent: 0,
        };
    }

    const numBlocks = aisleCount + 1;
    const blockWidth = availableWidthForChairs / numBlocks;

    // Calculate columns per block
    const cellWidth = tent.chairWidthCm + tent.sideGapCm;
    const colsPerBlock = Math.floor(blockWidth / cellWidth);

    // Build block info and chair positions
    const blocksInfo: BlockInfo[] = [];
    const chairs: ChairPosition[] = [];

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
                const cy = seatingStartY + r * cellDepth;
                const excluded = isExcluded(
                    cx,
                    cy,
                    tent.chairWidthCm,
                    tent.chairDepthCm,
                    tent.exclusionZones,
                    tent.altar,
                    tent.furniture
                );

                chairs.push({
                    row: r,
                    col: c,
                    block: b,
                    xCm: cx,
                    yCm: cy,
                    excluded,
                });
            }
        }
    }

    const totalChairs = chairs.filter((ch) => !ch.excluded).length;
    const chairAreaM2 =
        totalChairs * ((tent.chairWidthCm / 100) * (tent.chairDepthCm / 100));

    return {
        chairs,
        totalChairs,
        totalRows,
        blocksInfo,
        usableAreaM2: (seatingHeight / 100) * (availableWidthForChairs / 100),
        totalAreaM2,
        utilizationPercent:
            totalAreaM2 > 0 ? (chairAreaM2 / totalAreaM2) * 100 : 0,
    };
}
