import type { DurationUnit, Gender } from "../domain/models";
export const rupiah = (n: number) =>
  `Rp${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n)}`;
export const genderLabel = (g: Gender) =>
  ({ MALE: "Putra", FEMALE: "Putri", MIXED: "Campur" })[g];
export const periodLabel = (unit: DurationUnit, value: number) =>
  `${value === 1 ? "" : `${value} `}${{ DAY: "hari", WEEK: "minggu", MONTH: "bulan", YEAR: "tahun" }[unit]}`;
export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
export const distanceLabel = (n: number | null) =>
  n === null
    ? "Pilih lokasi acuan"
    : `± ${n < 1 ? `${Math.round(n * 1000)} m` : `${n.toFixed(1)} km`} dari lokasi pilihanmu`;
