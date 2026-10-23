import { careerById } from '../content/careers.ts';
import { stageOf } from '../engine/education.ts';
import { formatMoney } from '../engine/localization.ts';
import { activeEducation, activeJob, countryOf, type World } from '../engine/world.ts';
import type { PersonEntity, RelationType } from '../types/types.ts';

/** Emoji avatar that changes with age, health and death. */
export function avatarFor(p: PersonEntity): string {
  if (p.status === 'dead') return '👻';
  if (p.stats.health < 25 || p.conditions.some((c) => c.severity >= 60 && !c.treated)) return '🤒';
  const m = p.sex === 'male';
  if (p.age < 3) return '👶';
  if (p.age < 13) return m ? '👦' : '👧';
  if (p.age < 20) return '🧑';
  if (p.age < 60) return m ? '👨' : '👩';
  return m ? '👴' : '👵';
}

/** Header status: job title, school, or life stage. */
export function statusLine(w: World, p: PersonEntity): string {
  if (p.status === 'dead') return 'Almarhum';
  const job = activeJob(w, p.id);
  if (job) return careerById(job.careerId)?.ladder[job.rank]?.title ?? 'Pekerja';
  const edu = activeEducation(w, p.id);
  if (edu) return `Siswa ${stageOf(p, edu.stage).localName}`;
  if (typeof p.flags.pension === 'number') return 'Pensiunan';
  if (p.age < 5) return 'Balita';
  if (p.age < 18) return 'Anak-anak';
  return 'Pengangguran';
}

/** Money in the currency of the country `p` lives in. */
export const money = (amount: number, p: PersonEntity) => formatMoney(amount, countryOf(p));

export const RELATION_LABEL: Record<RelationType, string> = {
  parent: 'Orang tua', child: 'Anak', sibling: 'Saudara', halfSibling: 'Saudara tiri', stepParent: 'Orang tua tiri',
  stepChild: 'Anak tiri', grandparent: 'Kakek/Nenek', grandchild: 'Cucu', partner: 'Pacar', fiance: 'Tunangan',
  spouse: 'Pasangan', exPartner: 'Mantan pacar', exSpouse: 'Mantan pasangan', friend: 'Teman', bestFriend: 'Sahabat',
  enemy: 'Musuh', coworker: 'Rekan kerja', boss: 'Atasan', classmate: 'Teman sekelas', teacher: 'Guru',
};

export function relationTitle(type: RelationType, p: PersonEntity): string {
  const m = p.sex === 'male';
  if (type === 'parent') return m ? 'Ayah' : 'Ibu';
  if (type === 'child') return m ? 'Putra' : 'Putri';
  if (type === 'sibling') return m ? 'Saudara laki-laki' : 'Saudara perempuan';
  if (type === 'spouse') return m ? 'Suami' : 'Istri';
  return RELATION_LABEL[type];
}

export const fillClass = (v: number) => (v > 60 ? 'fill-good' : v >= 30 ? 'fill-warn' : 'fill-bad');
