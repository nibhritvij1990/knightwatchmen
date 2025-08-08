/* Squad Draft App - Prototype (App.jsx) */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';

function ModalShell({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-md mx-auto rounded-2xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-slate-200/60 dark:ring-white/10 p-5"
          initial={{ y: 20, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
            <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="sr-only">Close</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-500">
                <path fillRule="evenodd" d="M10 8.586L4.293 2.879 2.879 4.293 8.586 10l-5.707 5.707 1.414 1.414L10 11.414l5.707 5.707 1.414-1.414L11.414 10l5.707-5.707-1.414-1.414L10 8.586z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function AddPlayerModal({ open, onCancel, onSubmit }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) { setName(''); setNotes(''); }
  }, [open]);

  const disabled = !name.trim();

  return (
    <ModalShell open={open} title="Add Player" onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); if (disabled) return; onSubmit({ name: name.trim(), notes: notes.trim() }); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="w-full px-3 py-2 rounded-lg border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="e.g., Jane Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Optional notes" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded-full bg-slate-200/70 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
          <button type="submit" disabled={disabled} className={`px-3 py-2 rounded-full transition ${disabled ? 'opacity-50 bg-brand-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700'}`}>Add</button>
        </div>
      </form>
    </ModalShell>
  );
}

function ImportCSVModal({ open, onCancel, onImport }) {
  const [text, setText] = useState('');

  useEffect(() => { if (open) setText(''); }, [open]);

  return (
    <ModalShell open={open} title="Import Players from CSV" onClose={onCancel}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">Paste CSV with headers. Recognized fields: <span className="font-mono">name</span> and <span className="font-mono">notes</span>.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="w-full px-3 py-2 rounded-lg border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder={`name,notes\nAlice,Top pick\nBob,Solid defender`} />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded-full bg-slate-200/70 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
          <button type="button" onClick={() => onImport(text)} disabled={!text.trim()} className={`px-3 py-2 rounded-full transition ${!text.trim() ? 'opacity-50 bg-accent-600 text-white' : 'bg-accent-600 text-white hover:bg-accent-500 active:bg-accent-700'}`}>Import</button>
        </div>
      </div>
    </ModalShell>
  );
}

function PlayerCard({ id, player, index, onEdit, onRemove }) {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => {
        const card = (
          <motion.div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={provided.draggableProps.style}
            initial={false}
            className={`select-none cursor-grab active:cursor-grabbing bg-white/90 dark:bg-slate-800/80 rounded-xl shadow-sm ring-1 ring-slate-200/60 dark:ring-white/10 p-3 mb-3 flex justify-between items-start transition duration-200 ${snapshot.isDragging ? 'ring-2 ring-brand-400 shadow-xl z-50' : 'hover:shadow-md dark:hover:shadow-none dark:hover:ring-2 dark:hover:ring-brand-400/40'}`}
          >
                      <div className="flex-1 min-w-0 pr-2">
            <div className="truncate font-semibold text-sm text-slate-800 dark:text-slate-100" title={player?.name} aria-label={player?.name}>{player?.name}</div>
            {player?.notes && <div className="truncate text-xs text-slate-500 dark:text-slate-400" title={player?.notes} aria-label={player?.notes}>{player.notes}</div>}
          </div>
          <div className="ml-2 flex items-center gap-2 shrink-0">
              <button type="button" onClick={() => onEdit(player)} className="text-xs px-2 py-1 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200 hover:bg-brand-100 dark:hover:bg-brand-900 transition">Edit</button>
              <button type="button" onClick={() => onRemove(player.id)} className="text-xs px-2 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900 transition">Remove</button>
            </div>
          </motion.div>
        );
        return snapshot.isDragging ? createPortal(card, document.body) : card;
      }}
    </Draggable>
  );
}

function Column({ droppableId, title, itemIds, playersMap, onEdit, onRemove }) {
  const titleColor =
    droppableId === 'yes' ? 'text-emerald-700 dark:text-emerald-300' :
    droppableId === 'maybe' ? 'text-amber-700 dark:text-amber-300' :
    droppableId === 'no' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200';
  const badgeBg =
    droppableId === 'yes' ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200' :
    droppableId === 'maybe' ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200' :
    droppableId === 'no' ? 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';

  return (
    <div className="flex-1 min-w-[260px] min-h-[56vh] bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className={`text-sm font-semibold ${titleColor}`}>{title}</h3>
        <div className={`text-xs px-2 py-0.5 rounded-full ${badgeBg}`}>{itemIds.length}</div>
      </div>
      <Droppable droppableId={droppableId} direction="vertical" type="PLAYER">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[56vh] pt-1">
            {itemIds.map((id, index) => (
              <PlayerCard key={id} id={id} index={index} player={playersMap[id]} onEdit={onEdit} onRemove={onRemove} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// Helpers
const STORAGE_KEY = 'squad_draft_v1';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Load error', e);
    return null;
  }
}

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save error', e);
  }
}

function defaultState() {
  const players = {};
  const sample = ['Alice','Bob','Charlie','Deepa','Ethan','Fatima','Ganesh','Hana'];
  const availableOrder = sample.map(name => {
    const id = uuidv4();
    players[id] = { id, name, notes: '' };
    return id;
  });
  return {
    players,
    availableOrder,
    buckets: { yes: [], maybe: [], no: [] },
  };
}

export default function App() {
  const [state, setState] = useState(() => loadFromStorage() || defaultState());
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [query, setQuery] = useState('');
  const [dark, setDark] = useState(() => localStorage.getItem('squad_dark') === '1');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const boardRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('squad_dark', dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    const id = setTimeout(() => saveToStorage(state), 120);
    return () => clearTimeout(id);
  }, [state]);

  function snapshotAnd(fn) {
    setLastSnapshot(JSON.parse(JSON.stringify(state)));
    fn();
  }

  function addPlayer(name, notes = '') {
    const id = uuidv4();
    snapshotAnd(() => setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.players[id] = { id, name, notes };
      next.availableOrder.unshift(id);
      return next;
    }));
  }

  function editPlayer(updated) {
    snapshotAnd(() => setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.players[updated.id] = updated;
      return next;
    }));
  }

  function removePlayer(id) {
    snapshotAnd(() => setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      delete next.players[id];
      next.availableOrder = next.availableOrder.filter(x => x !== id);
      next.buckets.yes = next.buckets.yes.filter(x => x !== id);
      next.buckets.maybe = next.buckets.maybe.filter(x => x !== id);
      next.buckets.no = next.buckets.no.filter(x => x !== id);
      return next;
    }));
  }

  function sendToAvailable(id) {
    snapshotAnd(() => setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.buckets.yes = next.buckets.yes.filter(x => x !== id);
      next.buckets.maybe = next.buckets.maybe.filter(x => x !== id);
      next.buckets.no = next.buckets.no.filter(x => x !== id);
      if (!next.availableOrder.includes(id)) next.availableOrder.unshift(id);
      return next;
    }));
  }

  function undo() {
    if (!lastSnapshot) return;
    setState(lastSnapshot);
    setLastSnapshot(null);
  }

  function importCSV(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const rows = results.data;
        snapshotAnd(() => setState(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          rows.forEach(r => {
            const id = uuidv4();
            next.players[id] = { id, name: r.name || r.Name || r.NAME || 'Unnamed', notes: r.notes || r.notes || '' };
            next.availableOrder.unshift(id);
          });
          return next;
        }));
      }
    });
  }

  function importCSVText(text) {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const rows = results.data;
        snapshotAnd(() => setState(prev => {
          const next = JSON.parse(JSON.stringify(prev));
          rows.forEach(r => {
            const id = uuidv4();
            next.players[id] = { id, name: r.name || r.Name || r.NAME || 'Unnamed', notes: r.notes || r.Notes || r.NOTES || '' };
            next.availableOrder.unshift(id);
          });
          return next;
        }));
      }
    });
  }

  function exportCSV() {
    const rows = [];
    const add = (id, bucket, pos) => {
      const p = state.players[id];
      rows.push({ id, name: p.name, notes: p.notes, bucket, position: pos });
    };
    state.availableOrder.forEach((id, i) => add(id, 'available', i));
    Object.entries(state.buckets).forEach(([k, list]) => list.forEach((id, i) => add(id, k, i)));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'draft_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPNG() {
    if (!boardRef.current) return;
    const node = boardRef.current;
    try {
      const dataUrl = await toPng(node, { cacheBust: true, filter: (n) => true });
      const link = document.createElement('a');
      link.download = 'draft_board.png';
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Export PNG error', e);
    }
  }

  async function exportPDF() {
    if (!boardRef.current) return;
    try {
      const dataUrl = await toPng(boardRef.current, { cacheBust: true });
      const pdf = new jsPDF({ orientation: 'landscape' });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('draft_board.pdf');
    } catch (e) {
      console.error('Export PDF error', e);
    }
  }

  const filtered = useMemo(() => {
    if (!query) return state;
    const q = query.toLowerCase();
    const players = Object.fromEntries(Object.entries(state.players).filter(([id, p]) => (p.name + ' ' + (p.notes||'')).toLowerCase().includes(q)));
    const availableOrder = state.availableOrder.filter(id => players[id]);
    const buckets = {
      yes: state.buckets.yes.filter(id => players[id]),
      maybe: state.buckets.maybe.filter(id => players[id]),
      no: state.buckets.no.filter(id => players[id]),
    };
    return { players, availableOrder, buckets };
  }, [state, query]);

  const counts = useMemo(() => ({
    available: state.availableOrder.length,
    yes: state.buckets.yes.length,
    maybe: state.buckets.maybe.length,
    no: state.buckets.no.length,
  }), [state]);

  function handleEdit(player) {
    const name = prompt('Name', player.name);
    if (name === null) return;
    const notes = prompt('Notes', player.notes || '') ?? '';
    editPlayer({ ...player, name, notes });
  }

  function handleRemove(id) {
    if (state.availableOrder.includes(id)) {
      removePlayer(id);
    } else {
      sendToAvailable(id);
    }
  }

  function getFullList(currState, listName) {
    return listName === 'available' ? currState.availableOrder : currState.buckets[listName];
  }

  function setFullList(nextState, listName, arr) {
    if (listName === 'available') nextState.availableOrder = arr;
    else nextState.buckets[listName] = arr;
  }

  function getDisplayedList(listName) {
    return listName === 'available' ? filtered.availableOrder : filtered.buckets[listName];
  }

  function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const fromList = source.droppableId;
    const toList = destination.droppableId;

    snapshotAnd(() => setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));

      const fromArrFull = getFullList(prev, fromList);
      const toArrFullBefore = fromList === toList ? fromArrFull.filter(id => id !== draggableId) : getFullList(prev, toList).slice();

      const displayedDest = getDisplayedList(toList);
      const displayedDestWithoutDragged = fromList === toList ? displayedDest.filter(id => id !== draggableId) : displayedDest;
      const anchorId = displayedDestWithoutDragged[destination.index];

      const insertIndex = anchorId ? toArrFullBefore.indexOf(anchorId) : toArrFullBefore.length;

      if (fromList === toList) {
        const arr = toArrFullBefore.slice();
        arr.splice(insertIndex, 0, draggableId);
        setFullList(next, fromList, arr);
      } else {
        const newFrom = fromArrFull.filter(id => id !== draggableId);
        setFullList(next, fromList, newFrom);
        const newTo = toArrFullBefore.slice();
        newTo.splice(insertIndex, 0, draggableId);
        setFullList(next, toList, newTo);
      }

      return next;
    }));
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto p-4">
        <header className="mb-6">
          <div className="relative overflow-hidden rounded-2xl p-[1px] bg-gradient-to-r from-brand-500 via-accent-400 to-emerald-400">
            <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md px-4 py-3 flex items-center justify-between ring-1 ring-slate-200/60 dark:ring-white/10">
              <h1 className="text-xl font-extrabold bg-gradient-to-r from-brand-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">Squad Draft — Prototype</h1>
              <div className="flex flex-wrap items-center gap-2">
                <input className="px-3 py-2 rounded-full border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder="Search across lists" value={query} onChange={e => setQuery(e.target.value)} />
                <button className="px-3 py-2 rounded-full bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 shadow-sm transition" onClick={() => setShowAddModal(true)}>Add</button>
                <button className="px-3 py-2 rounded-full bg-accent-600 text-white hover:bg-accent-500 active:bg-accent-700 shadow-sm transition" onClick={() => setShowImportModal(true)}>Import CSV</button>
                <div className="border-l border-slate-200/60 dark:border-white/10 pl-2 flex gap-2">
                  <button className="px-3 py-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition" onClick={exportCSV}>Export CSV</button>
                  <button className="px-3 py-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition" onClick={exportPNG}>Export PNG</button>
                  <button className="px-3 py-2 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition" onClick={exportPDF}>Export PDF</button>
                </div>
                <button onClick={undo} disabled={!lastSnapshot} className={`px-3 py-2 rounded-full shadow-sm transition ${lastSnapshot ? 'bg-yellow-500 text-white hover:bg-yellow-400' : 'opacity-50 bg-slate-200 text-slate-500'}`}>Undo</button>
                <button onClick={() => setDark(d => !d)} className="px-3 py-2 rounded-full bg-slate-200/70 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 transition">{dark ? 'Light' : 'Dark'}</button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex gap-4">
          <div className="flex-1">
            <DragDropContext onDragEnd={onDragEnd}>
              <div ref={boardRef} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Available</h3>
                      <div className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{filtered.availableOrder.length}</div>
                    </div>
                    <Droppable droppableId="available" direction="vertical" type="PLAYER">
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-[56vh]">
                          {filtered.availableOrder.map((id, index) => (
                            <PlayerCard key={id} id={id} index={index} player={filtered.players[id]} onEdit={handleEdit} onRemove={handleRemove} />
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>

                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Column droppableId="yes" title="YES" itemIds={filtered.buckets.yes} playersMap={filtered.players} onEdit={handleEdit} onRemove={handleRemove} />
                  <Column droppableId="maybe" title="MAYBE" itemIds={filtered.buckets.maybe} playersMap={filtered.players} onEdit={handleEdit} onRemove={handleRemove} />
                  <Column droppableId="no" title="NO" itemIds={filtered.buckets.no} playersMap={filtered.players} onEdit={handleEdit} onRemove={handleRemove} />
                </div>
              </div>
            </DragDropContext>
          </div>

          {/*
          <aside className="w-64 hidden md:block">
            <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 shadow-sm ring-1 ring-slate-200/60 dark:ring-white/10">
              <h4 className="font-semibold mb-3 text-slate-700 dark:text-slate-200">Analytics</h4>
              <div className="text-sm flex items-center justify-between py-1"><span>Available</span><span className="text-slate-500 dark:text-slate-400">{counts.available}</span></div>
              <div className="text-sm flex items-center justify-between py-1"><span className="text-emerald-700 dark:text-emerald-300">YES</span><span className="text-slate-500 dark:text-slate-400">{counts.yes}</span></div>
              <div className="text-sm flex items-center justify-between py-1"><span className="text-amber-700 dark:text-amber-300">MAYBE</span><span className="text-slate-500 dark:text-slate-400">{counts.maybe}</span></div>
              <div className="text-sm flex items-center justify-between py-1"><span className="text-rose-700 dark:text-rose-300">NO</span><span className="text-slate-500 dark:text-slate-400">{counts.no}</span></div>
            </div>
          </aside>
          */}
        </main>

        <AddPlayerModal
          open={showAddModal}
          onCancel={() => setShowAddModal(false)}
          onSubmit={({ name, notes }) => { setShowAddModal(false); addPlayer(name, notes); }}
        />

        <ImportCSVModal
          open={showImportModal}
          onCancel={() => setShowImportModal(false)}
          onImport={(text) => { setShowImportModal(false); importCSVText(text); }}
        />

      </div>
    </div>
  );
}
