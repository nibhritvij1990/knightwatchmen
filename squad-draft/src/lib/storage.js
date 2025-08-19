// v2 storage and migration utilities for Squad Draft

export const V2_KEY = 'squad_root_v2';
export const V1_KEY = 'squad_draft_v1';

function nowTs() {
  return Date.now();
}

function generateId() {
  // Simple UUID v4 fallback. Consumers can pass their own uuid if needed.
  // Here we use a lightweight approach to avoid extra deps in this module.
  // Not a strict RFC4122 implementation, but good enough for local ids.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Create a default draft board (similar to previous single-board default)
export function createDefaultBoard() {
  const sampleNames = ['Alice', 'Bob', 'Charlie', 'Deepa', 'Ethan', 'Fatima', 'Ganesh', 'Hana'];
  const players = {};
  const availableOrder = sampleNames.map(name => {
    const id = generateId();
    players[id] = { id, name, notes: '' };
    return id;
  });
  return {
    players,
    availableOrder,
    buckets: { yes: [], maybe: [], no: [] },
    titles: { available: 'Available', yes: 'YES', maybe: 'MAYBE', no: 'NO' },
  };
}

export function normalizeBoardState(s) {
  const next = JSON.parse(JSON.stringify(s || {}));
  if (!next.players) next.players = {};
  if (!Array.isArray(next.availableOrder)) next.availableOrder = [];
  if (!next.buckets) next.buckets = { yes: [], maybe: [], no: [] };
  if (!Array.isArray(next.buckets.yes)) next.buckets.yes = [];
  if (!Array.isArray(next.buckets.maybe)) next.buckets.maybe = [];
  if (!Array.isArray(next.buckets.no)) next.buckets.no = [];
  if (!next.titles) next.titles = { available: 'Available', yes: 'YES', maybe: 'MAYBE', no: 'NO' };
  if (!next.titles.available) next.titles.available = 'Available';
  if (!next.titles.yes) next.titles.yes = 'YES';
  if (!next.titles.maybe) next.titles.maybe = 'MAYBE';
  if (!next.titles.no) next.titles.no = 'NO';
  return next;
}

export function createDefaultRoot() {
  const tId = generateId();
  const dId = generateId();
  const createdAt = nowTs();
  const draft = { id: dId, tournamentId: tId, name: 'Draft 1', createdAt, updatedAt: createdAt, ...createDefaultBoard() };
  return {
    version: 2,
    tournaments: {
      [tId]: { id: tId, name: 'My Tournament', draftIds: [dId], createdAt, updatedAt: createdAt },
    },
    drafts: {
      [dId]: draft,
    },
    ui: { currentTournamentId: tId, currentDraftId: dId },
  };
}

function migrateFromV1(v1) {
  const tId = generateId();
  const dId = generateId();
  const createdAt = nowTs();
  const board = normalizeBoardState(v1 || {});
  const draft = { id: dId, tournamentId: tId, name: 'Draft 1', createdAt, updatedAt: createdAt, ...board };
  return {
    version: 2,
    tournaments: {
      [tId]: { id: tId, name: 'My Tournament', draftIds: [dId], createdAt, updatedAt: createdAt },
    },
    drafts: {
      [dId]: draft,
    },
    ui: { currentTournamentId: tId, currentDraftId: dId },
  };
}

export function loadRoot() {
  try {
    const raw = localStorage.getItem(V2_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return ensureValidRoot(parsed);
    }
    // Try migrate from v1
    const v1Raw = localStorage.getItem(V1_KEY);
    if (v1Raw) {
      const v1 = JSON.parse(v1Raw);
      const migrated = migrateFromV1(v1);
      saveRoot(migrated);
      return migrated;
    }
    const def = createDefaultRoot();
    saveRoot(def);
    return def;
  } catch {
    const def = createDefaultRoot();
    saveRoot(def);
    return def;
  }
}

export function saveRoot(root) {
  try {
    localStorage.setItem(V2_KEY, JSON.stringify(root));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Save root error', e);
  }
}

export function ensureValidRoot(root) {
  const next = JSON.parse(JSON.stringify(root || {}));
  if (next.version !== 2) next.version = 2;
  if (!next.tournaments) next.tournaments = {};
  if (!next.drafts) next.drafts = {};
  if (!next.ui) next.ui = {};
  // Ensure at least one tournament and draft
  const tournamentIds = Object.keys(next.tournaments);
  if (tournamentIds.length === 0) {
    const def = createDefaultRoot();
    return def;
  }
  // Ensure drafts referenced exist
  for (const t of Object.values(next.tournaments)) {
    if (!Array.isArray(t.draftIds)) t.draftIds = [];
  }
  const draftIds = Object.keys(next.drafts);
  if (draftIds.length === 0) {
    const anyTid = tournamentIds[0];
    const dId = generateId();
    const createdAt = nowTs();
    next.drafts[dId] = { id: dId, tournamentId: anyTid, name: 'Draft 1', createdAt, updatedAt: createdAt, ...createDefaultBoard() };
    next.tournaments[anyTid].draftIds = [dId];
  }
  // Ensure UI selection
  const selTid = next.ui.currentTournamentId;
  const selDid = next.ui.currentDraftId;
  if (!selTid || !next.tournaments[selTid]) next.ui.currentTournamentId = Object.keys(next.tournaments)[0];
  const tid = next.ui.currentTournamentId;
  const t = next.tournaments[tid];
  if (!selDid || !next.drafts[selDid] || next.drafts[selDid].tournamentId !== tid) {
    next.ui.currentDraftId = (t.draftIds && t.draftIds[0]) || Object.keys(next.drafts).find(id => next.drafts[id].tournamentId === tid);
  }
  // Normalize boards
  for (const d of Object.values(next.drafts)) {
    Object.assign(d, normalizeBoardState(d));
  }
  return next;
}

export function createEmptyBoard() {
  return {
    players: {},
    availableOrder: [],
    buckets: { yes: [], maybe: [], no: [] },
    titles: { available: 'Available', yes: 'YES', maybe: 'MAYBE', no: 'NO' },
  };
}

export function addTournament(root, name) {
  const next = JSON.parse(JSON.stringify(root));
  const id = generateId();
  const ts = nowTs();
  next.tournaments[id] = { id, name: name || `Tournament ${Object.keys(next.tournaments).length + 1}`, draftIds: [], createdAt: ts, updatedAt: ts };
  // Create a first draft (blank)
  const dId = generateId();
  next.drafts[dId] = { id: dId, tournamentId: id, name: 'Draft 1', createdAt: ts, updatedAt: ts, ...createEmptyBoard() };
  next.tournaments[id].draftIds.push(dId);
  next.ui.currentTournamentId = id;
  next.ui.currentDraftId = dId;
  return next;
}

export function addDraft(root, tournamentId, name) {
  const next = JSON.parse(JSON.stringify(root));
  const t = next.tournaments[tournamentId];
  if (!t) return next;
  const id = generateId();
  const ts = nowTs();
  next.drafts[id] = { id, tournamentId, name: name || `Draft ${t.draftIds.length + 1}`, createdAt: ts, updatedAt: ts, ...createEmptyBoard() };
  t.draftIds.push(id);
  next.ui.currentDraftId = id;
  return next;
}

export function addDraftWithBoard(root, tournamentId, name, board) {
  const next = JSON.parse(JSON.stringify(root));
  const t = next.tournaments[tournamentId];
  if (!t) return next;
  const id = generateId();
  const ts = nowTs();
  const normalized = normalizeBoardState(board || {});
  next.drafts[id] = { id, tournamentId, name: name || `Draft ${t.draftIds.length + 1}`, createdAt: ts, updatedAt: ts, ...normalized };
  t.draftIds.push(id);
  next.ui.currentDraftId = id;
  return next;
}

export function renameTournament(root, tournamentId, name) {
  const next = JSON.parse(JSON.stringify(root));
  if (next.tournaments[tournamentId]) {
    next.tournaments[tournamentId].name = name || next.tournaments[tournamentId].name;
    next.tournaments[tournamentId].updatedAt = nowTs();
  }
  return next;
}

export function renameDraft(root, draftId, name) {
  const next = JSON.parse(JSON.stringify(root));
  if (next.drafts[draftId]) {
    next.drafts[draftId].name = name || next.drafts[draftId].name;
    next.drafts[draftId].updatedAt = nowTs();
  }
  return next;
}

export function deleteTournament(root, tournamentId) {
  const next = JSON.parse(JSON.stringify(root));
  const t = next.tournaments[tournamentId];
  if (!t) return next;
  // Delete drafts
  for (const dId of t.draftIds || []) {
    delete next.drafts[dId];
  }
  delete next.tournaments[tournamentId];
  // Reselect
  const tids = Object.keys(next.tournaments);
  if (tids.length === 0) {
    return ensureValidRoot(createDefaultRoot());
  }
  next.ui.currentTournamentId = tids[0];
  const firstTid = next.ui.currentTournamentId;
  const firstDraftId = next.tournaments[firstTid].draftIds?.[0] || Object.keys(next.drafts).find(id => next.drafts[id].tournamentId === firstTid);
  next.ui.currentDraftId = firstDraftId;
  return next;
}

export function deleteDraft(root, draftId) {
  const next = JSON.parse(JSON.stringify(root));
  const d = next.drafts[draftId];
  if (!d) return next;
  const tid = d.tournamentId;
  delete next.drafts[draftId];
  const t = next.tournaments[tid];
  if (t) t.draftIds = (t.draftIds || []).filter(id => id !== draftId);
  // Reselect within same tournament
  const nextDid = t?.draftIds?.[0];
  if (nextDid) {
    next.ui.currentDraftId = nextDid;
  } else {
    // If tournament has no drafts, create a new default draft
    const ts = nowTs();
    const newDid = generateId();
    next.drafts[newDid] = { id: newDid, tournamentId: tid, name: 'Draft 1', createdAt: ts, updatedAt: ts, ...createDefaultBoard() };
    next.tournaments[tid].draftIds = [newDid];
    next.ui.currentDraftId = newDid;
  }
  return next;
}

export function duplicateDraft(root, draftId) {
  const next = JSON.parse(JSON.stringify(root));
  const src = next.drafts[draftId];
  if (!src) return next;
  const id = generateId();
  const ts = nowTs();
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = id;
  copy.name = `Copy of ${src.name || 'Draft'}`;
  copy.createdAt = ts;
  copy.updatedAt = ts;
  copy.tournamentId = src.tournamentId;
  next.drafts[id] = copy;
  const t = next.tournaments[src.tournamentId];
  if (t) t.draftIds.push(id);
  next.ui.currentDraftId = id;
  return next;
}

export function duplicateTournament(root, tournamentId) {
  const next = JSON.parse(JSON.stringify(root));
  const t = next.tournaments[tournamentId];
  if (!t) return next;
  const newTid = generateId();
  const ts = nowTs();
  const newName = `Copy of ${t.name || 'Tournament'}`;
  next.tournaments[newTid] = { id: newTid, name: newName, draftIds: [], createdAt: ts, updatedAt: ts };
  for (const dId of t.draftIds || []) {
    const src = next.drafts[dId];
    if (!src) continue;
    const id = generateId();
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = id;
    copy.name = src.name;
    copy.createdAt = ts;
    copy.updatedAt = ts;
    copy.tournamentId = newTid;
    next.drafts[id] = copy;
    next.tournaments[newTid].draftIds.push(id);
  }
  next.ui.currentTournamentId = newTid;
  next.ui.currentDraftId = next.tournaments[newTid].draftIds[0];
  return next;
}

export function moveDraft(root, draftId, targetTournamentId) {
  const next = JSON.parse(JSON.stringify(root));
  const d = next.drafts[draftId];
  const target = next.tournaments[targetTournamentId];
  if (!d || !target) return next;
  const src = next.tournaments[d.tournamentId];
  if (src) src.draftIds = (src.draftIds || []).filter(id => id !== draftId);
  d.tournamentId = targetTournamentId;
  target.draftIds = target.draftIds || [];
  target.draftIds.push(draftId);
  next.ui.currentTournamentId = targetTournamentId;
  next.ui.currentDraftId = draftId;
  return next;
} 