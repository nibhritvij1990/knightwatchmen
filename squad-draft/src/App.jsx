/* Squad Draft App - Prototype (App.jsx) */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, PencilSquareIcon, TrashIcon, ArrowUturnLeftIcon, ArrowLeftIcon, HomeIcon, SunIcon, MoonIcon, PlusIcon, CheckIcon, QuestionMarkCircleIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { ensureValidRoot, addTournament, addDraft, addDraftWithBoard, renameTournament, renameDraft, deleteTournament, deleteDraft, duplicateDraft, duplicateTournament, moveDraft, normalizeBoardState } from './lib/storage';
import { useRootStorage } from './hooks/useRootStorage';

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

function EditPlayerModal({ open, onCancel, onSubmit, player }) {
  const [name, setName] = useState(player?.name || '');
  const [notes, setNotes] = useState(player?.notes || '');

  useEffect(() => {
    if (open) {
      setName(player?.name || '');
      setNotes(player?.notes || '');
    }
  }, [open, player]);

  const disabled = !name.trim();

  return (
    <ModalShell open={open} title="Edit Player" onClose={onCancel}>
      <form onSubmit={(e) => { e.preventDefault(); if (disabled || !player) return; onSubmit({ ...player, name: name.trim(), notes: notes.trim() }); }} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="w-full px-3 py-2 rounded-lg border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded-full bg-slate-200/70 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
          <button type="submit" disabled={disabled} className={`px-3 py-2 rounded-full transition ${disabled ? 'opacity-50 bg-brand-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700'}`}>Save</button>
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

function ImportJSONModal({ open, onCancel, onImport, onImportAsNew }) {
  const [text, setText] = useState('');
  useEffect(() => { if (open) setText(''); }, [open]);
  return (
    <ModalShell open={open} title="Import Board from JSON" onClose={onCancel}>
      <div className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">Paste a full board export (JSON).</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="w-full px-3 py-2 rounded-lg border border-slate-200/70 dark:border-white/10 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400" placeholder='{"players": {"id": {"id":"id","name":"Alice"}}, "availableOrder": ["id"], "buckets": {"yes":[],"maybe":[],"no":[]}}' />
        <div className="flex justify-between items-center gap-2 pt-1">
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded-full bg-slate-200/70 dark:bg-slate-800/70 hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
          <div className="flex gap-2">
            <button type="button" onClick={() => onImport(text)} disabled={!text.trim()} className={`px-3 py-2 rounded-full transition ${!text.trim() ? 'opacity-50 bg-brand-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700'}`}>Replace current</button>
            <button type="button" onClick={() => onImportAsNew(text)} disabled={!text.trim()} className={`px-3 py-2 rounded-full transition ${!text.trim() ? 'opacity-50 bg-accent-600 text-white' : 'bg-accent-600 text-white hover:bg-accent-500 active:bg-accent-700'}`}>Add as new draft</button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function PlayerCard({ id, player, index, onEdit, onRemove, isInAvailable, onAssign, listId }) {
  const [isHovering, setIsHovering] = useState(false);
  const [showNameTooltip, setShowNameTooltip] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const nameContainerRef = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!showNameTooltip) return;
    function onDocMouseDown(e) {
      if (nameContainerRef.current && !nameContainerRef.current.contains(e.target)) {
        setShowNameTooltip(false);
      }
    }
    function onWinKeyDown(e) {
      if (e.key === 'Escape') setShowNameTooltip(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onWinKeyDown);
    const timer = setTimeout(() => setShowNameTooltip(false), 3000);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onWinKeyDown);
      clearTimeout(timer);
    };
  }, [showNameTooltip]);

  useEffect(() => {
    if (!showMenu) return;
    function onDocMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    function onWinKeyDown(e) { if (e.key === 'Escape') setShowMenu(false); }
    document.addEventListener('mousedown', onDocMouseDown);
    window.addEventListener('keydown', onWinKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onWinKeyDown);
    };
  }, [showMenu]);
  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => {
        const isActive = isHovering || snapshot.isDragging;
        const activeRing = isActive ? 'ring-2 ring-brand-400 dark:ring-brand-300 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : '';
        const stripeColor = listId==='yes' ? '#34d399' : listId==='maybe' ? '#fbbf24' : listId==='no' ? '#f87171' : '#cbd5e1';
        const wrapperZ = showMenu ? 'z-[60]' : (isActive ? 'z-40' : 'z-10');
        const card = (
          <div ref={provided.innerRef} className={`relative ${wrapperZ} rounded-xl ${activeRing} mb-2 md:mb-2.5`} style={provided.draggableProps.style}>
            <motion.div
              {...provided.draggableProps}
              {...provided.dragHandleProps}
              initial={false}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              style={{ backgroundImage: `linear-gradient(to right, ${stripeColor} 0, ${stripeColor} 4px, transparent 4px)` }}
              className={`relative z-10 select-none cursor-grab active:cursor-grabbing bg-white/80 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 backdrop-blur-md rounded-xl shadow-sm hover:shadow-md pl-3 pr-3 py-2.5 md:py-2 flex justify-between items-start transition duration-300 ease-out hover:-translate-y-0.5`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div ref={nameContainerRef} className="relative">
                  <div
                    className="truncate font-semibold text-sm text-slate-800 dark:text-slate-100"
                    title={player?.name}
                    aria-label={player?.name}
                    onClick={() => setShowNameTooltip(v => !v)}
                  >
                    {player?.name}
                  </div>
                  {showNameTooltip && (
                    <div role="tooltip" className="absolute left-0 top-full mt-1 z-50 px-2 py-1 rounded-md bg-slate-900 text-white text-xs shadow-lg whitespace-nowrap max-w-none">
                      {player?.name}
                    </div>
                  )}
                </div>
                {player?.notes && <div className="truncate text-xs text-slate-500 dark:text-slate-400" title={player?.notes} aria-label={player?.notes}>{player.notes}</div>}
              </div>
              <div className="pc-right ml-2 flex items-center gap-2 shrink-0 relative">
                {/* Quick assign buttons with container query-aware classes */}
                <div className="pc-actions flex items-center gap-1">
                  <button type="button" title="Move to YES" aria-label="Move to YES" className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition focus-ring dark:bg-emerald-400/15 dark:text-emerald-300 dark:hover:bg-emerald-400/25" onClick={() => onAssign && onAssign(player.id, 'yes')}>
                    <CheckIcon className="w-4 h-4" />
                  </button>
                  <button type="button" title="Move to MAYBE" aria-label="Move to MAYBE" className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition focus-ring dark:bg-amber-400/15 dark:text-amber-300 dark:hover:bg-amber-400/25" onClick={() => onAssign && onAssign(player.id, 'maybe')}>
                    <QuestionMarkCircleIcon className="w-4 h-4" />
                  </button>
                  <button type="button" title="Move to NO" aria-label="Move to NO" className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 transition focus-ring dark:bg-rose-400/15 dark:text-rose-300 dark:hover:bg-rose-400/25" onClick={() => onAssign && onAssign(player.id, 'no')}>
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
                <button type="button" className="pc-kebab h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition focus-ring dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20" title="More" aria-label="More actions" aria-haspopup="menu" aria-expanded={showMenu ? 'true' : 'false'} onClick={() => setShowMenu(v => !v)}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
                </button>
                {showMenu && (
                  <div ref={menuRef} role="menu" className="absolute right-0 top-9 z-[80] rounded-2xl bg-white/95 dark:bg-slate-800/95 ring-1 ring-slate-200/70 dark:ring-white/10 shadow-xl px-2 py-1 flex items-center gap-1">
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onAssign && onAssign(player.id, 'yes'); }} title="Move to YES" aria-label="Move to YES">
                      <CheckIcon className="w-5 h-5 text-emerald-600" />
                    </button>
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onAssign && onAssign(player.id, 'maybe'); }} title="Move to MAYBE" aria-label="Move to MAYBE">
                      <QuestionMarkCircleIcon className="w-5 h-5 text-amber-600" />
                    </button>
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onAssign && onAssign(player.id, 'no'); }} title="Move to NO" aria-label="Move to NO">
                      <XMarkIcon className="w-5 h-5 text-rose-600" />
                    </button>
                    <div className="mx-1 h-5 w-px bg-slate-200/70 dark:bg-white/10" />
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onEdit && onEdit(player); }} title="Edit" aria-label="Edit">
                      <PencilSquareIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    {isInAvailable ? (
                      <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onRemove && onRemove(player.id); }} title="Delete" aria-label="Delete">
                        <TrashIcon className="w-5 h-5 text-rose-600" />
                      </button>
                    ) : (
                      <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onRemove && onRemove(player.id); }} title="Send to Available" aria-label="Send to Available">
                        <ArrowUturnLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      </button>
                    )}
                  </div>
                )}
                <button type="button" onClick={() => onEdit(player)} title="Edit" aria-label="Edit" className="pc-actions h-8 w-8 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition focus-ring dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20">
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
                {isInAvailable ? (
                  <button type="button" onClick={() => onRemove(player.id)} title="Delete player" aria-label="Delete player" className="pc-actions h-8 w-8 inline-flex items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 transition focus-ring">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button type="button" onClick={() => onRemove(player.id)} title="Send to Available" aria-label="Send to Available" className="pc-actions h-8 w-8 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition focus-ring dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20">
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        );
        return snapshot.isDragging ? createPortal(card, document.body) : card;
      }}
    </Draggable>
  );
}

function Column({ droppableId, title, itemIds, playersMap, onEdit, onRemove, onAssign, getHighlightClass, onTitleChange, bump, pulse }) {
  const titleColor =
    droppableId === 'yes' ? 'text-emerald-700 dark:text-emerald-300' :
    droppableId === 'maybe' ? 'text-amber-700 dark:text-amber-300' :
    droppableId === 'no' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200';
  const badgeBg =
    droppableId === 'yes' ? 'bg-emerald-100 text-emerald-700 dark:bg-white/10 dark:text-emerald-300' :
    droppableId === 'maybe' ? 'bg-amber-100 text-amber-700 dark:bg-white/10 dark:text-amber-300' :
    droppableId === 'no' ? 'bg-rose-100 text-rose-700 dark:bg-white/10 dark:text-rose-300' : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200';
  const colorHex =
    droppableId === 'yes' ? '#10B981' :
    droppableId === 'maybe' ? '#F59E0B' :
    droppableId === 'no' ? '#EF4444' : '#FFFFFF';
  const containerGradient = `linear-gradient(135deg, ${colorHex}26 0%, ${colorHex}00 50%, ${colorHex}00 100%)`;
  const ringClass =
    droppableId === 'yes' ? 'ring-emerald-500/50' :
    droppableId === 'maybe' ? 'ring-amber-500/50' :
    droppableId === 'no' ? 'ring-rose-500/50' : 'ring-[#888888]';

  const [isEditing, setIsEditing] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState(title);
  React.useEffect(() => { setDraftTitle(title); }, [title]);
  function commit() { setIsEditing(false); if (draftTitle !== title) onTitleChange?.(droppableId, draftTitle); }

  return (
    <div className={`min-w-[200px] backdrop-blur-md rounded-2xl p-4 ring-1 ${ringClass} shadow-sm hover:shadow-md transition ${pulse ? 'shimmer-border' : ''}`}
         style={{ backgroundImage: containerGradient }}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              className={`text-base md:text-lg font-extrabold tracking-wide bg-transparent border-b border-slate-300/60 dark:border-white/20 focus:outline-none ${titleColor}`}
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setIsEditing(false); setDraftTitle(title); } }}
              autoFocus
            />
          ) : (
            <h3 className={`text-base md:text-lg font-extrabold tracking-wide title-underline ${isEditing ? 'is-editing' : ''} ${titleColor}`}>{title}</h3>
          )}
          <button type="button" className="p-1 rounded-md text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10" title="Edit title" aria-label="Edit title" onClick={() => setIsEditing(v => !v)}>
            <PencilSquareIcon className="w-4 h-4" />
          </button>
        </div>
        <div className={`text-xs px-2 py-0.5 rounded-full ${badgeBg} ${bump ? 'count-bump' : ''}`}>{itemIds.length}</div>
      </div>
      <Droppable droppableId={droppableId} direction="vertical" type="PLAYER">
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className={`cq-list min-h-[200px] rounded-xl transition ring-offset-1 scroll-fade py-3 ${getHighlightClass(droppableId, snapshot.isDraggingOver)}`}
               style={snapshot.isDraggingOver ? { outline: '2px dotted currentColor', outlineOffset: '2px' } : undefined}>
            {itemIds.map((id, index) => (
              <PlayerCard key={id} id={id} index={index} player={playersMap[id]} onEdit={onEdit} onRemove={onRemove} onAssign={onAssign} isInAvailable={false} listId={droppableId} />
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
    titles: { available: 'Available', yes: 'YES', maybe: 'MAYBE', no: 'NO' },
  };
}

function normalizeState(s) {
  const next = JSON.parse(JSON.stringify(s));
  if (!next.titles) next.titles = { available: 'Available', yes: 'YES', maybe: 'MAYBE', no: 'NO' };
  if (!next.titles.available) next.titles.available = 'Available';
  if (!next.titles.yes) next.titles.yes = 'YES';
  if (!next.titles.maybe) next.titles.maybe = 'MAYBE';
  if (!next.titles.no) next.titles.no = 'NO';
  return next;
}

export default function App() {
  // Root (v2) state
  const [root, setRoot] = useRootStorage();
  // Selected draft derived from root
  const currentDraftId = root.ui.currentDraftId;
  const currentDraft = root.drafts[currentDraftId];

  const [state, setState] = useState(() => normalizeBoardState(currentDraft));
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [query, setQuery] = useState('');
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('squad_dark');
    if (saved === '1') return true;
    if (saved === '0') return false;
    return true; // default to dark when no saved preference
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportJSON, setShowImportJSON] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const boardRef = useRef(null);
  const searchRef = useRef(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef(null);
  const liveRef = useRef(null);
  const draggingRef = useRef(false);
  function announce(msg) {
    if (liveRef.current) liveRef.current.textContent = msg;
  }

  // Tournament/Draft menus
  const [showTournamentMenu, setShowTournamentMenu] = useState(false);
  const [showDraftMenu, setShowDraftMenu] = useState(false);
  const tournamentMenuRef = useRef(null);
  const draftMenuRef = useRef(null);
  const [showJSONMenu, setShowJSONMenu] = useState(false);
  const jsonMenuRef = useRef(null);

  const [orgUndo, setOrgUndo] = useState(null); // { snapshot, label }
  function applyOrg(label, mutator) {
    setRoot(prev => {
      const snapshot = JSON.parse(JSON.stringify(prev));
      const next = mutator(prev);
      setOrgUndo({ snapshot, label });
      return next;
    });
  }
  function undoOrg() {
    if (!orgUndo) return;
    setRoot(orgUndo.snapshot);
    setOrgUndo(null);
  }

  const activeTournament = root.tournaments[root.ui.currentTournamentId];
  const activeDraft = root.drafts[root.ui.currentDraftId];

  function selectTournament(id) {
    setRoot(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.tournaments[id]) return next;
      next.ui.currentTournamentId = id;
      const t = next.tournaments[id];
      const firstDraft = (t.draftIds && t.draftIds[0]) || Object.keys(next.drafts).find(did => next.drafts[did].tournamentId === id);
      if (firstDraft) next.ui.currentDraftId = firstDraft;
      return ensureValidRoot(next);
    });
  }

  function selectDraft(id) {
    setRoot(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.drafts[id]) return next;
      next.ui.currentDraftId = id;
      next.ui.currentTournamentId = next.drafts[id].tournamentId;
      return ensureValidRoot(next);
    });
  }

  function promptRenameTournament() {
    const currentName = activeTournament?.name || '';
    const name = window.prompt('Rename tournament', currentName);
    if (!name) return;
    applyOrg('Renamed tournament', prev => renameTournament(prev, activeTournament.id, name.trim()));
  }

  function promptRenameDraft() {
    const currentName = activeDraft?.name || '';
    const name = window.prompt('Rename draft', currentName);
    if (!name) return;
    applyOrg('Renamed draft', prev => renameDraft(prev, activeDraft.id, name.trim()));
  }

  function createTournamentAction() { applyOrg('Created tournament', prev => addTournament(prev)); }
  function createDraftAction() { applyOrg('Created draft', prev => addDraft(prev, activeTournament.id)); }
  function duplicateTournamentAction() { applyOrg('Duplicated tournament', prev => duplicateTournament(prev, activeTournament.id)); }
  function duplicateDraftAction() { applyOrg('Duplicated draft', prev => duplicateDraft(prev, activeDraft.id)); }
  function deleteTournamentAction() {
    if (!confirm(`Delete tournament "${activeTournament?.name}" and all its drafts?`)) return;
    applyOrg('Deleted tournament', prev => deleteTournament(prev, activeTournament.id));
  }
  function deleteDraftAction() {
    if (!confirm(`Delete draft "${activeDraft?.name}"?`)) return;
    applyOrg('Deleted draft', prev => deleteDraft(prev, activeDraft.id));
  }
  function moveDraftTo(tid) { applyOrg('Moved draft', prev => moveDraft(prev, activeDraft.id, tid)); }

  // Close menus on outside click/escape
  useEffect(() => {
    function onDoc(e) {
      if (showTournamentMenu && tournamentMenuRef.current && !tournamentMenuRef.current.contains(e.target)) setShowTournamentMenu(false);
      if (showDraftMenu && draftMenuRef.current && !draftMenuRef.current.contains(e.target)) setShowDraftMenu(false);
      if (showExportMenu && exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setShowExportMenu(false);
      if (showJSONMenu && jsonMenuRef.current && !jsonMenuRef.current.contains(e.target)) setShowJSONMenu(false);
    }
    function onKey(e) { if (e.key === 'Escape') { setShowTournamentMenu(false); setShowDraftMenu(false); setShowExportMenu(false); setShowJSONMenu(false); } }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey); };
  }, [showTournamentMenu, showDraftMenu, showExportMenu, showJSONMenu]);

  function sanitizeName(s) { return (s || '').replace(/[/\\?%*:|"<>]/g, '_'); }

  const [isEditingAvailable, setIsEditingAvailable] = useState(false);
  const [draftAvailableTitle, setDraftAvailableTitle] = useState('Available');
  useEffect(() => { setDraftAvailableTitle(state.titles.available || 'Available'); }, [state.titles?.available]);
  function commitAvailable() {
    setIsEditingAvailable(false);
    if ((draftAvailableTitle || '').trim() !== (state.titles.available || 'Available')) {
      updateTitle('available', draftAvailableTitle);
      setPulseAvailable(true);
    }
  }
  const [pulseAvailable, setPulseAvailable] = useState(true); // Set to true initially
  useEffect(() => { const t = setTimeout(() => setPulseAvailable(false), 950); return () => clearTimeout(t); }, [pulseAvailable]);
  const [pulseYes, setPulseYes] = useState(true);
  const [pulseMaybe, setPulseMaybe] = useState(true);
  const [pulseNo, setPulseNo] = useState(true);
  useEffect(() => { const t = setTimeout(() => { setPulseYes(false); setPulseMaybe(false); setPulseNo(false); }, 1000); return () => clearTimeout(t); }, []);

  // Sync board state when switching drafts
  useEffect(() => {
    setState(normalizeBoardState(root.drafts[root.ui.currentDraftId]));
    setIsEditingAvailable(false);
  }, [root.ui.currentDraftId]);

  // Helper: write local board state back into root under current draft
  function writeBoard(updater) {
    setRoot(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const did = next.ui.currentDraftId;
      const curr = next.drafts[did];
      const updated = typeof updater === 'function' ? updater(curr) : updater;
      next.drafts[did] = normalizeBoardState(updated);
      next.drafts[did].updatedAt = Date.now();
      return ensureValidRoot(next);
    });
  }

  // Persist local board state changes into root
  useEffect(() => {
    if (!currentDraft) return;
    writeBoard(state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('squad_dark', dark ? '1' : '0');
  }, [dark]);

  // Root persistence handled in useRootStorage hook

  useEffect(() => {
    function onKeyDown(e) {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (meta && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
        return;
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo]);

  useEffect(() => {
    function onDocumentMouseDown(e) {
      if (!showExportMenu) return;
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    }
    function onWindowKeyDown(e) {
      if (e.key === 'Escape') setShowExportMenu(false);
    }
    document.addEventListener('mousedown', onDocumentMouseDown);
    window.addEventListener('keydown', onWindowKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown);
      window.removeEventListener('keydown', onWindowKeyDown);
    };
  }, [showExportMenu]);

  function snapshotAnd(fn) {
    setLastSnapshot(JSON.parse(JSON.stringify(state)));
    fn();
  }

  function clearAll() {
    if (!confirm('Clear all players and draft lists? This cannot be undone.')) return;
    setLastSnapshot(null);
    setState({ players: {}, availableOrder: [], buckets: { yes: [], maybe: [], no: [] }, titles: { available: 'Available', yes: 'YES', maybe: 'MAYBE', no: 'NO' } });
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
    const p = state.players[id];
    if (p) announce(`${p.name} moved to Available`);
  }

  function assignToBucket(id, bucket) {
    if (!['yes', 'maybe', 'no'].includes(bucket)) return;
    snapshotAnd(() => setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      // Remove from all lists
      next.availableOrder = next.availableOrder.filter(x => x !== id);
      next.buckets.yes = next.buckets.yes.filter(x => x !== id);
      next.buckets.maybe = next.buckets.maybe.filter(x => x !== id);
      next.buckets.no = next.buckets.no.filter(x => x !== id);
      // Add to target bucket at the top
      next.buckets[bucket].unshift(id);
      return next;
    }));
    const p = state.players[id];
    if (p) announce(`${p.name} moved to ${bucket.toUpperCase()}`);
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
    const tName = sanitizeName(activeTournament?.name || 'Tournament');
    const dName = sanitizeName(activeDraft?.name || 'Draft');
    a.download = `${tName} - ${dName} - draft_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPNG() {
    if (!boardRef.current) return;
    const node = boardRef.current;
    const rootEl = document.documentElement;
    const isDark = rootEl.classList.contains('dark');
    const prevHidden = document.body.classList.contains('exporting');
    try {
      document.body.classList.add('exporting');
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: isDark ? '#0a0d16' : '#ffffff',
      });
      const link = document.createElement('a');
      const tName = sanitizeName(activeTournament?.name || 'Tournament');
      const dName = sanitizeName(activeDraft?.name || 'Draft');
      link.download = `${tName} - ${dName} - draft_board.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Export PNG error', e);
    } finally {
      if (!prevHidden) document.body.classList.remove('exporting');
    }
  }

  async function exportPDF() {
    if (!boardRef.current) return;
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const prevHidden = document.body.classList.contains('exporting');
    try {
      document.body.classList.add('exporting');
      const dataUrl = await toPng(boardRef.current, {
        cacheBust: true,
        backgroundColor: isDark ? '#0a0d16' : '#ffffff',
      });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt' });
      const imgProps = pdf.getImageProperties(dataUrl);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24; // narrow margins in points (~1/3 inch)
      const availableWidth = pageWidth - margin * 2;
      const scaledHeight = (imgProps.height * availableWidth) / imgProps.width;
      const y = Math.max(margin, (pageHeight - scaledHeight) / 2);
      // Fill page background explicitly (for dark theme especially)
      pdf.setFillColor(isDark ? 10 : 255, isDark ? 13 : 255, isDark ? 22 : 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.addImage(dataUrl, 'PNG', margin, y, availableWidth, scaledHeight);
      const tName = sanitizeName(activeTournament?.name || 'Tournament');
      const dName = sanitizeName(activeDraft?.name || 'Draft');
      pdf.save(`${tName} - ${dName} - draft_board.pdf`);
    } catch (e) {
      console.error('Export PDF error', e);
    } finally {
      if (!prevHidden) document.body.classList.remove('exporting');
    }
  }

  function exportJSON() {
    try {
      const json = JSON.stringify(state, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const tName = sanitizeName(activeTournament?.name || 'Tournament');
      const dName = sanitizeName(activeDraft?.name || 'Draft');
      a.download = `${tName} - ${dName} - draft_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export JSON error', e);
    }
  }

  function importJSONText(text, mode = 'replace') {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON');
    if (!parsed.players || !parsed.availableOrder || !parsed.buckets) throw new Error('Missing keys');
    if (!parsed.buckets.yes || !parsed.buckets.maybe || !parsed.buckets.no) throw new Error('Missing bucket lists');
    if (mode === 'replace') {
      snapshotAnd(() => setState(normalizeBoardState(parsed)));
    } else if (mode === 'new-draft') {
      setRoot(prev => addDraftWithBoard(prev, root.ui.currentTournamentId, 'Imported Draft', parsed));
    }
  } catch (e) {
    alert('Invalid JSON format for board.');
    console.error('Import JSON error', e);
  }
}

  function moveItemToEdge(id, edge) {
    const isStart = edge === 'start';
    snapshotAnd(() => setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const lists = [
        ['available', next.availableOrder],
        ['yes', next.buckets.yes],
        ['maybe', next.buckets.maybe],
        ['no', next.buckets.no],
      ];
      for (const [listName, arr] of lists) {
        const idx = arr.indexOf(id);
        if (idx !== -1) {
          arr.splice(idx, 1);
          if (isStart) arr.unshift(id); else arr.push(id);
          announce(`${next.players[id]?.name || 'Player'} moved to ${isStart ? 'start' : 'end'} of ${listName}`);
          break;
        }
      }
      return next;
    }));
  }

  function getHighlightClass(droppableId, isDraggingOver) {
    if (!isDraggingOver) return '';
    return droppableId === 'yes' ? 'ring-2 ring-emerald-400/40' :
           droppableId === 'maybe' ? 'ring-2 ring-amber-400/40' :
           droppableId === 'no' ? 'ring-2 ring-rose-400/40' : 'ring-2 ring-slate-300/40';
  }

  function onDragStart(start) {
    draggingRef.current = true;
    const p = state.players[start.draggableId];
    if (p) announce(`Picked up ${p.name}`);
  }

  function onDragUpdate() {}

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
  const prevCountsRef = useRef(counts);
  useEffect(() => { prevCountsRef.current = counts; }, [counts]);

  function handleEdit(player) {
    setEditingPlayer(player);
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

    draggingRef.current = false;
    const p = state.players[draggableId];
    if (p) announce(`${p.name} moved to ${toList} position ${destination.index + 1}`);
  }

  function updateTitle(listId, value) {
    const newTitle = (value || '').trim() || (listId === 'available' ? 'Available' : listId.toUpperCase());
    snapshotAnd(() => setState(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next.titles[listId] = newTitle;
      return next;
    }));
  }

  function exportTournamentJSON() {
    try {
      const tid = root.ui.currentTournamentId;
      const t = root.tournaments[tid];
      const bundle = {
        version: 2,
        tournament: { id: t.id, name: t.name },
        drafts: (t.draftIds || []).map(did => {
          const d = root.drafts[did];
          if (!d) return null;
          const { id, name, players, availableOrder, buckets, titles } = d;
          return { id, name, players, availableOrder, buckets, titles };
        }).filter(Boolean)
      };
      const json = JSON.stringify(bundle, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const tName = sanitizeName(t?.name || 'Tournament');
      a.download = `${tName} - tournament_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export Tournament JSON error', e);
    }
  }

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 transition-colors">
      <div className="w-full md:w-[80vw] mx-auto p-4 space-y-4">
        {/* Top brand/header bar */}
        <div className="px-0 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-[2px] bg-gradient-to-r from-[var(--accent-start)] via-indigo-500 to-[var(--accent-end)] shadow-[0_0_30px_rgba(124,77,255,0.55)]">
              <div className="rounded-[12px] px-3 py-1.5 bg-gradient-to-r from-[var(--accent-start)] via-indigo-500 to-[var(--accent-end)] ring-1 ring-[#888888]">
                <h1 className="text-2xl md:text-3xl font-semibold tracking-wider text-slate-900">Squad Draft</h1>
              </div>
            </div>
            {/* Moved selectors into main header with labels */}
            <div className="hidden md:flex items-end gap-3 ml-2">
              <div className="flex flex-col items-start">
                <div className="text-[10px] leading-none mb-1 pl-3 tracking-wide text-slate-600 dark:text-slate-400">Tournament:</div>
                <div ref={tournamentMenuRef} className="relative">
                  <button className="px-3 py-2 rounded-full bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition inline-flex items-center gap-2 text-sm focus-ring dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/20" onClick={() => setShowTournamentMenu(v => !v)} aria-haspopup="menu" aria-expanded={showTournamentMenu ? 'true' : 'false'} title="Select tournament" aria-label="Select tournament">
                    <span>{activeTournament?.name || 'Tournament'}</span>
                  </button>
                  {showTournamentMenu && (
                    <div role="menu" className="absolute z-[300] mt-2 w-60 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-lg p-1">
                      {Object.values(root.tournaments).map(t => (
                        <button key={t.id} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowTournamentMenu(false); selectTournament(t.id); }}>{t.name}</button>
                      ))}
                      <div className="my-1 h-px bg-slate-200/60 dark:bg-white/10"></div>
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowTournamentMenu(false); createTournamentAction(); }}>New tournament</button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowTournamentMenu(false); promptRenameTournament(); }}>Rename tournament</button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowTournamentMenu(false); duplicateTournamentAction(); }}>Duplicate tournament</button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30" onClick={() => { setShowTournamentMenu(false); deleteTournamentAction(); }}>Delete tournament</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="text-[10px] leading-none mb-1 pl-3 tracking-wide text-slate-600 dark:text-slate-400">Draft:</div>
                <div ref={draftMenuRef} className="relative">
                  <button className="px-3 py-2 rounded-full bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition inline-flex items-center gap-2 text-sm focus-ring dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/20" onClick={() => setShowDraftMenu(v => !v)} aria-haspopup="menu" aria-expanded={showDraftMenu ? 'true' : 'false'} title="Select draft" aria-label="Select draft">
                    <span>{activeDraft?.name || 'Draft'}</span>
                  </button>
                  {showDraftMenu && (
                    <div role="menu" className="absolute z-[300] mt-2 w-64 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-lg p-1">
                      {(activeTournament?.draftIds || []).map(did => {
                        const d = root.drafts[did];
                        return (
                          <button key={did} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowDraftMenu(false); selectDraft(did); }}>{d?.name || 'Draft'}</button>
                        );
                      })}
                      <div className="my-1 h-px bg-slate-200/60 dark:bg-white/10"></div>
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowDraftMenu(false); createDraftAction(); }}>New draft</button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowDraftMenu(false); promptRenameDraft(); }}>Rename draft</button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowDraftMenu(false); duplicateDraftAction(); }}>Duplicate draft</button>
                      {Object.values(root.tournaments).length > 1 && (
                        <div className="px-3 py-2 text-xs text-slate-500">Move to</div>
                      )}
                      {Object.values(root.tournaments).filter(t => t.id !== activeTournament?.id).map(t => (
                        <button key={t.id} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowDraftMenu(false); moveDraftTo(t.id); }}>→ {t.name}</button>
                      ))}
                      <div className="my-1 h-px bg-slate-200/60 dark:bg-white/10"></div>
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30" onClick={() => { setShowDraftMenu(false); deleteDraftAction(); }}>Delete draft</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full p-[2px] bg-gradient-to-r from-[var(--accent-start)] via-indigo-500 to-[var(--accent-end)] shadow-[0_0_26px_rgba(124,77,255,0.55)]">
              <a href="/" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[var(--accent-start)] via-indigo-500 to-[var(--accent-end)] ring-1 ring-[#888888] text-slate-900 hover:opacity-90 transition focus-ring" title="Home" aria-label="Home">
                <HomeIcon className="w-5 h-5" />
              </a>
            </div>
            <div className="inline-flex rounded-full p-[2px] bg-gradient-to-r from-[var(--accent-start)] via-indigo-500 to-[var(--accent-end)] shadow-[0_0_26px_rgba(124,77,255,0.55)]">
              <button onClick={() => setDark(d => !d)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[var(--accent-start)] via-indigo-500 to-[var(--accent-end)] ring-1 ring-[#888888] text-slate-900 hover:opacity-90 transition focus-ring" title={dark ? 'Switch to light' : 'Switch to dark'} aria-label="Toggle theme">
                {dark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile selectors navbar */}
        <div className="md:hidden relative z-[220] rounded-2xl ring-1 ring-white/10 bg-white/10 backdrop-blur-md px-3 py-2">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col items-start">
              <div className="text-[10px] leading-none mb-1 pl-3 tracking-wide text-slate-600 dark:text-slate-400">Tournament:</div>
              <div ref={tournamentMenuRef} className="relative">
                <button className="px-3 py-2 rounded-full bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition inline-flex items-center gap-2 text-sm focus-ring dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/20" onClick={() => setShowTournamentMenu(v => !v)} aria-haspopup="menu" aria-expanded={showTournamentMenu ? 'true' : 'false'} title="Select tournament" aria-label="Select tournament">
                  <span>{activeTournament?.name || 'Tournament'}</span>
                </button>
                {showTournamentMenu && (
                  <div role="menu" className="absolute z-[300] mt-2 w-60 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-lg p-1">
                    {Object.values(root.tournaments).map(t => (
                      <button key={t.id} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowTournamentMenu(false); selectTournament(t.id); }}>{t.name}</button>
                    ))}
                    <div className="my-1 h-px bg-slate-200/60 dark:bg-white/10"></div>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowTournamentMenu(false); createTournamentAction(); }}>New tournament</button>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowTournamentMenu(false); promptRenameTournament(); }}>Rename tournament</button>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowTournamentMenu(false); duplicateTournamentAction(); }}>Duplicate tournament</button>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30" onClick={() => { setShowTournamentMenu(false); deleteTournamentAction(); }}>Delete tournament</button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start">
              <div className="text-[10px] leading-none mb-1 pl-3 tracking-wide text-slate-600 dark:text-slate-400">Draft:</div>
              <div ref={draftMenuRef} className="relative">
                <button className="px-3 py-2 rounded-full bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition inline-flex items-center gap-2 text-sm focus-ring dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/20" onClick={() => setShowDraftMenu(v => !v)} aria-haspopup="menu" aria-expanded={showDraftMenu ? 'true' : 'false'} title="Select draft" aria-label="Select draft">
                  <span>{activeDraft?.name || 'Draft'}</span>
                </button>
                {showDraftMenu && (
                  <div role="menu" className="absolute z-[300] mt-2 w-64 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-lg p-1">
                    {(activeTournament?.draftIds || []).map(did => {
                      const d = root.drafts[did];
                      return (
                        <button key={did} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowDraftMenu(false); selectDraft(did); }}>{d?.name || 'Draft'}</button>
                      );
                    })}
                    <div className="my-1 h-px bg-slate-200/60 dark:bg-white/10"></div>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowDraftMenu(false); createDraftAction(); }}>New draft</button>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowDraftMenu(false); promptRenameDraft(); }}>Rename draft</button>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowDraftMenu(false); duplicateDraftAction(); }}>Duplicate draft</button>
                    {Object.values(root.tournaments).length > 1 && (
                      <div className="px-3 py-2 text-xs text-slate-500">Move to</div>
                    )}
                    {Object.values(root.tournaments).filter(t => t.id !== activeTournament?.id).map(t => (
                      <button key={t.id} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => { setShowDraftMenu(false); moveDraftTo(t.id); }}>→ {t.name}</button>
                    ))}
                    <div className="my-1 h-px bg-slate-200/60 dark:bg-white/10"></div>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30" onClick={() => { setShowDraftMenu(false); deleteDraftAction(); }}>Delete draft</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Secondary toolbar */}
        <header className="relative z-[200] rounded-2xl ring-1 ring-white/10 bg-white/10 backdrop-blur-md px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Left: Add + Imports */}
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-full bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 shadow-sm transition inline-flex items-center gap-2 text-sm" onClick={() => setShowAddModal(true)} title="Add player" aria-label="Add player"><PlusIcon className="w-5 h-5" /><span>Add</span></button>
              <button className="px-3 py-2 rounded-full bg-accent-600 text-white hover:bg-accent-500 active:bg-accent-700 shadow-sm transition inline-flex items-center gap-2 text-sm" onClick={() => setShowImportModal(true)} title="Import CSV" aria-label="Import CSV"><ArrowUpTrayIcon className="w-5 h-5" /><span>CSV</span></button>
              <button className="px-3 py-2 rounded-full bg-accent-600 text-white hover:bg-accent-500 active:bg-accent-700 shadow-sm transition inline-flex items-center gap-2 text-sm" onClick={() => setShowImportJSON(true)} title="Import JSON" aria-label="Import JSON"><ArrowUpTrayIcon className="w-5 h-5" /><span>JSON</span></button>
            </div>
            {/* Middle: Search */}
            <div className="flex-1 min-w-[200px] flex justify-end min-[1288px]:justify-center" role="search">
              <div className="relative w-full max-w-md">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={searchRef}
                  className="w-full pl-9 pr-3 py-2 rounded-full border border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-800/70 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  placeholder="Search across lists"
                  aria-label="Search across lists"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
            </div>
            {/* Right: Exports + Undo + Clear */}
            <div className="md:ml-auto flex items-center gap-2 flex-wrap relative w-full min-[1288px]:w-auto justify-start min-[1288px]:justify-end">
              {/* Mobile: Export dropdown */}
              <div ref={exportMenuRef} className="relative md:hidden">
                <button
                  className="px-3 py-2 rounded-full bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition inline-flex items-center gap-2 text-sm focus-ring dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/20"
                  onClick={() => setShowExportMenu(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={showExportMenu ? 'true' : 'false'}
                  title="Export"
                  aria-label="Export"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <span>Export</span>
                </button>
                {showExportMenu && (
                  <div role="menu" className="absolute z-[120] mt-2 w-40 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-lg p-1">
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowExportMenu(false); exportCSV(); }} aria-label="Export CSV">CSV</button>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowExportMenu(false); exportPNG(); }} aria-label="Export PNG">PNG</button>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowExportMenu(false); exportPDF(); }} aria-label="Export PDF">PDF</button>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowExportMenu(false); exportJSON(); }} aria-label="Export JSON">Draft JSON</button>
                    <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowExportMenu(false); exportTournamentJSON(); }} aria-label="Export Tournament JSON">Tournament JSON</button>
                  </div>
                )}
              </div>
              {/* Desktop: Export buttons */}
              <div className="hidden md:flex items-center gap-2">
                <button className="px-3 py-2 rounded-full bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition inline-flex items-center gap-2 text-sm focus-ring dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/20" onClick={exportCSV} title="Export CSV" aria-label="Export CSV"><ArrowDownTrayIcon className="w-5 h-5" /><span>CSV</span></button>
                <button className="px-3 py-2 rounded-full bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition inline-flex items-center gap-2 text-sm focus-ring dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/20" onClick={exportPNG} title="Export PNG" aria-label="Export PNG"><ArrowDownTrayIcon className="w-5 h-5" /><span>PNG</span></button>
                <button className="px-3 py-2 rounded-full bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition inline-flex items-center gap-2 text-sm focus-ring dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/20" onClick={exportPDF} title="Export PDF" aria-label="Export PDF"><ArrowDownTrayIcon className="w-5 h-5" /><span>PDF</span></button>
                {/* JSON dropdown (desktop) */}
                <div className="relative" ref={jsonMenuRef}>
                  <button
                    className="px-3 py-2 rounded-full bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition inline-flex items-center gap-2 text-sm focus-ring dark:bg-white/10 dark:text-slate-200 dark:ring-white/10 dark:hover:bg-white/20"
                    onClick={() => setShowJSONMenu(v => !v)}
                    aria-haspopup="menu"
                    aria-expanded={showJSONMenu ? 'true' : 'false'}
                    title="Export JSON"
                    aria-label="Export JSON"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>JSON</span>
                  </button>
                  {showJSONMenu && (
                    <div role="menu" className="absolute z-[200] mt-2 w-44 rounded-xl bg-white dark:bg-slate-800 ring-1 ring-slate-200/60 dark:ring-white/10 shadow-lg p-1">
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowJSONMenu(false); exportJSON(); }} aria-label="Export Draft JSON">Draft</button>
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowJSONMenu(false); exportTournamentJSON(); }} aria-label="Export Tournament JSON">Tournament</button>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={undo} disabled={!lastSnapshot} className={`${lastSnapshot ? 'bg-yellow-500 text-white hover:bg-yellow-400' : 'opacity-50 bg-slate-200 text-slate-500'} px-3 py-2 rounded-full shadow-sm transition inline-flex items-center justify-center focus-ring`} title="Undo" aria-label="Undo">
                <ArrowUturnLeftIcon className="w-5 h-5" />
              </button>
              <button onClick={clearAll} className="px-3 py-2 rounded-full bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 shadow-sm transition text-sm focus-ring" title="Clear Draft" aria-label="Clear Draft">Clear</button>
            </div>
          </div>
        </header>

        <main className="flex gap-4">
          <div className="flex-1">
            <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 noise-overlay rounded-2xl"></div>
                <div className="pointer-events-none absolute inset-0 vignette-overlay rounded-2xl"></div>
                <div ref={boardRef} className="relative grid grid-cols-1 md:grid-cols-2 min-[1200px]:grid-cols-4 gap-4">
                  {/* Available */}
                  <div>
                    <div className={`min-w-[200px] ${pulseAvailable ? 'shimmer-border' : ''} backdrop-blur-md rounded-2xl p-4 ring-1 ring-[#888888] shadow-sm hover:shadow-md transition`}
                         style={{ backgroundImage: 'linear-gradient(135deg, #FFFFFF26 0%, #FFFFFF00 50%, #FFFFFF00 100%)' }}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          {isEditingAvailable ? (
                            <input
                              className="text-base md:text-lg font-extrabold tracking-wide bg-transparent border-b border-slate-300/60 dark:border-white/20 focus:outline-none text-slate-800 dark:text-slate-200"
                              value={draftAvailableTitle}
                              onChange={e => setDraftAvailableTitle(e.target.value)}
                              onBlur={commitAvailable}
                              onKeyDown={e => { if (e.key === 'Enter') commitAvailable(); if (e.key === 'Escape') { setIsEditingAvailable(false); setDraftAvailableTitle(state.titles.available || 'Available'); } }}
                              autoFocus
                            />
                          ) : (
                            <h3 className="text-base md:text-lg font-extrabold tracking-wide text-slate-800 dark:text-slate-200">{state.titles.available}</h3>
                          )}
                          <button type="button" className="p-1 rounded-md text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10" title="Edit title" aria-label="Edit title" onClick={() => setIsEditingAvailable(v => !v)}>
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200">{filtered.availableOrder.length}</div>
                      </div>
                      <Droppable droppableId="available" direction="vertical" type="PLAYER">
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className={`cq-list min-h-[200px] rounded-xl transition ring-offset-1 scroll-fade py-3 ${getHighlightClass('available', snapshot.isDraggingOver)}`}
                               style={snapshot.isDraggingOver ? { outline: '2px dotted currentColor', outlineOffset: '2px' } : undefined}>
                            {filtered.availableOrder.map((id, index) => (
                              <PlayerCard key={id} id={id} index={index} player={filtered.players[id]} onEdit={handleEdit} onRemove={handleRemove} onAssign={assignToBucket} isInAvailable listId="available" />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  </div>

                  {/* YES */}
                  <div>
                    <Column droppableId="yes" title={state.titles.yes} itemIds={filtered.buckets.yes} playersMap={filtered.players} onEdit={handleEdit} onRemove={handleRemove} onAssign={assignToBucket} getHighlightClass={getHighlightClass} onTitleChange={(id, t)=>{updateTitle(id,t); setPulseYes(true);}} bump={pulseYes} pulse={pulseYes} />
                  </div>
                  {/* MAYBE */}
                  <div>
                    <Column droppableId="maybe" title={state.titles.maybe} itemIds={filtered.buckets.maybe} playersMap={filtered.players} onEdit={handleEdit} onRemove={handleRemove} onAssign={assignToBucket} getHighlightClass={getHighlightClass} onTitleChange={(id, t)=>{updateTitle(id,t); setPulseMaybe(true);}} bump={pulseMaybe} pulse={pulseMaybe} />
                  </div>
                  {/* NO */}
                  <div>
                    <Column droppableId="no" title={state.titles.no} itemIds={filtered.buckets.no} playersMap={filtered.players} onEdit={handleEdit} onRemove={handleRemove} onAssign={assignToBucket} getHighlightClass={getHighlightClass} onTitleChange={(id, t)=>{updateTitle(id,t); setPulseNo(true);}} bump={pulseNo} pulse={pulseNo} />
                  </div>
                </div>
              </div>
            </DragDropContext>
          </div>

          {/* Analytics panel intentionally commented out */}
        </main>

        {/* A11y live region */}
        <div ref={liveRef} className="sr-only" aria-live="polite" role="status"></div>

        {/* Org Undo Toast */}
        {orgUndo && (
          <div className="fixed left-4 bottom-4 z-[300] rounded-xl bg-slate-900/90 text-white px-3 py-2 shadow-lg ring-1 ring-white/10 flex items-center gap-3">
            <span className="text-sm">{orgUndo.label}. <span className="opacity-80">Undo?</span></span>
            <button onClick={undoOrg} className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-sm">Undo</button>
            <button onClick={() => setOrgUndo(null)} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-sm">Dismiss</button>
          </div>
        )}

        {/* Modals */}
        <AddPlayerModal
          open={showAddModal}
          onCancel={() => setShowAddModal(false)}
          onSubmit={({ name, notes }) => { setShowAddModal(false); addPlayer(name, notes); }}
        />

        <EditPlayerModal
          open={!!editingPlayer}
          player={editingPlayer}
          onCancel={() => setEditingPlayer(null)}
          onSubmit={(p) => { setEditingPlayer(null); editPlayer(p); }}
        />

        <ImportCSVModal
          open={showImportModal}
          onCancel={() => setShowImportModal(false)}
          onImport={(text) => { setShowImportModal(false); importCSVText(text); }}
        />

        <ImportJSONModal
          open={showImportJSON}
          onCancel={() => setShowImportJSON(false)}
          onImport={(text) => { setShowImportJSON(false); importJSONText(text, 'replace'); }}
          onImportAsNew={(text) => { setShowImportJSON(false); importJSONText(text, 'new-draft'); }}
        />

      </div>
    </div>
  );
}
