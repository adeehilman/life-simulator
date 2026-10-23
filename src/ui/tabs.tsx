import { useState } from 'react';
import { CAREERS, careerById, MAJORS } from '../content/careers.ts';
import {
  ACTION_LABEL, applyJob, breakUp, buyAsset, canEnroll, commitCrime, dropOut, emigrate, enrollHigherEd, findDate,
  interact, jobBlocker, mindAndBody, propose, quitJob, sellAsset, setWill, shopItems, studyHarder, toggleRent,
  tryForBaby, visitDoctor, workHarder, type ActionResult,
} from '../engine/actions.ts';
import { stageOf } from '../engine/education.ts';
import { localizePrice, localizeSalary } from '../engine/localization.ts';
import type { Rng } from '../engine/rng.ts';
import {
  account, activeEducation, activeJob, countryOf, netWorth, ownedAssets, player, related, type World,
} from '../engine/world.ts';
import type { CareerCategory, Id, NpcAction, RelationType } from '../types/types.ts';
import { Row, Section, Sheet } from './components.tsx';
import { avatarFor, money, relationTitle } from './format.ts';

export type Commit = (fn: (w: World, rng: Rng) => ActionResult) => void;
interface TabProps { w: World; commit: Commit; onClose: () => void }

/** Simple view stack for sub-menus inside a sheet. */
function useNav<T extends string>(root: T) {
  const [stack, setStack] = useState<T[]>([root]);
  return {
    view: stack[stack.length - 1]!,
    push: (v: T) => setStack((s) => [...s, v]),
    back: stack.length > 1 ? () => setStack((s) => s.slice(0, -1)) : undefined,
  };
}

// ───────────────────────────── Pekerjaan / Sekolah ─────────────────────────────

const CATEGORY: { id: CareerCategory; icon: string; label: string }[] = [
  { id: 'fullTime', icon: '💼', label: 'Pekerjaan Penuh Waktu' },
  { id: 'partTime', icon: '⏱️', label: 'Paruh Waktu' },
  { id: 'military', icon: '🎖️', label: 'Militer' },
  { id: 'politics', icon: '🏛️', label: 'Politik' },
  { id: 'special', icon: '⭐', label: 'Karier Khusus' },
];

export function OccupationTab({ w, commit, onClose }: TabProps) {
  const nav = useNav<'root' | 'school' | 'major-university' | 'major-graduate' | CareerCategory>('root');
  const p = player(w);
  const job = activeJob(w, p.id);
  const edu = activeEducation(w, p.id);
  const def = job && careerById(job.careerId);
  const close = (fn: Parameters<Commit>[0]) => { commit(fn); onClose(); };

  if (nav.view === 'school') {
    const history = Object.values(w.educations).filter((e) => e.personId === p.id);
    return (
      <Sheet title="Pendidikan" onClose={onClose} onBack={nav.back}>
        {edu ? (
          <div className="card">
            <div className="big">{edu.institution}</div>
            <div className="kv"><span>Jenjang</span><b>{stageOf(p, edu.stage).localName}</b></div>
            {edu.majorId && <div className="kv"><span>Jurusan</span><b>{MAJORS.find((m) => m.id === edu.majorId)?.name}</b></div>}
            <div className="kv"><span>Nilai</span><b>{edu.grades}</b></div>
          </div>
        ) : <div className="empty">Kamu sedang tidak bersekolah.</div>}
        {edu && <Row icon="📚" title="Belajar lebih keras" sub="Nilai naik, waktu main berkurang" onClick={() => close((x, r) => studyHarder(x, r))} />}
        {edu && <Row icon="🚪" title="Berhenti sekolah" onClick={() => close((x) => dropOut(x))} />}
        <Section>Pendidikan Tinggi</Section>
        <Row icon="🎓" title="Daftar Kuliah (S1)" sub={canEnroll(w, 'university') ?? 'Pilih jurusan'} disabled={!!canEnroll(w, 'university')} onClick={() => nav.push('major-university')} />
        <Row icon="📜" title="Daftar Pascasarjana (S2)" sub={canEnroll(w, 'graduate') ?? 'Pilih jurusan'} disabled={!!canEnroll(w, 'graduate')} onClick={() => nav.push('major-graduate')} />
        <Section>Riwayat</Section>
        {history.length === 0 && <div className="empty">Belum ada riwayat sekolah.</div>}
        {history.map((e) => (
          <Row key={e.id} icon={e.status === 'graduated' ? '✅' : e.status === 'enrolled' ? '🏫' : '❌'} chevron={false}
            title={e.institution} sub={`${stageOf(p, e.stage).localName} · ${e.status === 'graduated' ? 'Lulus' : e.status === 'enrolled' ? 'Sedang berjalan' : 'Berhenti'}`} />
        ))}
      </Sheet>
    );
  }

  if (nav.view === 'major-university' || nav.view === 'major-graduate') {
    const stage = nav.view === 'major-university' ? 'university' : 'graduate';
    return (
      <Sheet title="Pilih Jurusan" onClose={onClose} onBack={nav.back}>
        {MAJORS.map((m) => <Row key={m.id} icon="🎓" title={m.name} onClick={() => close((x, r) => enrollHigherEd(x, r, stage, m.id))} />)}
      </Sheet>
    );
  }

  const category = CATEGORY.find((c) => c.id === nav.view);
  if (category) {
    const list = CAREERS.filter((c) => c.category === category.id);
    return (
      <Sheet title={category.label} onClose={onClose} onBack={nav.back}>
        {list.length === 0 && <div className="empty">Segera hadir di versi berikutnya.</div>}
        {list.map((c) => {
          const blocker = jobBlocker(w, c);
          const salary = money(localizeSalary(c.ladder[0]!.salary, countryOf(p)), p);
          return <Row key={c.id} icon={category.icon} title={c.title} sub={blocker ?? `${salary} / tahun`} disabled={!!blocker}
            onClick={() => close((x, r) => applyJob(x, r, c.id))} />;
        })}
      </Sheet>
    );
  }

  return (
    <Sheet title={p.age < 18 && !job ? 'Sekolah' : 'Pekerjaan'} onClose={onClose}>
      {job && def && (
        <>
          <div className="card">
            <div className="big">{def.ladder[job.rank]?.title}</div>
            <div className="kv"><span>Gaji</span><b>{money(job.salary, p)} / tahun</b></div>
            <div className="kv"><span>Kinerja</span><b>{job.performance}%</b></div>
            <div className="kv"><span>Lama di jabatan</span><b>{job.yearsInRank} tahun</b></div>
          </div>
          <Row icon="💪" title="Kerja lebih keras" onClick={() => close((x, r) => workHarder(x, r))} />
          <Row icon="👋" title={p.age >= countryOf(p).legal.retirementAge ? 'Pensiun' : 'Mengundurkan diri'} onClick={() => close((x) => quitJob(x))} />
        </>
      )}
      <Section>Pendidikan</Section>
      <Row icon="🏫" title="Sekolah & Kuliah" sub={edu ? edu.institution : 'Riwayat dan pendaftaran'} onClick={() => nav.push('school')} />
      <Section>Karier</Section>
      {CATEGORY.map((c) => <Row key={c.id} icon={c.icon} title={c.label} onClick={() => nav.push(c.id)} />)}
    </Sheet>
  );
}

// ───────────────────────────── Aset ─────────────────────────────

export function AssetsTab({ w, commit, onClose }: TabProps) {
  const nav = useNav<string>('root');
  const p = player(w);
  const c = countryOf(p);
  const mine = ownedAssets(w, p.id);
  const close = (fn: Parameters<Commit>[0]) => { commit(fn); onClose(); };

  if (nav.view === 'car' || nav.view === 'house') {
    return (
      <Sheet title={nav.view === 'car' ? 'Dealer Kendaraan' : 'Agen Properti'} onClose={onClose} onBack={nav.back}>
        {shopItems(nav.view).map((d) => (
          <Row key={d.id} icon={d.kind === 'car' ? '🚗' : '🏡'} title={d.name} sub={money(localizePrice(d.basePrice, c), p)} onClick={() => nav.push(`buy:${d.id}`)} />
        ))}
      </Sheet>
    );
  }
  if (nav.view.startsWith('buy:')) {
    const d = shopItems('car').concat(shopItems('house')).find((x) => x.id === nav.view.slice(4))!;
    const price = localizePrice(d.basePrice, c);
    const dp = Math.round(price * (d.kind === 'house' ? 0.2 : 0.3));
    return (
      <Sheet title={d.name} onClose={onClose} onBack={nav.back}>
        <div className="card">
          <div className="big">{money(price, p)}</div>
          <div className="kv"><span>Saldomu</span><b>{money(account(w, p.id).balance, p)}</b></div>
        </div>
        <Row icon="💵" title="Bayar tunai" onClick={() => close((x) => buyAsset(x, d.id, 'cash'))} />
        <Row icon="🏦" title={d.kind === 'house' ? 'KPR (DP 20%, 20 tahun)' : 'Kredit (DP 30%, 5 tahun)'} sub={`DP ${money(dp, p)}`}
          onClick={() => close((x) => buyAsset(x, d.id, 'loan'))} />
      </Sheet>
    );
  }
  if (nav.view.startsWith('own:')) {
    const a = mine.find((x) => x.id === nav.view.slice(4));
    if (!a) return <Sheet title="Aset" onClose={onClose} onBack={nav.back}><div className="empty">Aset tidak ditemukan.</div></Sheet>;
    return (
      <Sheet title={a.name} onClose={onClose} onBack={nav.back}>
        <div className="card">
          <div className="kv"><span>Nilai</span><b>{money(a.value, p)}</b></div>
          <div className="kv"><span>Kondisi</span><b>{a.condition}%</b></div>
          {a.loan && <div className="kv"><span>Sisa utang</span><b>{money(a.loan.remaining, p)} ({a.loan.yearsLeft} th)</b></div>}
          {a.rental && <div className="kv"><span>Sewa</span><b>{money(a.rental.annualRent, p)} / tahun</b></div>}
        </div>
        {a.kind === 'house' && <Row icon="🔑" title={a.rental ? 'Berhenti menyewakan' : 'Sewakan'} onClick={() => close((x) => toggleRent(x, a.id))} />}
        <Row icon="🏷️" title="Jual" sub={`Terima ${money(a.value - (a.loan?.remaining ?? 0), p)}`} onClick={() => close((x) => sellAsset(x, a.id))} />
      </Sheet>
    );
  }

  const loans = mine.reduce((s, a) => s + (a.loan?.remaining ?? 0), 0);
  return (
    <Sheet title="Aset" onClose={onClose}>
      <div className="card">
        <div className="kv"><span>Kekayaan bersih</span></div>
        <div className="big">{money(netWorth(w, p.id), p)}</div>
        <div className="kv"><span>Saldo bank</span><b>{money(account(w, p.id).balance, p)}</b></div>
        <div className="kv"><span>Nilai aset</span><b>{money(mine.reduce((s, a) => s + a.value, 0), p)}</b></div>
        <div className="kv"><span>Utang</span><b>{money(loans, p)}</b></div>
      </div>
      <Section>Milikku</Section>
      {mine.length === 0 && <div className="empty">Belum punya aset apa pun.</div>}
      {mine.map((a) => <Row key={a.id} icon={a.kind === 'car' ? '🚗' : '🏡'} title={a.name} sub={money(a.value, p)} onClick={() => nav.push(`own:${a.id}`)} />)}
      <Section>Belanja</Section>
      <Row icon="🚗" title="Kendaraan" onClick={() => nav.push('car')} />
      <Row icon="🏡" title="Properti" onClick={() => nav.push('house')} />
    </Sheet>
  );
}

// ───────────────────────────── Hubungan ─────────────────────────────

const GROUPS: { title: string; types: RelationType[] }[] = [
  { title: 'Orang Tua', types: ['parent', 'stepParent', 'grandparent'] },
  { title: 'Saudara', types: ['sibling', 'halfSibling'] },
  { title: 'Pasangan', types: ['spouse', 'partner', 'fiance'] },
  { title: 'Anak', types: ['child', 'stepChild', 'grandchild'] },
  { title: 'Teman', types: ['friend', 'bestFriend', 'classmate', 'coworker'] },
  { title: 'Mantan', types: ['exPartner', 'exSpouse'] },
];
const ACTIONS: { id: NpcAction; icon: string }[] = [
  { id: 'conversation', icon: '💬' }, { id: 'compliment', icon: '🌷' }, { id: 'insult', icon: '😤' },
  { id: 'spendTime', icon: '☕' }, { id: 'giveMoney', icon: '💸' }, { id: 'askForMoney', icon: '🙏' },
];
const GIFTS = [20, 200, 2_000];

export function RelationshipsTab({ w, commit, onClose }: TabProps) {
  const nav = useNav<string>('root');
  const p = player(w);
  const close = (fn: Parameters<Commit>[0]) => { commit(fn); onClose(); };

  if (nav.view.startsWith('person:') || nav.view.startsWith('gift:')) {
    const id: Id = nav.view.split(':')[1]!;
    const rel = related(w, p.id, undefined, true).find((r) => r.person.id === id);
    if (!rel) return <Sheet title="Hubungan" onClose={onClose} onBack={nav.back}><div className="empty">Tidak ditemukan.</div></Sheet>;
    const { person: npc, edge } = rel;
    if (nav.view.startsWith('gift:')) {
      return (
        <Sheet title={`Beri uang ke ${npc.firstName}`} onClose={onClose} onBack={nav.back}>
          {GIFTS.map((g) => <Row key={g} icon="💸" title={money(localizePrice(g, countryOf(p)), p)} onClick={() => close((x, r) => interact(x, r, id, 'giveMoney', g))} />)}
        </Sheet>
      );
    }
    const alive = npc.status === 'alive';
    const romantic = edge.type === 'partner' || edge.type === 'spouse';
    return (
      <Sheet title={`${npc.firstName} ${npc.lastName ?? ''}`} onClose={onClose} onBack={nav.back}>
        <div className="card">
          <div className="big">{avatarFor(npc)} {relationTitle(edge.type, npc)}</div>
          <div className="kv"><span>Umur</span><b>{npc.age} tahun{alive ? '' : ' (almarhum)'}</b></div>
          <div className="kv"><span>Hubungan</span><b>{edge.bar}%</b></div>
        </div>
        {alive && ACTIONS.map((a) => (
          <Row key={a.id} icon={a.icon} title={ACTION_LABEL[a.id]}
            onClick={() => (a.id === 'giveMoney' ? nav.push(`gift:${id}`) : close((x, r) => interact(x, r, id, a.id)))} />
        ))}
        {alive && romantic && (
          <>
            <Section>Asmara</Section>
            {edge.type === 'partner' && <Row icon="💍" title="Lamar" sub="Tanpa perjanjian pranikah" onClick={() => close((x, r) => propose(x, r, id, false))} />}
            {edge.type === 'partner' && <Row icon="📝" title="Lamar dengan perjanjian pranikah" onClick={() => close((x, r) => propose(x, r, id, true))} />}
            <Row icon="👶" title="Coba punya anak" onClick={() => close((x, r) => tryForBaby(x, r, id))} />
            <Row icon="💔" title={edge.type === 'spouse' ? 'Cerai' : 'Putus'} onClick={() => close((x, r) => breakUp(x, r, id))} />
          </>
        )}
      </Sheet>
    );
  }

  const all = related(w, p.id, undefined, true);
  return (
    <Sheet title="Hubungan" onClose={onClose}>
      {GROUPS.map((g) => {
        const people = all.filter((r) => g.types.includes(r.edge.type));
        if (!people.length) return null;
        return (
          <div key={g.title}>
            <Section>{g.title}</Section>
            {people.map(({ person: n, edge }) => (
              <Row key={edge.id} icon={avatarFor(n)} title={`${n.firstName} ${n.lastName ?? ''}`}
                sub={`${relationTitle(edge.type, n)} · ${n.age} th${n.status === 'alive' ? '' : ' · almarhum'}`}
                barValue={n.status === 'alive' ? edge.bar : undefined} onClick={() => nav.push(`person:${n.id}`)} />
            ))}
          </div>
        );
      })}
    </Sheet>
  );
}

// ───────────────────────────── Aktivitas ─────────────────────────────

export function ActivitiesTab({ w, commit, onClose }: TabProps) {
  const nav = useNav<'root' | 'mind' | 'love' | 'crime' | 'will'>('root');
  const p = player(w);
  const close = (fn: Parameters<Commit>[0]) => { commit(fn); onClose(); };
  const [heirs, setHeirs] = useState<Id[]>(p.will?.beneficiaryIds ?? []);

  if (nav.view === 'mind') {
    return (
      <Sheet title="Pikiran & Tubuh" onClose={onClose} onBack={nav.back}>
        <Row icon="🏋️" title="Gym" sub="Kesehatan & penampilan" onClick={() => close((x, r) => mindAndBody(x, r, 'gym'))} />
        <Row icon="🧘" title="Meditasi" sub="Kebahagiaan & disiplin" onClick={() => close((x, r) => mindAndBody(x, r, 'meditation'))} />
        <Row icon="📖" title="Perpustakaan" sub="Kepintaran" onClick={() => close((x, r) => mindAndBody(x, r, 'library'))} />
      </Sheet>
    );
  }
  if (nav.view === 'love') {
    return (
      <Sheet title="Cinta" onClose={onClose} onBack={nav.back}>
        <Section>Aplikasi Kencan</Section>
        <Row icon="👨" title="Cari laki-laki" onClick={() => close((x, r) => findDate(x, r, 'male'))} />
        <Row icon="👩" title="Cari perempuan" onClick={() => close((x, r) => findDate(x, r, 'female'))} />
      </Sheet>
    );
  }
  if (nav.view === 'crime') {
    return (
      <Sheet title="Kriminal" onClose={onClose} onBack={nav.back}>
        <Row icon="🛒" title="Mengutil" sub="Risiko rendah, hasil kecil" onClick={() => close((x, r) => commitCrime(x, r, 'shoplift'))} />
        <Row icon="👛" title="Mencopet" sub="Risiko sedang" onClick={() => close((x, r) => commitCrime(x, r, 'pickpocket'))} />
      </Sheet>
    );
  }
  if (nav.view === 'will') {
    const candidates = related(w, p.id, ['child', 'spouse', 'sibling', 'parent', 'partner']);
    const toggle = (id: Id) => setHeirs((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
    return (
      <Sheet title="Surat Wasiat" onClose={onClose} onBack={nav.back}>
        <div className="empty">Pilih ahli waris. Jika kosong, harta dibagi rata ke anak-anak.</div>
        {candidates.map(({ person: n, edge }) => (
          <Row key={n.id} icon={heirs.includes(n.id) ? '✅' : '⬜'} title={n.firstName} sub={relationTitle(edge.type, n)} chevron={false} onClick={() => toggle(n.id)} />
        ))}
        <div className="btn-row" style={{ gridTemplateColumns: '1fr' }}>
          <button className="btn" onClick={() => close((x) => setWill(x, heirs))}>Simpan Wasiat</button>
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet title="Aktivitas" onClose={onClose}>
      <Row icon="🩺" title="Dokter" sub={p.conditions.length ? `${p.conditions.length} penyakit aktif` : 'Periksa kesehatan'} onClick={() => close((x, r) => visitDoctor(x, r))} />
      <Row icon="🧘" title="Pikiran & Tubuh" onClick={() => nav.push('mind')} />
      <Row icon="💘" title="Cinta" onClick={() => nav.push('love')} />
      <Row icon="🦹" title="Kriminal" onClick={() => nav.push('crime')} />
      <Row icon="✈️" title="Emigrasi" onClick={() => close((x) => emigrate(x))} />
      <Row icon="📜" title="Surat Wasiat" onClick={() => nav.push('will')} />
    </Sheet>
  );
}
