import { assetDefById, DISEASES, diseaseById } from '../content/catalog.ts';
import { careerById } from '../content/careers.ts';
import { progressSchool } from './education.ts';
import { selectEvent } from './events.ts';
import { evalFormula, type Ctx } from './formula.ts';
import { die } from './lifecycle.ts';
import { formatMoney, gompertzDeathProbability, incomeTax, localizeSalary, toMinor } from './localization.ts';
import { chance, randInt, type Rng } from './rng.ts';
import {
  account, activeJob, addLog, clampStat, countryOf, edgeBetween, fullName, ownedAssets, player, related, unlink,
  type World,
} from './world.ts';

const RELATION_WORD: Record<string, string> = {
  parent: 'Orang tuaku', sibling: 'Saudaraku', spouse: 'Pasanganku', partner: 'Pacarku', child: 'Anakku',
  friend: 'Temanku', bestFriend: 'Sahabatku', grandparent: 'Kakek/nenekku',
};

/**
 * The +Age pipeline. Runs the 7 steps in order; the caller persists the world right after (step 7).
 * Returns early (skipping later steps) if the player dies.
 */
export function ageUp(w: World, rng: Rng): void {
  const p = player(w);
  if (p.status !== 'alive' || w.save.pendingEvent) return;

  // 1. Increment age (player + every living NPC).
  w.save.year += 1;
  for (const person of Object.values(w.persons)) if (person.status === 'alive') person.age += 1;
  addLog(w, '', 'neutral'); // age header marker: an empty entry starts the new year in the feed

  // 2. Economy & cashflow.
  economyTick(w, rng);
  workTick(w, rng);

  // 3. Stat decay, school progress, disease progression.
  progressSchool(w, rng, p);
  statDecay(w, rng);
  diseaseTick(w, rng);

  // 4. NPC autonomous actions.
  npcTick(w, rng);

  // 5. Mortality.
  if (mortalityCheck(w, rng)) return;

  // 6. Weighted event selector -> pending modal.
  selectEvent(w, rng);
  // 7. Auto-save happens in the caller (persistWorld) immediately after this returns.
}

function economyTick(w: World, rng: Rng): void {
  const p = player(w);
  const country = countryOf(p);
  const acc = account(w, p.id);
  const scale = (major: number) => toMinor(major, country);
  let flow = 0;

  const job = activeJob(w, p.id);
  if (job) flow += job.salary - incomeTax(job.salary, country);
  const pension = typeof p.flags.pension === 'number' ? p.flags.pension : 0;
  if (pension) flow += pension;

  // Young adults still living with a parent don't pay their own living cost yet.
  const supportedByParents = p.age < 23 && related(w, p.id, ['parent']).length > 0;
  if (p.age >= 18 && !supportedByParents) {
    flow -= scale(country.economy.baseLivingCostAdult);
    flow -= scale(country.healthcare.annualPremium);
  }
  const dependents = related(w, p.id, ['child']).filter((r) => r.person.age < 18).length;
  flow -= dependents * scale(country.economy.costPerChild);

  for (const a of ownedAssets(w, p.id)) {
    const def = assetDefById(a.defId);
    if (def) {
      a.value = Math.max(0, Math.round(a.value * (1 + def.annualAppreciation)));
      flow -= Math.round(a.value * def.upkeepRate);
    }
    if (a.kind === 'car') a.condition = clampStat(a.condition - randInt(rng, 3, 10));
    if (a.loan && a.loan.yearsLeft > 0) {
      const pay = Math.min(a.loan.annualPayment, Math.round(a.loan.remaining * (1 + a.loan.annualRate)));
      flow -= pay;
      a.loan.remaining = Math.max(0, Math.round(a.loan.remaining * (1 + a.loan.annualRate)) - pay);
      a.loan.yearsLeft -= 1;
      if (a.loan.yearsLeft === 0 || a.loan.remaining === 0) {
        delete a.loan;
        addLog(w, `Cicilan ${a.name} akhirnya lunas. Bank kehilangan satu sumber penghasilan.`, 'positive');
      }
    }
    if (a.rental) flow += a.rental.annualRent;
  }

  acc.balance += flow;
  if (acc.balance < 0) {
    p.stats.happiness = clampStat(p.stats.happiness - 15);
    addLog(w, `Saldoku minus ${formatMoney(-acc.balance, country)}. Penagih utang mulai hafal alamat rumahku.`, 'negative');
  }
}

function workTick(w: World, rng: Rng): void {
  const p = player(w);
  const job = activeJob(w, p.id);
  if (!job) return;
  const def = careerById(job.careerId);
  if (!def) return;
  job.yearsInRank += 1;
  job.performance = clampStat(job.performance + (p.hidden.discipline - 50) / 10 + (p.stats.smarts - 50) / 20 + randInt(rng, -8, 6));
  const ctx: Ctx = { w, roles: {} };

  if (chance(rng, evalFormula(def.fireChance, ctx))) {
    job.endedYear = w.save.year;
    job.endReason = 'fired';
    p.stats.happiness = clampStat(p.stats.happiness - 20);
    addLog(w, `Aku dipecat dari pekerjaan sebagai ${def.ladder[job.rank]!.title}. Katanya "bukan karena kamu, tapi karena kamu".`, 'negative');
    return;
  }
  const next = def.ladder[job.rank + 1];
  if (next && job.yearsInRank >= next.minYearsBefore && chance(rng, evalFormula(def.promotionChance, ctx))) {
    job.rank += 1;
    job.yearsInRank = 0;
    job.salary = localizeSalary(next.salary, countryOf(p));
    p.stats.happiness = clampStat(p.stats.happiness + 10);
    addLog(w, `Aku naik jabatan menjadi ${next.title}! Gaji baru: ${formatMoney(job.salary, countryOf(p))} per tahun.`, 'positive');
  } else if (job.yearsInRank > 0) {
    // Small yearly raise.
    job.salary = Math.round(job.salary * 1.03);
  }
}

function statDecay(w: World, rng: Rng): void {
  const p = player(w);
  const s = p.stats;
  if (p.age > 50) s.health = clampStat(s.health - randInt(rng, 0, Math.ceil((p.age - 50) / 8)));
  // Without active illness the body recovers slowly (less with age).
  else if (p.conditions.every((c) => c.treated)) s.health = clampStat(s.health + randInt(rng, 0, 4));
  if (p.age > 35) s.looks = clampStat(s.looks - randInt(rng, 0, p.age > 60 ? 3 : 1));
  if (p.age < 25) s.smarts = clampStat(s.smarts + randInt(rng, 0, 2));
  // Happiness drifts back toward a personal baseline.
  s.happiness = clampStat(s.happiness + Math.sign(55 - s.happiness) * randInt(rng, 0, 3));
  // Karma slowly regresses to neutral.
  p.hidden.karma = clampStat(p.hidden.karma + Math.sign(50 - p.hidden.karma));
}

function diseaseTick(w: World, rng: Rng): void {
  const p = player(w);
  for (const cond of p.conditions) {
    const def = diseaseById(cond.diseaseId);
    if (!def) continue;
    if (cond.treated) {
      cond.severity = clampStat(cond.severity - 10);
      cond.treated = def.curable ? cond.treated : false;
      continue;
    }
    if (chance(rng, def.naturalRecovery)) {
      cond.severity = 0;
      addLog(w, `Aku sembuh dari ${def.name} dengan sendirinya. Tubuhku ternyata bisa diandalkan.`, 'positive');
      continue;
    }
    const loss = Math.round(def.annualHealthLoss * (cond.severity / 50));
    p.stats.health = clampStat(p.stats.health - loss);
    p.stats.happiness = clampStat(p.stats.happiness - Math.ceil(loss / 2));
    if (chance(rng, 0.35 - p.hidden.karma / 500)) {
      cond.severity = clampStat(cond.severity + randInt(rng, 5, 20));
      addLog(w, `${def.name} yang kuderita makin parah karena belum diobati.`, 'negative');
    }
  }
  p.conditions = p.conditions.filter((c) => c.severity > 0);

  // New illness, more likely with age and bad karma.
  const ageFactor = 1 + Math.max(0, p.age - 40) / 20;
  const karmaFactor = 1.5 - p.hidden.karma / 100;
  for (const def of DISEASES) {
    if (p.age < def.minAge || p.conditions.some((c) => c.diseaseId === def.id)) continue;
    if (chance(rng, def.baseChance * ageFactor * karmaFactor)) {
      p.conditions.push({ diseaseId: def.id, sinceYear: w.save.year, severity: randInt(rng, 30, 60), treated: false });
      addLog(w, `Aku didiagnosis ${def.name}. Sebaiknya segera ke dokter.`, 'negative');
      break;
    }
  }
}

function npcTick(w: World, rng: Rng): void {
  const p = player(w);
  const country = countryOf(p);
  for (const { edge, person: npc } of related(w, p.id)) {
    // Bars fade slowly unless maintained.
    edge.bar = clampStat(edge.bar - randInt(rng, 0, 3));
    const back = edgeBetween(w, npc.id, p.id);
    if (back) back.bar = edge.bar;

    // NPC mortality (age-driven).
    if (npc.age > 55 && chance(rng, gompertzDeathProbability(npc.age, country.mortality))) {
      die(w, npc.id, 'old_age');
      p.stats.happiness = clampStat(p.stats.happiness - (edge.bar > 50 ? 15 : 5));
      addLog(w, `${RELATION_WORD[edge.type] ?? 'Kenalanku'}, ${fullName(npc)}, meninggal karena usia tua di umur ${npc.age}.`, 'negative');
      continue;
    }

    if ((edge.type === 'partner' || edge.type === 'spouse') && edge.bar < 30 && npc.personality.craziness > 55 && chance(rng, 0.35)) {
      const divorce = edge.type === 'spouse';
      const prenup = divorce && edge.marriage?.prenup;
      unlink(w, p.id, npc.id, divorce ? 'exSpouse' : 'exPartner');
      p.stats.happiness = clampStat(p.stats.happiness - 20);
      if (divorce) {
        delete p.flags.married;
        const acc = account(w, p.id);
        if (!prenup && acc.balance > 0) {
          const half = Math.round(acc.balance / 2);
          acc.balance -= half;
          account(w, npc.id).balance += half;
          addLog(w, `${npc.firstName} menggugat cerai dan membawa ${formatMoney(half, country)}. Andai dulu ada perjanjian pranikah.`, 'negative');
        } else {
          addLog(w, `${npc.firstName} menggugat cerai. Untung ada perjanjian pranikah.`, 'negative');
        }
      } else {
        addLog(w, `${npc.firstName} memutuskanku lewat pesan singkat, lengkap dengan stiker kucing menangis.`, 'negative');
      }
      continue;
    }

    if ((edge.type === 'friend' || edge.type === 'bestFriend') && chance(rng, 0.2)) {
      edge.bar = clampStat(edge.bar + 6);
      p.stats.happiness = clampStat(p.stats.happiness + 3);
      addLog(w, `${npc.firstName} mengajakku nongkrong. Kami membahas hal yang sama seperti tahun lalu dan tetap seru.`, 'positive');
    }

    if (edge.type === 'parent' && p.age >= 17 && p.age <= 25 && npc.personality.generosity > 70 && chance(rng, 0.15)) {
      const gift = Math.round(account(w, npc.id).balance * 0.05);
      if (gift > 0) {
        account(w, npc.id).balance -= gift;
        account(w, p.id).balance += gift;
        addLog(w, `${npc.firstName} diam-diam mentransfer ${formatMoney(gift, country)} "buat jajan". Orang tua terbaik.`, 'positive');
      }
    }
  }
}

/** Gompertz mortality modified by karma; also forced risk at zero health. Returns true if the player died. */
function mortalityCheck(w: World, rng: Rng): boolean {
  const p = player(w);
  if (p.age <= 65 && p.stats.health > 0) return false;
  let prob = gompertzDeathProbability(p.age, countryOf(p).mortality) * (1.25 - p.hidden.karma / 200);
  if (p.stats.health < 20) prob *= 2;
  if (p.stats.health <= 0) prob = Math.max(prob, 0.6);
  if (!chance(rng, Math.min(0.95, prob))) return false;
  const worst = [...p.conditions].sort((a, b) => b.severity - a.severity)[0];
  die(w, p.id, p.stats.health <= 0 ? worst?.diseaseId ?? 'health_zero' : 'old_age');
  return true;
}
