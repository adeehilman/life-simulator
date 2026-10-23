import type { AssetDef, DiseaseDef } from '../types/types.ts';

export const ASSET_DEFS: AssetDef[] = [
  // Vehicles
  { id: 'motor-bebek', kind: 'car', name: 'Motor Bebek Bekas', basePrice: 2_000, annualAppreciation: -0.12, upkeepRate: 0.04, countries: [] },
  { id: 'mobil-irit', kind: 'car', name: 'Mobil Irit Mungil', basePrice: 30_000, annualAppreciation: -0.1, upkeepRate: 0.03, countries: [] },
  { id: 'mpv-keluarga', kind: 'car', name: 'MPV Keluarga Sejuta Umat', basePrice: 50_000, annualAppreciation: -0.09, upkeepRate: 0.03, countries: [] },
  { id: 'suv-gagah', kind: 'car', name: 'SUV Gagah untuk Jalan Mulus', basePrice: 100_000, annualAppreciation: -0.1, upkeepRate: 0.03, countries: [] },
  { id: 'sedan-mewah', kind: 'car', name: 'Sedan Mewah Pejabat', basePrice: 300_000, annualAppreciation: -0.12, upkeepRate: 0.02, countries: [] },
  // Houses
  { id: 'rumah-subsidi', kind: 'house', name: 'Rumah Subsidi Ujung Kota', basePrice: 40_000, annualAppreciation: 0.03, upkeepRate: 0.01, countries: [] },
  { id: 'apartemen-studio', kind: 'house', name: 'Apartemen Studio (Muat Satu Kasur)', basePrice: 60_000, annualAppreciation: 0.02, upkeepRate: 0.015, countries: [] },
  { id: 'rumah-tipe-45', kind: 'house', name: 'Rumah Tipe 45 di Perumahan', basePrice: 100_000, annualAppreciation: 0.04, upkeepRate: 0.01, countries: [] },
  { id: 'rumah-cluster', kind: 'house', name: 'Rumah Cluster Berpagar Satpam', basePrice: 250_000, annualAppreciation: 0.05, upkeepRate: 0.01, countries: [] },
  { id: 'rumah-mewah', kind: 'house', name: 'Rumah Mewah dengan Kolam Renang', basePrice: 1_000_000, annualAppreciation: 0.05, upkeepRate: 0.012, countries: [] },
];

export const assetDefById = (id: string): AssetDef | undefined => ASSET_DEFS.find((a) => a.id === id);

export const DISEASES: DiseaseDef[] = [
  { id: 'flu', name: 'Flu Berat', annualHealthLoss: 4, curable: true, treatmentCost: 50, baseChance: 0.05, naturalRecovery: 0.75, minAge: 0 },
  { id: 'tipes', name: 'Tifus', annualHealthLoss: 10, curable: true, treatmentCost: 300, baseChance: 0.015, naturalRecovery: 0.3, minAge: 3 },
  { id: 'dbd', name: 'Demam Berdarah', annualHealthLoss: 15, curable: true, treatmentCost: 400, baseChance: 0.012, naturalRecovery: 0.4, minAge: 0 },
  { id: 'maag', name: 'Maag Kronis', annualHealthLoss: 3, curable: true, treatmentCost: 150, baseChance: 0.02, naturalRecovery: 0.2, minAge: 12 },
  { id: 'hipertensi', name: 'Hipertensi', annualHealthLoss: 6, curable: false, treatmentCost: 500, baseChance: 0.02, naturalRecovery: 0, minAge: 35 },
  { id: 'diabetes', name: 'Diabetes', annualHealthLoss: 8, curable: false, treatmentCost: 1_200, baseChance: 0.012, naturalRecovery: 0, minAge: 30 },
  { id: 'jantung', name: 'Penyakit Jantung', annualHealthLoss: 15, curable: false, treatmentCost: 8_000, baseChance: 0.008, naturalRecovery: 0, minAge: 40 },
  { id: 'kanker', name: 'Kanker', annualHealthLoss: 22, curable: true, treatmentCost: 25_000, baseChance: 0.004, naturalRecovery: 0.02, minAge: 30 },
];

export const diseaseById = (id: string): DiseaseDef | undefined => DISEASES.find((d) => d.id === id);
