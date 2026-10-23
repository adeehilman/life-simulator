import { diseaseById } from '../content/catalog.ts';
import type { Id, PersonEntity } from '../types/types.ts';
import { convertCurrency, estateTax, formatMoney } from './localization.ts';
import {
  account, activeEducation, activeJob, addLog, countryOf, fullName, ownedAssets, player, related, type World,
} from './world.ts';
import { COUNTRIES } from '../data/countries/index.ts';

export function causeLabel(causeId: Id): string {
  if (causeId === 'old_age') return 'usia tua';
  if (causeId === 'health_zero') return 'kondisi kesehatan yang terus memburuk';
  if (causeId === 'accident') return 'kecelakaan';
  if (causeId === 'violence') return 'luka akibat kekerasan';
  return diseaseById(causeId)?.name.toLowerCase() ?? causeId;
}

/** Marks a person dead and closes their open records. Relationship edges stay (family tree). */
export function die(w: World, personId: Id, causeId: Id): void {
  const p = w.persons[personId];
  if (!p || p.status !== 'alive') return;
  p.status = 'dead';
  p.death = { year: w.save.year, age: p.age, causeId };
  const job = activeJob(w, personId);
  if (job) { job.endedYear = w.save.year; job.endReason = 'died'; }
  const edu = activeEducation(w, personId);
  if (edu) { edu.status = 'dropped'; edu.endedYear = w.save.year; }
  if (personId === w.save.currentPlayerId) {
    addLog(w, `Aku meninggal di usia ${p.age} karena ${causeLabel(causeId)}.`, 'death');
  }
}

/** Heirs: will beneficiaries that are alive, otherwise living children, otherwise living spouse. */
export function heirsOf(w: World, deceased: PersonEntity): PersonEntity[] {
  const alive = (id: Id) => (w.persons[id]?.status === 'alive' ? w.persons[id] : undefined);
  const fromWill = (deceased.will?.beneficiaryIds ?? []).map(alive).filter((p): p is PersonEntity => !!p);
  if (fromWill.length) return fromWill;
  const kids = related(w, deceased.id, ['child']).map((r) => r.person);
  if (kids.length) return kids;
  return related(w, deceased.id, ['spouse']).map((r) => r.person);
}

/** Pays estate tax and splits cash + assets among heirs. Returns a summary line for the log. */
export function settleEstate(w: World, deceased: PersonEntity): string {
  const heirs = heirsOf(w, deceased);
  const country = countryOf(deceased);
  const acc = account(w, deceased.id);
  const assets = ownedAssets(w, deceased.id);
  const gross = acc.balance + assets.reduce((s, a) => s + a.value - (a.loan?.remaining ?? 0), 0);
  if (heirs.length === 0) return 'Tidak ada ahli waris; seluruh harta diambil negara.';

  const tax = gross > 0 ? estateTax(gross, country) : 0;
  const cashToSplit = acc.balance - tax;
  acc.balance = 0;
  const share = Math.round(cashToSplit / heirs.length);
  for (const h of heirs) {
    account(w, h.id).balance += convertCurrency(share, country, COUNTRIES[h.countryCode] ?? country);
  }
  // Assets go to the first heir (keeps loans attached).
  for (const a of assets) a.ownerId = heirs[0]!.id;
  const taxText = tax > 0 ? ` Pajak warisan ${formatMoney(tax, country)}.` : '';
  return `Harta ${formatMoney(Math.max(0, gross), country)} dibagi ke ${heirs.map((h) => h.firstName).join(', ')}.${taxText}`;
}

/** Continue the lineage as one of the deceased player's living children. */
export function continueAsChild(w: World, childId: Id): void {
  const old = player(w);
  const summary = settleEstate(w, old);
  const child = w.persons[childId]!;
  w.save.currentPlayerId = child.id;
  w.save.lineage.push(child.id);
  delete w.save.pendingEvent;
  addLog(w, `Orang tuaku, ${fullName(old)}, telah tiada. ${summary}`, 'neutral');
  addLog(w, `Aku, ${fullName(child)}, melanjutkan hidup di usia ${child.age}.`, 'neutral');
}

export const livingChildren = (w: World, personId: Id): PersonEntity[] =>
  related(w, personId, ['child']).map((r) => r.person);
