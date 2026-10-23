import Dexie, { type Table } from 'dexie';
import type { DbTables, Id } from '../types/types.ts';
import type { World } from '../engine/world.ts';

type Tables = { [K in keyof DbTables]: Table<DbTables[K], Id> };

export class LifeDb extends Dexie {
  declare saves: Tables['saves'];
  declare persons: Tables['persons'];
  declare relationships: Tables['relationships'];
  declare employments: Tables['employments'];
  declare educations: Tables['educations'];
  declare assets: Tables['assets'];
  declare accounts: Tables['accounts'];
  declare log: Tables['log'];

  constructor() {
    super('hidup-kedua');
    this.version(1).stores({
      saves: 'id, updatedAt',
      persons: 'id, saveId, [saveId+status]',
      relationships: 'id, saveId, fromId, toId, [fromId+type]',
      employments: 'id, saveId, personId',
      educations: 'id, saveId, personId',
      assets: 'id, saveId, ownerId',
      accounts: 'id, saveId, ownerId',
      log: 'id, saveId, [saveId+personId+age]',
    });
  }
}

export const db = new LifeDb();

/** Writes the whole save in one transaction. Called after every player action and every +Age. */
export async function persistWorld(w: World): Promise<void> {
  w.save.updatedAt = Date.now();
  const newLog = w.unsavedLog > 0 ? w.log.slice(-w.unsavedLog) : [];
  await db.transaction('rw', [db.saves, db.persons, db.relationships, db.employments, db.educations, db.assets, db.accounts, db.log], async () => {
    await db.saves.put(w.save);
    await db.persons.bulkPut(Object.values(w.persons));
    await db.relationships.bulkPut(Object.values(w.relationships));
    await db.employments.bulkPut(Object.values(w.employments));
    await db.educations.bulkPut(Object.values(w.educations));
    await db.assets.bulkPut(Object.values(w.assets));
    await db.accounts.bulkPut(Object.values(w.accounts));
    if (newLog.length) await db.log.bulkPut(newLog);
  });
  w.unsavedLog = 0;
}

const byId = <T extends { id: Id }>(rows: T[]): Record<Id, T> => Object.fromEntries(rows.map((r) => [r.id, r]));

export async function loadLatestWorld(): Promise<World | null> {
  const save = await db.saves.orderBy('updatedAt').last();
  if (!save) return null;
  const where = { saveId: save.id };
  const [persons, relationships, employments, educations, assets, accounts, log] = await Promise.all([
    db.persons.where(where).toArray(),
    db.relationships.where(where).toArray(),
    db.employments.where(where).toArray(),
    db.educations.where(where).toArray(),
    db.assets.where(where).toArray(),
    db.accounts.where(where).toArray(),
    db.log.where(where).toArray(),
  ]);
  return {
    save,
    persons: byId(persons),
    relationships: byId(relationships),
    employments: byId(employments),
    educations: byId(educations),
    assets: byId(assets),
    accounts: byId(accounts),
    log: log.sort((a, b) => a.seq - b.seq),
    unsavedLog: 0,
  };
}
