import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { PencilSquareIcon, TrashIcon, CheckIcon, QuestionMarkCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { createPortal } from 'react-dom';

function PlayerCard({ id, player, index, onEdit, onRemove, isInAvailable, onAssign, listId, announce }) {
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
    function onWinKeyDown(e) { if (e.key === 'Escape') setShowNameTooltip(false); }
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
    function onDoc(e) { if (showMenu && menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); }
    function onKey(e) { if (e.key === 'Escape') setShowMenu(false); }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey); };
  }, [showMenu]);

  const isActive = isHovering || showMenu;
  const wrapperZ = showMenu ? 'z-[80]' : (isActive ? 'z-40' : 'z-10');
  const stripeColor = listId === 'yes' ? 'rgba(16, 185, 129, 0.9)' : listId === 'maybe' ? 'rgba(245, 158, 11, 0.9)' : listId === 'no' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(125, 211, 252, 0.6)';

  return (
    <Draggable draggableId={id} index={index}>
      {(provided, snapshot) => {
        const card = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`relative ${snapshot.isDragging ? 'z-[200]' : wrapperZ} mb-2 md:mb-2.5`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={provided.draggableProps.style}
          >
            <div className={`absolute inset-0 rounded-xl ring-2 ring-transparent pointer-events-none ${snapshot.isDragging ? 'ring-indigo-400/60' : (isActive ? 'ring-indigo-400/50' : '')}`}></div>
            <motion.div
              style={{ backgroundImage: `linear-gradient(to right, ${stripeColor} 0, ${stripeColor} 4px, transparent 4px)` }}
              className={`relative z-10 select-none cursor-grab active:cursor-grabbing bg-white/80 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10 backdrop-blur-md rounded-xl shadow-sm hover:shadow-md pl-3 pr-3 py-2.5 md:py-2 flex justify-between items-start transition duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/90 dark:hover:bg-white/10 hover:shadow-[0_0_22px_rgba(124,77,255,0.12)] ${snapshot.isDragging ? 'opacity-100' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div ref={nameContainerRef} className="font-medium text-slate-800 dark:text-slate-200 truncate" title={player.name} onClick={() => setShowNameTooltip(true)}>
                  {player.name}
                </div>
                {showNameTooltip && (
                  <div role="tooltip" className="absolute left-0 top-full mt-1 z-50 px-2 py-1 rounded-md bg-slate-900 text-white text-xs shadow-lg whitespace-nowrap max-w-none">
                    {player.name}
                  </div>
                )}
                {player.notes && <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{player.notes}</div>}
              </div>
              <div className="pc-right ml-2 flex items-center gap-2 shrink-0 relative">
                <div className="pc-actions flex items-center gap-1">
                  <button className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition focus-ring dark:bg-emerald-400/15 dark:text-emerald-300 dark:hover:bg-emerald-400/25" title="Move to YES" aria-label="Move to YES" onClick={() => onAssign(id, 'yes')}>
                    <CheckIcon className="w-4 h-4" />
                  </button>
                  <button className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition focus-ring dark:bg-amber-400/15 dark:text-amber-300 dark:hover:bg-amber-400/25" title="Move to MAYBE" aria-label="Move to MAYBE" onClick={() => onAssign(id, 'maybe')}>
                    <QuestionMarkCircleIcon className="w-4 h-4" />
                  </button>
                  <button className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 transition focus-ring dark:bg-rose-400/15 dark:text-rose-300 dark:hover:bg-rose-400/25" title="Move to NO" aria-label="Move to NO" onClick={() => onAssign(id, 'no')}>
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                  <button className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition focus-ring dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20" title="Edit" aria-label="Edit" onClick={() => onEdit(player)}>
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                  <button
                    className={`h-8 w-8 inline-flex items-center justify-center rounded-full transition focus-ring ${isInAvailable ? 'bg-rose-500 text-white hover:bg-rose-400 active:bg-rose-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20'}`}
                    title={isInAvailable ? 'Delete player' : 'Send to Available'}
                    aria-label={isInAvailable ? 'Delete player' : 'Send to Available'}
                    onClick={() => onRemove(id)}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <button type="button" className="pc-kebab h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition focus-ring dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20" title="More" aria-label="More actions" aria-haspopup="menu" aria-expanded={showMenu ? 'true' : 'false'} onClick={() => setShowMenu(v => !v)}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
                </button>
                {showMenu && (
                  <div ref={menuRef} role="menu" className="absolute right-0 top-9 z-[120] rounded-2xl bg-white/95 dark:bg-slate-800/95 ring-1 ring-slate-200/70 dark:ring-white/10 shadow-xl px-2 py-1 flex items-center gap-1">
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onAssign && onAssign(id, 'yes'); }} title="Move to YES" aria-label="Move to YES">
                      <CheckIcon className="w-5 h-5 text-emerald-600" />
                    </button>
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onAssign && onAssign(id, 'maybe'); }} title="Move to MAYBE" aria-label="Move to MAYBE">
                      <QuestionMarkCircleIcon className="w-5 h-5 text-amber-600" />
                    </button>
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onAssign && onAssign(id, 'no'); }} title="Move to NO" aria-label="Move to NO">
                      <XMarkIcon className="w-5 h-5 text-rose-600" />
                    </button>
                    <div className="mx-1 h-5 w-px bg-slate-200/70 dark:bg-white/10" />
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onEdit && onEdit(player); }} title="Edit" aria-label="Edit">
                      <PencilSquareIcon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </button>
                    <button className="h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 focus-ring" onClick={() => { setShowMenu(false); onRemove && onRemove(id); }} title={isInAvailable ? 'Delete player' : 'Send to Available'} aria-label={isInAvailable ? 'Delete player' : 'Send to Available'}>
                      <TrashIcon className={`w-5 h-5 ${isInAvailable ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`} />
                    </button>
                  </div>
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

function Column({ droppableId, title, itemIds, playersMap, onEdit, onRemove, onAssign, onTitleChange, getHighlightClass, bump, pulse, announce }) {
  const titleColor = droppableId === 'yes' ? 'text-emerald-700 dark:text-emerald-300' : droppableId === 'maybe' ? 'text-amber-700 dark:text-amber-300' : droppableId === 'no' ? 'text-rose-700 dark:text-rose-300' : 'text-slate-800 dark:text-slate-200';
  const badgeBg = droppableId === 'yes' ? 'bg-emerald-100 text-emerald-700 dark:bg-white/10 dark:text-emerald-300' : droppableId === 'maybe' ? 'bg-amber-100 text-amber-700 dark:bg-white/10 dark:text-amber-300' : droppableId === 'no' ? 'bg-rose-100 text-rose-700 dark:bg-white/10 dark:text-rose-300' : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200';
  const colorHex = droppableId === 'yes' ? '#10B981' : droppableId === 'maybe' ? '#F59E0B' : droppableId === 'no' ? '#EF4444' : '#FFFFFF';
  const containerGradient = `linear-gradient(135deg, ${colorHex}26 0%, ${colorHex}00 50%, ${colorHex}00 100%)`;
  const ringClass = droppableId === 'yes' ? 'ring-emerald-500/50' : droppableId === 'maybe' ? 'ring-amber-500/50' : droppableId === 'no' ? 'ring-rose-500/50' : 'ring-[#888888]';

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  useEffect(() => { setDraftTitle(title); }, [title]);
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
               style={undefined}>
            {itemIds.map((id, index) => (
              <PlayerCard key={id} id={id} index={index} player={playersMap[id]} onEdit={onEdit} onRemove={onRemove} onAssign={onAssign} isInAvailable={false} listId={droppableId} announce={announce} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default function DraftBoard({ state, query, onEdit, onRemove, onAssign, onUpdateTitle, onDragStart, onDragEnd, announce, boardRef }) {
  const [isEditingAvailable, setIsEditingAvailable] = useState(false);
  const [draftAvailableTitle, setDraftAvailableTitle] = useState(state.titles?.available || 'Available');
  useEffect(() => { setDraftAvailableTitle(state.titles?.available || 'Available'); }, [state.titles?.available]);
  function commitAvailable() {
    setIsEditingAvailable(false);
    const newTitle = (draftAvailableTitle || '').trim() || 'Available';
    if (newTitle !== (state.titles?.available || 'Available')) onUpdateTitle('available', newTitle);
  }

  const [pulseAvailable, setPulseAvailable] = useState(true);
  const [pulseYes, setPulseYes] = useState(true);
  const [pulseMaybe, setPulseMaybe] = useState(true);
  const [pulseNo, setPulseNo] = useState(true);
  useEffect(() => { const t = setTimeout(() => setPulseAvailable(false), 950); return () => clearTimeout(t); }, [state.titles?.available]);
  useEffect(() => { const t = setTimeout(() => { setPulseYes(false); setPulseMaybe(false); setPulseNo(false); }, 1000); return () => clearTimeout(t); }, []);

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
    return { players, availableOrder, buckets, titles: state.titles };
  }, [state, query]);

  function getHighlightClass(droppableId, isDraggingOver) {
    if (!isDraggingOver) return '';
    return droppableId === 'yes'
      ? 'ring-2 ring-emerald-400/30 bg-emerald-50/15'
      : droppableId === 'maybe'
      ? 'ring-2 ring-amber-400/30 bg-amber-50/15'
      : droppableId === 'no'
      ? 'ring-2 ring-rose-400/30 bg-rose-50/15'
      : 'ring-2 ring-slate-300/25 bg-slate-100/10';
  }

  return (
    <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 noise-overlay rounded-2xl"></div>
        <div className="pointer-events-none absolute inset-0 vignette-overlay rounded-2xl"></div>
        <div ref={boardRef} className="relative grid grid-cols-1 md:grid-cols-2 min-[1200px]:grid-cols-4 gap-4">
          {/* Available */}
          <div>
            <div className={`${pulseAvailable ? 'shimmer-border' : ''} min-w-[200px] backdrop-blur-md rounded-2xl p-4 ring-1 ring-[#888888] shadow-sm hover:shadow-md transition`}
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
                       style={undefined}>
                    {filtered.availableOrder.map((id, index) => (
                      <PlayerCard key={id} id={id} index={index} player={filtered.players[id]} onEdit={onEdit} onRemove={onRemove} onAssign={onAssign} isInAvailable listId="available" announce={announce} />
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
          {/* YES */}
          <div>
            <Column droppableId="yes" title={state.titles.yes} itemIds={filtered.buckets.yes} playersMap={filtered.players} onEdit={onEdit} onRemove={onRemove} onAssign={onAssign} onTitleChange={onUpdateTitle} getHighlightClass={getHighlightClass} bump={pulseYes} pulse={pulseYes} announce={announce} />
          </div>
          {/* MAYBE */}
          <div>
            <Column droppableId="maybe" title={state.titles.maybe} itemIds={filtered.buckets.maybe} playersMap={filtered.players} onEdit={onEdit} onRemove={onRemove} onAssign={onAssign} onTitleChange={onUpdateTitle} getHighlightClass={getHighlightClass} bump={pulseMaybe} pulse={pulseMaybe} announce={announce} />
          </div>
          {/* NO */}
          <div>
            <Column droppableId="no" title={state.titles.no} itemIds={filtered.buckets.no} playersMap={filtered.players} onEdit={onEdit} onRemove={onRemove} onAssign={onAssign} onTitleChange={onUpdateTitle} getHighlightClass={getHighlightClass} bump={pulseNo} pulse={pulseNo} announce={announce} />
          </div>
        </div>
      </div>
    </DragDropContext>
  );
} 