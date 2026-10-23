import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ActionResult } from '../engine/actions.ts';
import type { PendingView } from '../engine/events.ts';
import { account, countryOf, player, type World } from '../engine/world.ts';
import type { LogEntry, VisibleStats } from '../types/types.ts';
import { avatarFor, fillClass, money, statusLine } from './format.ts';

/** Animates a number toward `target` (used for the bank balance). */
function useAnimatedNumber(target: number): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      const value = Math.round(origin + (target - origin) * (1 - (1 - t) ** 3));
      setShown(value);
      from.current = value;
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return shown;
}

export function Header({ w }: { w: World }) {
  const p = player(w);
  const balance = account(w, p.id).balance;
  const shown = useAnimatedNumber(balance);
  const prev = useRef(balance);
  const [pulse, setPulse] = useState('');
  useEffect(() => {
    if (balance !== prev.current) setPulse(balance > prev.current ? 'up' : 'down');
    prev.current = balance;
    const t = setTimeout(() => setPulse(''), 600);
    return () => clearTimeout(t);
  }, [balance]);
  const c = countryOf(p);
  return (
    <header className="header">
      <div className="avatar" aria-hidden>{avatarFor(p)}</div>
      <div className="who">
        <div className="name">{p.firstName} {p.lastName ?? ''}</div>
        <div className="status">{c.flag} {statusLine(w, p)} · {p.age} th</div>
      </div>
      <div className={`money ${shown < 0 ? 'neg' : ''} ${pulse}`}>
        <small>Saldo bank</small>
        {money(shown, p)}
      </div>
    </header>
  );
}

export function LogFeed({ w }: { w: World }) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = w.log.filter((e) => e.personId === w.save.currentPlayerId);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [entries.length]);
  const groups: { age: number; items: LogEntry[] }[] = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.age === e.age) last.items.push(e);
    else groups.push({ age: e.age, items: [e] });
  }
  return (
    <div className="feed" ref={ref}>
      {groups.map((g) => (
        <section key={`${g.age}-${g.items[0]!.id}`}>
          <div className="age-head">Umur {g.age} tahun</div>
          {g.items.filter((e) => e.text).map((e) => <p key={e.id} className={`entry ${e.tone}`}>{e.text}</p>)}
        </section>
      ))}
    </div>
  );
}

const STAT_LABEL: [keyof VisibleStats, string, string][] = [
  ['happiness', '😊', 'Bahagia'], ['health', '❤️', 'Sehat'], ['smarts', '🧠', 'Pintar'], ['looks', '✨', 'Penampilan'],
];

export function StatBars({ stats }: { stats: VisibleStats }) {
  return (
    <div className="stats">
      {STAT_LABEL.map(([key, icon, label]) => (
        <div className="stat" key={key}>
          <span>{icon} {label}</span>
          <div className="bar"><div className={fillClass(stats[key])} style={{ width: `${stats[key]}%` }} /></div>
          <span className="pct">{stats[key]}%</span>
        </div>
      ))}
    </div>
  );
}

export type TabId = 'occupation' | 'assets' | 'relationships' | 'activities';

export function Dock({ onAge, onTab, ageDisabled, schoolAge }: {
  onAge: () => void; onTab: (t: TabId) => void; ageDisabled: boolean; schoolAge: boolean;
}) {
  const tab = (id: TabId, icon: string, label: string) => (
    <button className="tab-btn" onClick={() => onTab(id)}><span>{icon}</span><span>{label}</span></button>
  );
  return (
    <nav className="dock">
      {tab('occupation', schoolAge ? '🎒' : '💼', schoolAge ? 'Sekolah' : 'Pekerjaan')}
      {tab('assets', '🏠', 'Aset')}
      <button className="age-btn" onClick={onAge} disabled={ageDisabled} aria-label="Tambah umur">+<br />Umur</button>
      {tab('relationships', '❤️', 'Hubungan')}
      {tab('activities', '🧭', 'Aktivitas')}
    </nav>
  );
}

/** Event pop-up: no close button, the player must pick a choice. */
export function EventModal({ view, onChoose }: { view: PendingView; onChoose: (id: string) => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal>
      <div className="modal">
        <h3>Kejadian</h3>
        <p>{view.prompt}</p>
        <div className="choices">
          {view.choices.map((c) => <button key={c.id} className="btn" onClick={() => onChoose(c.id)}>{c.label}</button>)}
        </div>
      </div>
    </div>
  );
}

export function NoticeModal({ result, onClose }: { result: ActionResult; onClose: () => void }) {
  return (
    <div className="overlay" role="dialog" aria-modal onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <p className={`tone-${result.tone}`}>{result.text}</p>
        <button className="btn" onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

export function Sheet({ title, onClose, onBack, children }: {
  title: string; onClose: () => void; onBack?: () => void; children: ReactNode;
}) {
  return (
    <div className="sheet">
      <div className="sheet-head">
        <button className={`icon-btn ${onBack ? '' : 'hidden'}`} onClick={onBack} aria-label="Kembali">←</button>
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Tutup">✕</button>
      </div>
      <div className="sheet-body">{children}</div>
    </div>
  );
}

export function Row({ icon, title, sub, onClick, disabled, chevron = true, barValue }: {
  icon: string; title: string; sub?: string; onClick?: () => void; disabled?: boolean; chevron?: boolean; barValue?: number;
}) {
  return (
    <button className="row" onClick={onClick} disabled={disabled}>
      <span className="ico">{icon}</span>
      <span className="txt">
        <div className="title">{title}</div>
        {sub && <div className="sub">{sub}</div>}
        {barValue !== undefined && (
          <div className="mini-bar"><div className={fillClass(barValue)} style={{ width: `${barValue}%` }} /></div>
        )}
      </span>
      {chevron && <span className="chev">›</span>}
    </button>
  );
}

export const Section = ({ children }: { children: ReactNode }) => <div className="section">{children}</div>;
