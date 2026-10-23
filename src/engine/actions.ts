import { ASSET_DEFS, assetDefById, diseaseById } from '../content/catalog.ts';
import { careerById, MAJORS, TUITION } from '../content/careers.ts';
import { ACTIVE_COUNTRY_CODES } from '../data/countries/index.ts';
import type { Asset, CareerDef, Id, LogTone, NpcAction, Sex } from '../types/types.ts';
import { enroll, stageOf } from './education.ts';
import { checkAll, evalFormula } from './formula.ts';
import { formatMoney, localizePrice, localizeSalary } from './localization.ts';
import { createChild, createPerson, effectiveFertility } from './people.ts';
import { chance, randInt, type Rng } from './rng.ts';
import {
  account, activeEducation, activeJob, addLog, clampStat, countryOf, edgeBetween, educationLevel, hasGraduated, link,
  oncePerYear, player, related, unlink, uid, STAGE_ORDER, type World,
} from './world.ts';

export interface ActionResult {
  text: string;
  tone: LogTone;
}

/** Logs the action's result and returns it for the result popup. */
const done = (w: World, text: string, tone: LogTone): ActionResult => {
  addLog(w, text, tone);
  return { text, tone };
};
const refuse = (text: string): ActionResult => ({ text, tone: 'neutral' });

function guard(w: World): ActionResult | null {
  const p = player(w);
  if (p.status !== 'alive') return refuse('Orang yang sudah meninggal tidak bisa melakukan apa-apa.');
  if (w.save.pendingEvent) return refuse('Selesaikan dulu kejadian yang sedang menunggu jawabanmu.');
  return null;
}

/** Pays `amount` (minor units) from the player; returns false if it would exceed what they can owe. */
function pay(w: World, amount: number): boolean {
  const acc = account(w, player(w).id);
  if (acc.balance < amount) return false;
  acc.balance -= amount;
  return true;
}

// ───────────────────────────── School ─────────────────────────────

export function canEnroll(w: World, stage: 'university' | 'graduate'): string | null {
  const p = player(w);
  if (activeEducation(w, p.id)) return 'Kamu masih terdaftar di sekolah lain.';
  const prev = stage === 'university' ? 'high' : 'university';
  if (!hasGraduated(w, p.id, prev)) return stage === 'university' ? 'Harus lulus SMA dulu.' : 'Harus lulus S1 dulu.';
  if (p.age < stageOf(p, stage).entryAge - 1) return 'Kamu belum cukup umur.';
  return null;
}

export function enrollHigherEd(w: World, rng: Rng, stage: 'university' | 'graduate', majorId: Id): ActionResult {
  const blocked = guard(w) ?? (canEnroll(w, stage) ? refuse(canEnroll(w, stage)!) : null);
  if (blocked) return blocked;
  const p = player(w);
  const country = countryOf(p);
  if (stage === 'graduate') {
    const s1 = Object.values(w.educations).find((e) => e.personId === p.id && e.stage === 'university' && e.status === 'graduated');
    if (s1?.majorId && s1.majorId !== majorId) return refuse('Program pascasarjana harus sejalur dengan jurusan S1-mu.');
  }
  const cost = localizePrice(TUITION[stage] * stageOf(p, stage).durationYears, country);
  const major = MAJORS.find((m) => m.id === majorId)?.name ?? majorId;
  const parent = related(w, p.id, ['parent'])
    .find(({ person }) => person.personality.generosity > 50 && account(w, person.id).balance >= cost);
  let payer: string;
  if (parent && chance(rng, parent.person.personality.generosity / 100)) {
    account(w, parent.person.id).balance -= cost;
    payer = `${parent.person.firstName} membayar seluruh biaya kuliah (${formatMoney(cost, country)}).`;
  } else {
    account(w, p.id).balance -= cost;
    payer = `Biaya kuliah ${formatMoney(cost, country)} kutanggung sendiri${account(w, p.id).balance < 0 ? ' — alias utang' : ''}.`;
  }
  enroll(w, rng, p, stage, majorId);
  return done(w, `Aku diterima di jurusan ${major}. ${payer}`, 'positive');
}

export function studyHarder(w: World, rng: Rng): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const edu = activeEducation(w, p.id);
  if (!edu) return refuse('Kamu tidak sedang sekolah.');
  if (!oncePerYear(p.flags, 'act:study', w.save.year)) return refuse('Kamu sudah belajar keras tahun ini. Otak juga butuh libur.');
  const gain = randInt(rng, 3, 8) + Math.round(p.hidden.discipline / 25);
  edu.grades = clampStat(edu.grades + gain);
  p.stats.smarts = clampStat(p.stats.smarts + randInt(rng, 1, 3));
  p.stats.happiness = clampStat(p.stats.happiness - 2);
  return done(w, `Aku belajar lebih keras. Nilai naik ${gain} poin, waktu main berkurang drastis.`, 'positive');
}

export function dropOut(w: World): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const edu = activeEducation(w, p.id);
  if (!edu) return refuse('Kamu tidak sedang sekolah.');
  if (p.age <= countryOf(p).legal.compulsoryEducationUntilAge) return refuse('Kamu masih wajib belajar. Orang tuamu juga tidak setuju.');
  edu.status = 'dropped';
  edu.endedYear = w.save.year;
  return done(w, `Aku berhenti dari ${edu.institution}. Katanya banyak orang sukses yang putus sekolah. Katanya.`, 'negative');
}

// ───────────────────────────── Jobs ─────────────────────────────

export function jobBlocker(w: World, def: CareerDef): string | null {
  const p = player(w);
  if (p.age < def.minAge) return `Minimal umur ${def.minAge}.`;
  if (def.countries.length && !def.countries.includes(p.countryCode)) return 'Tidak tersedia di negaramu.';
  if (def.minEducation) {
    const needed = STAGE_ORDER.indexOf(def.minEducation);
    const higher = def.minEducation === 'university' || def.minEducation === 'graduate';
    const ok = higher && def.acceptedMajors.length
      ? hasGraduated(w, p.id, def.minEducation, def.acceptedMajors)
      : educationLevel(w, p.id) >= needed;
    if (!ok) {
      const majors = def.acceptedMajors.map((id) => MAJORS.find((m) => m.id === id)?.name).filter(Boolean).join('/');
      return `Butuh lulusan ${stageOf(p, def.minEducation).localName}${majors ? ` ${majors}` : ''}.`;
    }
  }
  if (!checkAll(def.requirements, { w, roles: {} })) return 'Kamu belum memenuhi syarat.';
  const job = activeJob(w, p.id);
  if (job?.careerId === def.id) return 'Ini pekerjaanmu sekarang.';
  if (job && careerById(job.careerId)?.category !== 'partTime' && def.category !== 'partTime') return 'Keluar dulu dari pekerjaanmu sekarang.';
  if (job && def.category === 'partTime') return 'Kamu sudah punya pekerjaan.';
  return null;
}

export function applyJob(w: World, rng: Rng, careerId: Id): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const def = careerById(careerId);
  if (!def) return refuse('Lowongan tidak ditemukan.');
  const reason = jobBlocker(w, def);
  if (reason) return refuse(reason);
  const p = player(w);
  if (!oncePerYear(p.flags, `apply:${careerId}`, w.save.year)) return refuse('Kamu sudah melamar ke sini tahun ini. HRD-nya masih ingat wajahmu.');
  if (!chance(rng, evalFormula(def.hireChance, { w, roles: {} }))) {
    return done(w, `Lamaranku sebagai ${def.title} ditolak. Alasannya: "kurang pengalaman", untuk posisi tanpa pengalaman.`, 'negative');
  }
  const country = countryOf(p);
  const first = def.ladder[0]!;
  const id = uid();
  w.employments[id] = {
    id, saveId: w.save.id, personId: p.id, careerId: def.id, rank: 0, salary: localizeSalary(first.salary, country),
    currency: country.currency.code, countryCode: country.code, performance: 60, yearsInRank: 0, startedYear: w.save.year,
  };
  p.stats.happiness = clampStat(p.stats.happiness + 8);
  return done(w, `Aku diterima bekerja sebagai ${first.title} dengan gaji ${formatMoney(localizeSalary(first.salary, country), country)} per tahun.`, 'positive');
}

export function workHarder(w: World, rng: Rng): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const job = activeJob(w, p.id);
  if (!job) return refuse('Kamu tidak punya pekerjaan.');
  if (!oncePerYear(p.flags, 'act:work', w.save.year)) return refuse('Kamu sudah lembur tahun ini. Kantor bukan rumah kedua, katanya.');
  const gain = randInt(rng, 4, 10) + Math.round(p.hidden.discipline / 20);
  job.performance = clampStat(job.performance + gain);
  p.stats.happiness = clampStat(p.stats.happiness - 3);
  p.stats.health = clampStat(p.stats.health - 1);
  return done(w, 'Aku bekerja lebih keras tahun ini. Bos mulai mengingat namaku dengan benar.', 'positive');
}

export function quitJob(w: World): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const job = activeJob(w, p.id);
  if (!job) return refuse('Kamu tidak punya pekerjaan.');
  const title = careerById(job.careerId)?.ladder[job.rank]?.title ?? 'pekerjaanku';
  const retiring = p.age >= countryOf(p).legal.retirementAge && careerById(job.careerId)?.category !== 'partTime';
  job.endedYear = w.save.year;
  job.endReason = retiring ? 'retired' : 'quit';
  if (retiring) {
    p.flags.pension = Math.round(job.salary * 0.4);
    return done(w, `Aku pensiun dari jabatan ${title}. Uang pensiun ${formatMoney(p.flags.pension, countryOf(p))} per tahun.`, 'positive');
  }
  return done(w, `Aku mengundurkan diri sebagai ${title}. Surat resign-ku penuh kata "terima kasih atas kesempatannya".`, 'neutral');
}

// ───────────────────────────── Assets ─────────────────────────────

export const shopItems = (kind: 'car' | 'house') => ASSET_DEFS.filter((d) => d.kind === kind);

const annuity = (principal: number, rate: number, years: number) =>
  Math.round((principal * rate) / (1 - (1 + rate) ** -years));

export function buyAsset(w: World, defId: Id, financing: 'cash' | 'loan'): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  if (p.age < 18) return refuse('Kamu harus berumur 18 tahun untuk membeli aset atas nama sendiri.');
  const def = assetDefById(defId);
  if (!def) return refuse('Barang tidak ditemukan.');
  const country = countryOf(p);
  const price = localizePrice(def.basePrice, country);
  const isHouse = def.kind === 'house';
  const down = financing === 'cash' ? price : Math.round(price * (isHouse ? 0.2 : 0.3));
  if (financing === 'loan' && !activeJob(w, p.id)) return refuse('Bank menolak: kamu tidak punya penghasilan tetap.');
  if (!pay(w, down)) return refuse(`Uangmu tidak cukup. Butuh ${formatMoney(down, country)}.`);
  const asset: Asset = {
    id: uid(), saveId: w.save.id, ownerId: p.id, defId: def.id, kind: def.kind, name: def.name, countryCode: country.code,
    currency: country.currency.code, purchasePrice: price, value: price, condition: 100, purchasedYear: w.save.year,
  };
  if (financing === 'loan') {
    const rate = isHouse ? country.economy.mortgageRate : country.economy.carLoanRate;
    const years = isHouse ? 20 : 5;
    const principal = price - down;
    asset.loan = { principal, remaining: principal, annualRate: rate, termYears: years, yearsLeft: years, annualPayment: annuity(principal, rate, years) };
  }
  w.assets[asset.id] = asset;
  p.stats.happiness = clampStat(p.stats.happiness + 6);
  const how = financing === 'cash'
    ? `tunai ${formatMoney(price, country)}`
    : `DP ${formatMoney(down, country)}, cicilan ${formatMoney(asset.loan!.annualPayment, country)}/tahun selama ${asset.loan!.termYears} tahun`;
  return done(w, `Aku membeli ${def.name} (${how}).`, 'positive');
}

export function sellAsset(w: World, assetId: Id): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const a = w.assets[assetId];
  const p = player(w);
  if (!a || a.ownerId !== p.id) return refuse('Aset tidak ditemukan.');
  const country = countryOf(p);
  const net = a.value - (a.loan?.remaining ?? 0);
  account(w, p.id).balance += net;
  delete w.assets[assetId];
  return done(w, `Aku menjual ${a.name}. Setelah melunasi sisa utang, aku menerima ${formatMoney(net, country)}.`, net >= 0 ? 'neutral' : 'negative');
}

export function toggleRent(w: World, assetId: Id): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const a = w.assets[assetId];
  if (!a || a.kind !== 'house') return refuse('Hanya rumah yang bisa disewakan.');
  const country = countryOf(player(w));
  if (a.rental) {
    delete a.rental;
    return done(w, `Aku berhenti menyewakan ${a.name}. Penyewa pergi sambil membawa gantungan kunci kesayanganku.`, 'neutral');
  }
  a.rental = { annualRent: Math.round(a.value * 0.05) };
  return done(w, `Aku menyewakan ${a.name} seharga ${formatMoney(a.rental.annualRent, country)} per tahun.`, 'positive');
}

// ───────────────────────────── Relationships ─────────────────────────────

export const ACTION_LABEL: Record<NpcAction, string> = {
  conversation: 'Ngobrol', compliment: 'Puji', insult: 'Hina', spendTime: 'Habiskan waktu bersama', giveMoney: 'Beri uang', askForMoney: 'Minta uang',
};

export function interact(w: World, rng: Rng, npcId: Id, action: NpcAction, giftIntl = 0): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const npc = w.persons[npcId];
  const edge = edgeBetween(w, p.id, npcId);
  const back = edgeBetween(w, npcId, p.id);
  if (!npc || !edge || npc.status !== 'alive') return refuse('Orang ini tidak bisa dihubungi.');
  if (p.age < 4) return refuse('Kamu masih terlalu kecil. Satu-satunya bahasamu adalah tangisan.');
  if (!oncePerYear(edge.flags, `act:${action}${giftIntl}`, w.save.year)) return refuse(`Kamu sudah melakukannya dengan ${npc.firstName} tahun ini.`);
  const country = countryOf(p);
  const bump = (d: number) => {
    edge.bar = clampStat(edge.bar + d);
    if (back) back.bar = edge.bar;
  };
  const n = npc.firstName;
  switch (action) {
    case 'conversation':
      if (npc.personality.petulance > 70 && chance(rng, 0.4)) {
        bump(-5);
        return done(w, `Aku mengajak ${n} ngobrol, tapi dia malah menceramahiku soal hal yang tidak kutanyakan.`, 'negative');
      }
      bump(randInt(rng, 3, 8));
      return done(w, `Aku ngobrol dengan ${n} tentang cuaca, harga cabai, dan masa depan. Hangat.`, 'positive');
    case 'compliment':
      bump(randInt(rng, 5, 10));
      return done(w, `Aku memuji ${n}. Dia pura-pura tidak senang, tapi senyumnya ketahuan.`, 'positive');
    case 'insult':
      bump(-randInt(rng, 10, 25));
      p.hidden.karma = clampStat(p.hidden.karma - 3);
      if (npc.personality.craziness > 70 && chance(rng, 0.35)) {
        p.stats.health = clampStat(p.stats.health - randInt(rng, 5, 15));
        return done(w, `Aku menghina ${n}. Dia membalas dengan lemparan sandal yang sangat akurat.`, 'negative');
      }
      return done(w, `Aku menghina ${n}. Suasana langsung sedingin kulkas dua pintu.`, 'negative');
    case 'spendTime':
      bump(randInt(rng, 8, 15));
      p.stats.happiness = clampStat(p.stats.happiness + 3);
      return done(w, `Aku menghabiskan waktu bersama ${n}. Kami tertawa sampai lupa cek ponsel.`, 'positive');
    case 'giveMoney': {
      if (p.age < 6) return refuse('Uang jajanmu bahkan belum ada.');
      const amount = localizePrice(giftIntl, country);
      if (!pay(w, amount)) return refuse('Uangmu tidak cukup.');
      account(w, npcId).balance += amount;
      bump(Math.min(20, 3 + Math.round(giftIntl / 100)));
      return done(w, `Aku memberi ${n} ${formatMoney(amount, country)}. Dia langsung bertanya apakah aku sedang sakit.`, 'positive');
    }
    case 'askForMoney': {
      const willing = (npc.personality.generosity / 100) * (edge.bar / 100) * (edge.type === 'parent' ? 1.4 : 0.7);
      const pot = account(w, npcId).balance;
      if (pot <= 0 || !chance(rng, willing)) {
        bump(-4);
        return done(w, `Aku minta uang ke ${n}. Jawabannya: "Memangnya aku bank?"`, 'negative');
      }
      const amount = Math.min(Math.round(pot * 0.1), localizePrice(randInt(rng, 20, 1_000), country));
      account(w, npcId).balance -= amount;
      account(w, p.id).balance += amount;
      bump(-1);
      return done(w, `${n} memberiku ${formatMoney(amount, country)} sambil berpesan "jangan dihabiskan". Akan kuhabiskan.`, 'positive');
    }
  }
}

export function propose(w: World, rng: Rng, npcId: Id, prenup: boolean): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const npc = w.persons[npcId]!;
  const edge = edgeBetween(w, p.id, npcId);
  if (!edge || edge.type !== 'partner') return refuse('Kamu hanya bisa melamar pacarmu.');
  const law = countryOf(p).legal.marriage;
  if (p.age < law.minimumAge || npc.age < law.minimumAge) return refuse(`Usia minimal menikah adalah ${law.minimumAge} tahun.`);
  if (p.sex === npc.sex && !law.sameSexAllowed) return refuse('Pernikahan sesama jenis tidak diakui hukum di negara ini.');
  if (p.age < law.withoutParentalConsentAge) {
    const parents = related(w, p.id, ['parent']);
    if (parents.some(({ edge: e }) => e.bar < 50)) return refuse('Orang tuamu belum memberi restu. Butuh izin mereka sebelum umur ' + law.withoutParentalConsentAge + '.');
  }
  if (!oncePerYear(edge.flags, 'act:propose', w.save.year)) return refuse(`Kamu sudah melamar ${npc.firstName} tahun ini.`);
  let accept = edge.bar / 100 * 0.9 + (p.hidden.karma - 50) / 500;
  if (prenup && npc.personality.craziness > 60) accept -= 0.3;
  if (!chance(rng, accept)) {
    edge.bar = clampStat(edge.bar - 15);
    return done(w, `Aku melamar ${npc.firstName}${prenup ? ' dengan perjanjian pranikah' : ''}, tapi ditolak di depan pelayan restoran yang ikut canggung.`, 'negative');
  }
  unlink(w, p.id, npcId);
  link(w, p.id, npcId, 'spouse', 'spouse', Math.max(edge.bar, 70));
  const spouseEdges = [edgeBetween(w, p.id, npcId), edgeBetween(w, npcId, p.id)];
  for (const e of spouseEdges) if (e) e.marriage = { year: w.save.year, prenup };
  p.flags.married = true;
  p.stats.happiness = clampStat(p.stats.happiness + 15);
  return done(w, `${npc.firstName} menerima lamaranku! Kami menikah${prenup ? ' dengan perjanjian pranikah' : ''}. Tamu undangan kebanyakan datang demi prasmanan.`, 'positive');
}

export function breakUp(w: World, rng: Rng, npcId: Id): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const npc = w.persons[npcId]!;
  const edge = edgeBetween(w, p.id, npcId);
  if (!edge || (edge.type !== 'partner' && edge.type !== 'spouse')) return refuse('Tidak ada hubungan yang bisa diakhiri.');
  const divorce = edge.type === 'spouse';
  const country = countryOf(p);
  let extra = '';
  if (divorce) {
    delete p.flags.married;
    const acc = account(w, p.id);
    if (!edge.marriage?.prenup && acc.balance > 0) {
      const half = Math.round(acc.balance / 2);
      acc.balance -= half;
      account(w, npcId).balance += half;
      extra = ` Pengadilan memberikan ${formatMoney(half, country)} kepadanya.`;
    }
  }
  unlink(w, p.id, npcId, divorce ? 'exSpouse' : 'exPartner');
  p.stats.happiness = clampStat(p.stats.happiness - 10);
  if (npc.personality.craziness > 75 && chance(rng, 0.3)) {
    p.stats.health = clampStat(p.stats.health - randInt(rng, 5, 15));
    extra += ' Dia mengamuk dan melempar vas bunga ke arahku.';
  }
  return done(w, `${divorce ? 'Aku bercerai dengan' : 'Aku putus dengan'} ${npc.firstName}.${extra}`, 'negative');
}

export function tryForBaby(w: World, rng: Rng, npcId: Id): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const npc = w.persons[npcId]!;
  const edge = edgeBetween(w, p.id, npcId);
  if (!edge || (edge.type !== 'partner' && edge.type !== 'spouse')) return refuse('Hanya dengan pasanganmu.');
  if (p.age < 18 || npc.age < 18) return refuse('Kalian berdua harus dewasa dulu.');
  if (p.sex === npc.sex) return refuse('Kalian perlu jalur adopsi, yang belum tersedia di versi ini.');
  if (!oncePerYear(p.flags, 'act:baby', w.save.year)) return refuse('Kalian sudah mencoba tahun ini.');
  const odds = effectiveFertility(p) * effectiveFertility(npc) * 0.9;
  if (!chance(rng, odds)) return done(w, `Aku dan ${npc.firstName} mencoba punya anak, tapi belum berhasil tahun ini.`, 'neutral');
  const baby = createChild(w, rng, p, npc);
  p.stats.happiness = clampStat(p.stats.happiness + 15);
  return done(w, `Aku dan ${npc.firstName} dikaruniai seorang ${baby.sex === 'male' ? 'putra' : 'putri'} bernama ${baby.firstName}!`, 'positive');
}

// ───────────────────────────── Activities ─────────────────────────────

export function visitDoctor(w: World, rng: Rng): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const country = countryOf(p);
  const share = country.healthcare.patientCostShare;
  if (p.conditions.length === 0) {
    const fee = Math.round(localizePrice(30, country) * share);
    account(w, p.id).balance -= fee;
    return done(w, `Dokter bilang aku sehat walafiat. Biaya konsultasi ${formatMoney(fee, country)} untuk kabar baik itu.`, 'neutral');
  }
  const lines: string[] = [];
  for (const cond of [...p.conditions]) {
    const def = diseaseById(cond.diseaseId);
    if (!def) continue;
    const bill = Math.round(localizePrice(def.treatmentCost, country) * share);
    const payer = p.age < 18 ? related(w, p.id, ['parent'])[0]?.person : undefined;
    account(w, payer?.id ?? p.id).balance -= bill;
    const billText = bill > 0 ? ` (${formatMoney(bill, country)}${payer ? `, dibayar ${payer.firstName}` : ''})` : '';
    if (chance(rng, Math.min(0.95, 0.7 + (p.hidden.karma - 50) / 250))) {
      if (def.curable) {
        p.conditions = p.conditions.filter((c) => c !== cond);
        lines.push(`${def.name} sembuh${billText}.`);
      } else {
        cond.treated = true;
        cond.severity = clampStat(cond.severity - 15);
        lines.push(`${def.name} terkendali dengan obat rutin${billText}.`);
      }
      p.stats.health = clampStat(p.stats.health + randInt(rng, 3, 8));
    } else {
      lines.push(`Pengobatan ${def.name} belum berhasil${billText}.`);
    }
  }
  return done(w, `Aku ke dokter. ${lines.join(' ')}`, 'neutral');
}

export type MindBody = 'gym' | 'meditation' | 'library';

export function mindAndBody(w: World, rng: Rng, kind: MindBody): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const minAge = { gym: 12, meditation: 10, library: 6 }[kind];
  if (p.age < minAge) return refuse(`Minimal umur ${minAge}.`);
  if (!oncePerYear(p.flags, `act:${kind}`, w.save.year)) return refuse('Kamu sudah melakukannya tahun ini.');
  const s = p.stats;
  // Discipline decides whether the habit sticks.
  const sticks = chance(rng, 0.5 + p.hidden.discipline / 200);
  if (kind === 'gym') {
    if (!sticks) return done(w, 'Aku daftar gym, datang sekali, lalu iuran bulanan jadi donasi.', 'neutral');
    s.health = clampStat(s.health + randInt(rng, 2, 6));
    s.looks = clampStat(s.looks + randInt(rng, 1, 3));
    return done(w, 'Aku rajin ke gym tahun ini. Cermin mulai bersikap ramah.', 'positive');
  }
  if (kind === 'meditation') {
    s.happiness = clampStat(s.happiness + randInt(rng, 3, 8));
    p.hidden.discipline = clampStat(p.hidden.discipline + (sticks ? 2 : 0));
    return done(w, 'Aku bermeditasi. Pikiranku tenang, setidaknya sampai notifikasi grup keluarga masuk.', 'positive');
  }
  s.smarts = clampStat(s.smarts + randInt(rng, sticks ? 2 : 1, sticks ? 5 : 2));
  return done(w, 'Aku menghabiskan waktu di perpustakaan. Penjaganya mulai menghafal pesananku: buku dan sunyi.', 'positive');
}

export function findDate(w: World, rng: Rng, want: Sex): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  if (p.age < 18) return refuse('Aplikasi kencan hanya untuk 18 tahun ke atas.');
  if (related(w, p.id, ['spouse', 'partner']).length) return refuse('Kamu sudah punya pasangan. Jangan cari masalah.');
  if (!oncePerYear(p.flags, 'act:dating', w.save.year)) return refuse('Kamu sudah menggeser layar sampai jempol pegal tahun ini.');
  const age = clampStat(p.age + randInt(rng, -5, 5));
  const date = createPerson(w, rng, { sex: want, age: Math.max(18, age), countryCode: p.countryCode, cityId: p.cityId });
  const odds = 0.3 + p.stats.looks / 200 + (p.hidden.karma - 50) / 500;
  if (!chance(rng, odds)) {
    date.status = 'missing';
    return done(w, `Aku cocok dengan ${date.firstName} (${date.age}) di aplikasi kencan, lalu di-ghosting setelah tiga pesan.`, 'negative');
  }
  link(w, p.id, date.id, 'partner', 'partner', 55 + randInt(rng, 0, 25));
  p.stats.happiness = clampStat(p.stats.happiness + 10);
  return done(w, `Aku berkencan dengan ${date.firstName} (${date.age}) dari aplikasi kencan. Sekarang kami resmi pacaran!`, 'positive');
}

export type CrimeKind = 'shoplift' | 'pickpocket';

export function commitCrime(w: World, rng: Rng, kind: CrimeKind): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const minAge = kind === 'shoplift' ? 12 : 14;
  if (p.age < minAge) return refuse(`Minimal umur ${minAge}.`);
  if (!oncePerYear(p.flags, `act:${kind}`, w.save.year)) return refuse('Jangan serakah. Polisi juga punya kuota patroli.');
  const country = countryOf(p);
  p.hidden.karma = clampStat(p.hidden.karma - 6);
  const success = chance(rng, 0.55 + p.hidden.notoriety / 400 - (50 - p.hidden.karma) / 400);
  if (success) {
    const loot = localizePrice(kind === 'shoplift' ? randInt(rng, 5, 60) : randInt(rng, 20, 300), country);
    account(w, p.id).balance += loot;
    p.hidden.notoriety = clampStat(p.hidden.notoriety + 3);
    return done(w, kind === 'shoplift'
      ? `Aku mengutil barang senilai ${formatMoney(loot, country)} dari minimarket. Kamera CCTV-nya ternyata hiasan.`
      : `Aku mencopet dompet berisi ${formatMoney(loot, country)} di pasar. Rasa bersalahnya gratis.`, 'negative');
  }
  const fine = localizePrice(randInt(rng, 50, 400), country);
  account(w, p.id).balance -= fine;
  p.hidden.notoriety = clampStat(p.hidden.notoriety + 6);
  p.stats.happiness = clampStat(p.stats.happiness - 10);
  return done(w, `Aku tertangkap basah ${kind === 'shoplift' ? 'mengutil' : 'mencopet'} dan didenda ${formatMoney(fine, country)}. Foto wajahku kini dipajang di dekat kasir.`, 'negative');
}

export function emigrate(w: World): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  const targets = ACTIVE_COUNTRY_CODES.filter((c) => c !== p.countryCode);
  if (targets.length === 0) return refuse('Belum ada negara tujuan yang dibuka di versi ini. Untuk sementara, cintai produk dalam negeri.');
  return refuse('Emigrasi belum tersedia.');
}

export function setWill(w: World, beneficiaryIds: Id[]): ActionResult {
  const blocked = guard(w);
  if (blocked) return blocked;
  const p = player(w);
  p.will = { beneficiaryIds };
  const names = beneficiaryIds.map((id) => w.persons[id]?.firstName).filter(Boolean).join(', ');
  return done(w, names ? `Aku menulis surat wasiat untuk ${names}.` : 'Aku menghapus surat wasiatku. Hartaku akan dibagi rata ke anak-anak.', 'neutral');
}
