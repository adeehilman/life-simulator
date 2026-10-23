import { add, c, clamp, curve, hidden, karma, minStat, mul, stat } from '../engine/f.ts';
import type { CareerDef, Formula, MajorDef } from '../types/types.ts';

// Career ids are `${category}:${slug}` so conditions can match a category by prefix.

export const MAJORS: MajorDef[] = [
  { id: 'pendidikan', name: 'Pendidikan' },
  { id: 'keperawatan', name: 'Keperawatan' },
  { id: 'akuntansi', name: 'Akuntansi' },
  { id: 'informatika', name: 'Teknik Informatika' },
  { id: 'kedokteran', name: 'Kedokteran' },
  { id: 'hukum', name: 'Hukum' },
  { id: 'komunikasi', name: 'Ilmu Komunikasi' },
];

/** Hire chance driven by smarts with a karma nudge. */
const hireBy = (base: number, s: Formula = stat('smarts')): Formula =>
  karma(clamp(add(c(base), mul(curve(s), c(0.5)))), 0.2);
const performance: Formula = { op: 'jobPerformance' };
/** Promotion: performance + discipline. */
const promote = (base: number): Formula =>
  clamp(add(c(base), mul(curve(performance, 60), c(0.35)), mul(hidden('discipline'), c(0.002))));
/** Getting fired: rises steeply once performance drops below ~30, offset by discipline. */
const fire: Formula = clamp(add(c(-0.02), mul(curve(performance, 30, -0.15), c(0.4)), mul(hidden('discipline'), c(-0.001))), 0, 0.6);

const career = (d: Omit<CareerDef, 'countries' | 'requirements' | 'acceptedMajors' | 'hireChance' | 'promotionChance' | 'fireChance'>
  & Partial<CareerDef>): CareerDef => ({
  countries: [], requirements: [], acceptedMajors: [], hireChance: hireBy(0.35), promotionChance: promote(0.08), fireChance: fire, ...d,
});

export const CAREERS: CareerDef[] = [
  // ── Part-time ──
  career({ id: 'partTime:pelayan-kafe', category: 'partTime', title: 'Pelayan Kafe', field: 'Jasa', minEducation: null, minAge: 15,
    ladder: [{ rank: 0, title: 'Pelayan Kafe', salary: 9_000, minYearsBefore: 0 }], hireChance: hireBy(0.55, stat('looks')) }),
  career({ id: 'partTime:les-privat', category: 'partTime', title: 'Guru Les Privat', field: 'Pendidikan', minEducation: null, minAge: 16,
    requirements: [minStat('smarts', 60)], ladder: [{ rank: 0, title: 'Guru Les Privat', salary: 7_000, minYearsBefore: 0 }] }),
  career({ id: 'partTime:ojek-online', category: 'partTime', title: 'Pengemudi Ojek Online', field: 'Transportasi', minEducation: null, minAge: 17,
    requirements: [{ op: 'legalAge', milestone: 'driving' }],
    ladder: [{ rank: 0, title: 'Pengemudi Ojek Online', salary: 14_000, minYearsBefore: 0 }], hireChance: c(0.9) }),

  // ── Full-time ──
  career({ id: 'fullTime:kasir', category: 'fullTime', title: 'Kasir Minimarket', field: 'Ritel', minEducation: null, minAge: 18,
    ladder: [
      { rank: 0, title: 'Kasir', salary: 30_000, minYearsBefore: 0 },
      { rank: 1, title: 'Kepala Kasir', salary: 36_000, minYearsBefore: 2 },
      { rank: 2, title: 'Kepala Toko', salary: 48_000, minYearsBefore: 3 },
    ], hireChance: c(0.8) }),
  career({ id: 'fullTime:admin', category: 'fullTime', title: 'Staf Administrasi', field: 'Perkantoran', minEducation: 'high', minAge: 18,
    ladder: [
      { rank: 0, title: 'Staf Administrasi', salary: 40_000, minYearsBefore: 0 },
      { rank: 1, title: 'Staf Senior', salary: 50_000, minYearsBefore: 3 },
      { rank: 2, title: 'Supervisor', salary: 65_000, minYearsBefore: 3 },
      { rank: 3, title: 'Manajer Kantor', salary: 85_000, minYearsBefore: 4 },
    ] }),
  career({ id: 'fullTime:guru', category: 'fullTime', title: 'Guru', field: 'Pendidikan', minEducation: 'university', minAge: 21,
    acceptedMajors: ['pendidikan'],
    ladder: [
      { rank: 0, title: 'Guru Honorer', salary: 25_000, minYearsBefore: 0 },
      { rank: 1, title: 'Guru Tetap', salary: 50_000, minYearsBefore: 3 },
      { rank: 2, title: 'Wakil Kepala Sekolah', salary: 70_000, minYearsBefore: 5 },
      { rank: 3, title: 'Kepala Sekolah', salary: 90_000, minYearsBefore: 5 },
    ] }),
  career({ id: 'fullTime:perawat', category: 'fullTime', title: 'Perawat', field: 'Kesehatan', minEducation: 'university', minAge: 21,
    acceptedMajors: ['keperawatan'],
    ladder: [
      { rank: 0, title: 'Perawat', salary: 50_000, minYearsBefore: 0 },
      { rank: 1, title: 'Perawat Senior', salary: 65_000, minYearsBefore: 4 },
      { rank: 2, title: 'Kepala Perawat', salary: 85_000, minYearsBefore: 5 },
    ] }),
  career({ id: 'fullTime:akuntan', category: 'fullTime', title: 'Akuntan', field: 'Keuangan', minEducation: 'university', minAge: 21,
    acceptedMajors: ['akuntansi'],
    ladder: [
      { rank: 0, title: 'Akuntan Junior', salary: 60_000, minYearsBefore: 0 },
      { rank: 1, title: 'Akuntan', salary: 80_000, minYearsBefore: 2 },
      { rank: 2, title: 'Akuntan Senior', salary: 110_000, minYearsBefore: 3 },
      { rank: 3, title: 'Manajer Keuangan', salary: 160_000, minYearsBefore: 4 },
      { rank: 4, title: 'Direktur Keuangan', salary: 260_000, minYearsBefore: 5 },
    ] }),
  career({ id: 'fullTime:programmer', category: 'fullTime', title: 'Programmer', field: 'Teknologi', minEducation: 'university', minAge: 21,
    acceptedMajors: ['informatika'], requirements: [minStat('smarts', 55)],
    ladder: [
      { rank: 0, title: 'Programmer Junior', salary: 80_000, minYearsBefore: 0 },
      { rank: 1, title: 'Programmer', salary: 120_000, minYearsBefore: 2 },
      { rank: 2, title: 'Programmer Senior', salary: 170_000, minYearsBefore: 3 },
      { rank: 3, title: 'Lead Engineer', salary: 230_000, minYearsBefore: 3 },
      { rank: 4, title: 'CTO', salary: 380_000, minYearsBefore: 5 },
    ] }),
  career({ id: 'fullTime:pengacara', category: 'fullTime', title: 'Pengacara', field: 'Hukum', minEducation: 'graduate', minAge: 24,
    acceptedMajors: ['hukum'], requirements: [minStat('smarts', 60)],
    ladder: [
      { rank: 0, title: 'Advokat Magang', salary: 60_000, minYearsBefore: 0 },
      { rank: 1, title: 'Advokat', salary: 120_000, minYearsBefore: 2 },
      { rank: 2, title: 'Advokat Senior', salary: 200_000, minYearsBefore: 4 },
      { rank: 3, title: 'Partner Firma', salary: 400_000, minYearsBefore: 6 },
    ] }),
  career({ id: 'fullTime:dokter', category: 'fullTime', title: 'Dokter', field: 'Kesehatan', minEducation: 'graduate', minAge: 24,
    acceptedMajors: ['kedokteran'], requirements: [minStat('smarts', 70)],
    ladder: [
      { rank: 0, title: 'Dokter Internsip', salary: 50_000, minYearsBefore: 0 },
      { rank: 1, title: 'Dokter Umum', salary: 130_000, minYearsBefore: 1 },
      { rank: 2, title: 'Dokter Spesialis', salary: 300_000, minYearsBefore: 5 },
      { rank: 3, title: 'Kepala Rumah Sakit', salary: 450_000, minYearsBefore: 8 },
    ] }),

  // ── Military ──
  career({ id: 'military:tentara', category: 'military', title: 'Tentara', field: 'Militer', minEducation: 'high', minAge: 18,
    requirements: [minStat('health', 60)], hireChance: karma(clamp(add(c(0.3), mul(curve(stat('health')), c(0.6)))), 0.1),
    ladder: [
      { rank: 0, title: 'Prajurit', salary: 35_000, minYearsBefore: 0 },
      { rank: 1, title: 'Kopral', salary: 42_000, minYearsBefore: 2 },
      { rank: 2, title: 'Sersan', salary: 52_000, minYearsBefore: 3 },
      { rank: 3, title: 'Letnan', salary: 68_000, minYearsBefore: 4 },
      { rank: 4, title: 'Kapten', salary: 90_000, minYearsBefore: 4 },
      { rank: 5, title: 'Mayor', salary: 120_000, minYearsBefore: 5 },
      { rank: 6, title: 'Kolonel', salary: 160_000, minYearsBefore: 6 },
    ] }),
];

export const careerById = (id: string): CareerDef | undefined => CAREERS.find((x) => x.id === id);

/** Annual university/graduate tuition, international dollars. */
export const TUITION = { university: 6_000, graduate: 10_000 } as const;
