import type { Education, Id, PersonEntity, SchoolStage, SchoolStageId } from '../types/types.ts';
import { chance, randInt, type Rng } from './rng.ts';
import { createPerson } from './people.ts';
import {
  activeEducation, addLog, clampStat, countryOf, hasGraduated, link, uid, STAGE_ORDER, type World,
} from './world.ts';

export function stageOf(p: PersonEntity, id: SchoolStageId): SchoolStage {
  return countryOf(p).legal.schoolStages.find((s) => s.id === id)!;
}

function institutionName(p: PersonEntity, stage: SchoolStage, rng: Rng): string {
  const city = countryOf(p).cities.find((c) => c.id === p.cityId)?.name ?? '';
  if (stage.id === 'university' || stage.id === 'graduate') {
    return `Universitas ${['Negeri', 'Swasta', 'Terbuka'][randInt(rng, 0, 2)]} ${city}`;
  }
  return `${stage.localName} ${chance(rng, 0.6) ? 'Negeri' : 'Swasta'} ${randInt(rng, 1, 12)} ${city}`;
}

export function enroll(w: World, rng: Rng, p: PersonEntity, stageId: SchoolStageId, majorId?: Id): Education {
  const stage = stageOf(p, stageId);
  const edu: Education = {
    id: uid(), saveId: w.save.id, personId: p.id, stage: stageId, institution: institutionName(p, stage, rng),
    majorId, startedYear: w.save.year, status: 'enrolled', grades: clampStat(p.stats.smarts * 0.6 + randInt(rng, 10, 40)),
  };
  w.educations[edu.id] = edu;
  if (p.id === w.save.currentPlayerId) {
    addLog(w, `Aku mulai bersekolah di ${edu.institution}.`, 'neutral');
    // New classmates become friends.
    if (stageId !== 'preschool' && chance(rng, 0.7)) {
      const mate = createPerson(w, rng, { age: p.age, countryCode: p.countryCode, cityId: p.cityId });
      link(w, p.id, mate.id, 'friend', 'friend', 40 + randInt(rng, 0, 30));
      addLog(w, `Aku berkenalan dengan ${mate.firstName}, teman sekelas yang suka meminjam penghapus tanpa mengembalikan.`, 'positive');
    }
  }
  return edu;
}

/** Yearly school progress for the player: auto-enroll compulsory stages, grades drift, graduation. */
export function progressSchool(w: World, rng: Rng, p: PersonEntity): void {
  const current = activeEducation(w, p.id);
  if (current) {
    const stage = stageOf(p, current.stage);
    const drift = (p.stats.smarts - 50) / 12 + (p.hidden.discipline - 50) / 12 + randInt(rng, -6, 6);
    current.grades = clampStat(current.grades + drift);
    if (current.grades > 70) p.stats.smarts = clampStat(p.stats.smarts + 1);
    if (w.save.year - current.startedYear >= stage.durationYears) {
      if (current.grades < 25 && chance(rng, 0.5)) {
        addLog(w, `Aku tinggal kelas di ${current.institution}. Nilai rapor ternyata bukan sekadar saran.`, 'negative');
        current.startedYear += 1;
        p.stats.happiness = clampStat(p.stats.happiness - 8);
        return;
      }
      current.status = 'graduated';
      current.endedYear = w.save.year;
      addLog(w, `Aku lulus dari ${current.institution} dengan nilai ${current.grades}.`, 'positive');
      p.stats.happiness = clampStat(p.stats.happiness + 5);
    } else {
      return;
    }
  }
  // Auto-enroll: stages up to high school start automatically at their entry age.
  for (const stage of countryOf(p).legal.schoolStages) {
    if (STAGE_ORDER.indexOf(stage.id) > STAGE_ORDER.indexOf('high')) continue;
    if (activeEducation(w, p.id) || p.age < stage.entryAge || p.age > stage.entryAge + 3) continue;
    const prev = STAGE_ORDER[STAGE_ORDER.indexOf(stage.id) - 1];
    const prevOk = !prev || prev === 'preschool' || hasGraduated(w, p.id, prev);
    const attended = Object.values(w.educations).some((e) => e.personId === p.id && e.stage === stage.id);
    if (prevOk && !attended) enroll(w, rng, p, stage.id);
  }
}
