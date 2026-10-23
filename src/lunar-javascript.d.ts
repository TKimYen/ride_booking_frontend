declare module 'lunar-javascript' {
  interface Lunar {
    getDay(): number;
    /** Tháng âm; số âm là tháng nhuận. */
    getMonth(): number;
    getYear(): number;
  }
  interface SolarDate {
    getLunar(): Lunar;
  }
  export const Solar: {
    fromYmd(year: number, month: number, day: number): SolarDate;
  };
}
