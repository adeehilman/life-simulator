import { useCallback, useEffect, useRef, useState } from 'react';
import { loadLatestWorld, persistWorld } from '../db/db.ts';
import type { ActionResult } from '../engine/actions.ts';
import { pendingView, resolveChoice } from '../engine/events.ts';
import { causeLabel, continueAsChild, livingChildren } from '../engine/lifecycle.ts';
import { createWorld } from '../engine/people.ts';
import { saveRng, type Rng } from '../engine/rng.ts';
import { ageUp } from '../engine/tick.ts';
import { activeEducation, netWorth, player, type World } from '../engine/world.ts';
import { Dock, EventModal, Header, LogFeed, NoticeModal, StatBars, type TabId } from './components.tsx';
import { money } from './format.ts';
import { ActivitiesTab, AssetsTab, OccupationTab, RelationshipsTab } from './tabs.tsx';

const newSeed = () => Math.floor(Math.random() * 2 ** 31);

export function App() {
  const [world, setWorld] = useState<World | null>(null);
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const [tab, setTab] = useState<TabId | null>(null);
  const busy = useRef(false);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return; // React StrictMode runs effects twice in dev
    booted.current = true;
    void (async () => {
      let w = await loadLatestWorld();
      if (!w) {
        w = createWorld(newSeed());
        await persistWorld(w);
      }
      setWorld(w);
    })();
  }, []);

  /**
   * Every state change goes through here: mutate a copy, write it to IndexedDB, then render.
   * Persisting before rendering means a refresh can never undo or re-roll an action.
   */
  const run = useCallback(async (fn: (w: World, rng: Rng) => ActionResult | void) => {
    if (!world || busy.current) return;
    busy.current = true;
    try {
      const next = structuredClone(world);
      const result = fn(next, saveRng(next.save));
      await persistWorld(next);
      setWorld(next);
      if (result) setNotice(result);
    } finally {
      busy.current = false;
    }
  }, [world]);

  const startNewLife = useCallback(async () => {
    const w = createWorld(newSeed());
    await persistWorld(w);
    setNotice(null);
    setWorld(w);
  }, []);

  if (!world) return <div className="phone"><div className="loading">Memuat kehidupan…</div></div>;

  const p = player(world);
  const dead = p.status !== 'alive';
  const view = pendingView(world);
  const commit = (fn: (w: World, rng: Rng) => ActionResult) => void run(fn);
  const tabProps = { w: world, commit, onClose: () => setTab(null) };

  return (
    <div className="phone">
      <Header w={world} />
      <LogFeed w={world} />
      <Dock
        onAge={() => void run((w, rng) => ageUp(w, rng))}
        onTab={(t) => !dead && setTab(t)}
        ageDisabled={dead || !!view}
        schoolAge={p.age < 18 && !!activeEducation(world, p.id)}
      />
      <StatBars stats={p.stats} />

      {tab === 'occupation' && <OccupationTab {...tabProps} />}
      {tab === 'assets' && <AssetsTab {...tabProps} />}
      {tab === 'relationships' && <RelationshipsTab {...tabProps} />}
      {tab === 'activities' && <ActivitiesTab {...tabProps} />}

      {view && !dead && <EventModal view={view} onChoose={(id) => void run((w, rng) => resolveChoice(w, rng, id))} />}
      {notice && !view && <NoticeModal result={notice} onClose={() => setNotice(null)} />}
      {dead && !notice && (
        <div className="overlay">
          <div className="modal death">
            <div className="ghost">👻</div>
            <h3>{p.firstName} telah tiada</h3>
            <p>
              Meninggal di usia {p.death?.age} karena {causeLabel(p.death?.causeId ?? 'old_age')}.<br />
              Kekayaan bersih: {money(netWorth(world, p.id), p)}
            </p>
            <div className="choices">
              {livingChildren(world, p.id).map((child) => (
                <button key={child.id} className="btn" onClick={() => void run((w) => continueAsChild(w, child.id))}>
                  Lanjutkan sebagai {child.firstName} ({child.age} th)
                </button>
              ))}
              <button className="btn secondary" onClick={() => void startNewLife()}>Mulai Hidup Baru</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
