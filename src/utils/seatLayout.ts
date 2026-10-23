import type { BusType, TripSeatResponse } from '../types';

/**
 * Dựng lưới sơ đồ ghế từ danh sách ghế backend trả về.
 *
 * Tên ghế theo BusType.layout() ở backend: xe 2 tầng có tiền tố tầng ("1A1", "2B2"),
 * xe 1 tầng không ("A1"). Dãy = chữ cái, cột = số cuối. Ghế "1FL" của Limousine là ghế đơn
 * cuối xe, đặt ở hàng riêng.
 */
export interface SeatCell {
  seat: TripSeatResponse | null;
  /** Lối đi giữa hai cột */
  aisle?: boolean;
}

export interface FloorGrid {
  floor: number;
  rows: SeatCell[][];
}

function parseName(name: string, twoFloors: boolean) {
  const base = twoFloors ? name.slice(1) : name;
  const match = base.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: base, col: 1 };
  return { row: match[1], col: Number(match[2]) };
}

/** Số cột (không tính lối đi) và vị trí lối đi của từng loại xe. */
const COLUMNS: Record<BusType, { cols: number; aisleAfter: number }> = {
  LIMOUSINE_29: { cols: 2, aisleAfter: 1 },
  CABIN_DOUBLE_22: { cols: 2, aisleAfter: 1 },
  SLEEPER_45: { cols: 3, aisleAfter: 2 },
};

export function buildSeatGrid(busType: BusType, seats: TripSeatResponse[]): FloorGrid[] {
  const twoFloors = busType !== 'SLEEPER_45';
  const { cols, aisleAfter } = COLUMNS[busType];
  const floors = [...new Set(seats.map((s) => s.floor))].sort();

  return floors.map((floor) => {
    const floorSeats = seats.filter((s) => s.floor === floor);
    const byRow = new Map<string, Map<number, TripSeatResponse>>();
    const singles: TripSeatResponse[] = [];
    for (const seat of floorSeats) {
      const { row, col } = parseName(seat.seatName, twoFloors);
      if (seat.seatType === 'SINGLE') {
        singles.push(seat);
        continue;
      }
      if (!byRow.has(row)) byRow.set(row, new Map());
      byRow.get(row)!.set(col, seat);
    }
    const rowKeys = [...byRow.keys()].sort((a, b) => a.length - b.length || a.localeCompare(b));
    const rows: SeatCell[][] = rowKeys.map((key) => {
      const cells: SeatCell[] = [];
      for (let c = 1; c <= cols; c++) {
        cells.push({ seat: byRow.get(key)!.get(c) ?? null });
        if (c === aisleAfter) cells.push({ seat: null, aisle: true });
      }
      return cells;
    });
    for (const single of singles) {
      rows.push([{ seat: single }]);
    }
    return { floor, rows };
  });
}

/** Tên ghế hiển thị gọn: bỏ tiền tố tầng khi đã chia tab tầng. */
export const seatLabel = (name: string, busType: BusType) =>
  busType === 'SLEEPER_45' ? name : name.slice(1);
