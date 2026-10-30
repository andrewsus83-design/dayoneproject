'use client';

import React, { useState } from 'react';
import {
  MessageSquare, Heart, Flag, Trash2, Check, Send, Filter, AlertTriangle, Info,
} from 'lucide-react';

type CommentSubTab = 'wall' | 'moderate' | 'settings';

interface Comment {
  id: string;
  guest: string;
  initials: string;
  message: string;
  time: string;
  approved: boolean;
  flagged: boolean;
  likes: number;
  liked: boolean;
  pinned: boolean;
}

const COMMENT_THEMES = [
  { id: 'dark', label: 'Midnight Dark', bg: '#09090B', text: '#fff', accent: '#C5A059' },
  { id: 'glass', label: 'Glass Panel', bg: 'rgba(18,18,20,0.85)', text: '#fff', accent: '#00F0FF' },
  { id: 'warm', label: 'Warm Ivory', bg: '#FBF8F0', text: '#3D2B1F', accent: '#C5A059' },
  { id: 'neon', label: 'Neon Cyber', bg: '#09090B', text: '#fff', accent: '#00F0FF' },
];

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-6 rounded-2xl border border-dashed border-premium-borderDark bg-premium-surfaceDark text-center text-xs text-zinc-500">
      {text}
    </div>
  );
}

/**
 * Preview only: guests cannot post comments yet, and nothing on this screen is saved or shown to guests.
 * The test box lets the organizer see how the wall and moderation will look.
 */
export function CommentsWall({ isWedding }: { isWedding: boolean }) {
  const [subTab, setSubTab] = useState<CommentSubTab>('wall');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTheme, setCommentTheme] = useState('dark');
  const [requireApproval, setRequireApproval] = useState(true);
  const [profanityFilter, setProfanityFilter] = useState(true);
  const [showGuestNames, setShowGuestNames] = useState(true);
  const [maxChars, setMaxChars] = useState('280');
  const [newMessage, setNewMessage] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'approved' | 'pending' | 'flagged'>('all');

  const approved = comments.filter((c) => c.approved && !c.flagged);
  const pending = comments.filter((c) => !c.approved);
  const flagged = comments.filter((c) => c.flagged);

  const displayed = filterMode === 'approved' ? approved
    : filterMode === 'pending' ? pending
    : filterMode === 'flagged' ? flagged
    : comments;

  function approveComment(id: string) {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, approved: true, flagged: false } : c));
  }
  function removeComment(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }
  function togglePin(id: string) {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, pinned: !c.pinned } : c));
  }
  function toggleLike(id: string) {
    setComments((prev) => prev.map((c) => c.id === id ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c));
  }

  const SUB_TABS: { id: CommentSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'wall', label: 'Comments Wall', icon: MessageSquare },
    { id: 'moderate', label: 'Moderate', icon: Filter },
    { id: 'settings', label: 'Settings', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-premium-gold/10 border border-premium-gold/30">
        <Info className="w-4 h-4 text-premium-gold flex-shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-300 leading-relaxed">
          <strong className="text-premium-gold font-display">Preview.</strong> Guests can&apos;t post comments yet, and nothing on this
          screen is saved or shown to guests. Send a test comment to see how the wall and moderation will work.
        </p>
      </div>

      {/* Sub-tab nav */}
      <div className="flex items-center gap-2 flex-wrap">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold scale-on-click transition-all ${
              subTab === id
                ? 'bg-premium-gold/15 text-premium-gold border border-premium-gold/40'
                : 'bg-premium-surfaceDark text-zinc-400 border border-premium-borderDark hover:text-white'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {id === 'moderate' && pending.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-premium-gold text-black text-[9px] font-bold">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Wall tab — live preview */}
      {subTab === 'wall' && (
        <div className="space-y-4">
          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Comments', value: comments.length, color: 'text-white' },
              { label: 'Approved', value: approved.length, color: 'text-premium-success' },
              { label: 'Pending Review', value: pending.length, color: 'text-premium-warning' },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl bg-premium-charcoal border border-premium-borderDark text-center">
                <div className={`text-2xl font-display font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Comment theme selector */}
          <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Wall Display Theme</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COMMENT_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCommentTheme(t.id)}
                  className={`p-3 rounded-2xl border transition-all scale-on-click ${
                    commentTheme === t.id ? 'border-premium-gold shadow-gold' : 'border-premium-borderDark hover:border-zinc-600'
                  }`}
                  style={{ background: t.bg }}
                >
                  <div className="text-xs font-bold mb-0.5" style={{ color: t.text }}>{t.label}</div>
                  <div className="w-4 h-2 rounded-sm" style={{ background: t.accent }} />
                </button>
              ))}
            </div>
          </div>

          {/* Comments preview */}
          <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Comments ({approved.length})</p>
              {pending.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-premium-warning/20 border border-premium-warning/40 text-premium-warning text-[10px] font-bold">
                  {pending.length} awaiting review
                </span>
              )}
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {approved.length === 0 && <EmptyState text="No comments yet. Send a test comment below to preview the wall." />}
              {[...approved.filter((c) => c.pinned), ...approved.filter((c) => !c.pinned)].map((comment) => (
                <div
                  key={comment.id}
                  className={`flex items-start gap-3 p-4 rounded-2xl border group transition-all ${
                    comment.pinned ? 'border-premium-gold/40 bg-premium-gold/5' : 'border-premium-borderDark bg-premium-surfaceDark'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-premium-gold text-black font-bold text-xs">
                    {comment.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-white">{showGuestNames ? comment.guest : 'Guest'}</span>
                      {comment.pinned && <span className="px-1.5 py-0.5 rounded-md bg-premium-gold/20 text-premium-gold text-[9px] font-bold">PINNED</span>}
                      <span className="text-[10px] text-zinc-600 ml-auto">{comment.time}</span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed">{comment.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button type="button" onClick={() => toggleLike(comment.id)} className={`flex items-center gap-1 text-[10px] scale-on-click ${comment.liked ? 'text-premium-gold' : 'text-zinc-600 hover:text-zinc-400'}`}>
                        <Heart className={`w-3 h-3 ${comment.liked ? 'fill-premium-gold' : ''}`} />
                        {comment.likes}
                      </button>
                      <button type="button" onClick={() => togglePin(comment.id)} className={`text-[10px] scale-on-click ${comment.pinned ? 'text-premium-gold' : 'text-zinc-600 hover:text-zinc-400'}`}>
                        {comment.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button type="button" onClick={() => removeComment(comment.id)} className="text-[10px] text-zinc-600 hover:text-premium-danger scale-on-click ml-auto opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete comment">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Test comment */}
          <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Send Test Comment</p>
            <div className="flex gap-2">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isWedding ? 'Congratulations to the happy couple!' : 'Great keynote today!'}
                className="flex-1 bg-premium-surfaceDark border border-premium-borderDark text-white text-xs px-4 py-2.5 rounded-xl outline-none focus:border-premium-gold placeholder-zinc-600"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newMessage.trim()) return;
                  setComments((prev) => [{
                    id: `c${Date.now()}`,
                    guest: 'Test comment',
                    initials: 'T',
                    message: newMessage,
                    time: 'Just now',
                    approved: !requireApproval,
                    flagged: false,
                    likes: 0,
                    liked: false,
                    pinned: false,
                  }, ...prev]);
                  setNewMessage('');
                }}
                className="px-4 py-2.5 rounded-xl bg-premium-gold hover:bg-premium-goldHover text-black font-display font-bold text-xs scale-on-click shadow-gold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
            {requireApproval && <p className="text-[10px] text-zinc-500">Admin approval is on, so test comments wait in Moderate.</p>}
          </div>
        </div>
      )}

      {/* Moderate tab */}
      {subTab === 'moderate' && (
        <div className="space-y-5">
          {/* Filter buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              ['all', 'All', comments.length],
              ['approved', 'Approved', approved.length],
              ['pending', 'Pending', pending.length],
              ['flagged', 'Flagged', flagged.length],
            ] as const).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilterMode(id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold scale-on-click border transition-all ${
                  filterMode === id ? 'border-premium-gold bg-premium-gold/10 text-premium-gold' : 'border-premium-borderDark text-zinc-400 bg-premium-surfaceDark hover:text-white'
                }`}
              >
                {label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${filterMode === id ? 'bg-premium-gold text-black' : 'bg-premium-borderDark text-zinc-400'}`}>{count}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {displayed.length === 0 && <EmptyState text="Nothing to moderate." />}
            {displayed.map((comment) => (
              <div key={comment.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${
                comment.flagged ? 'border-premium-danger/30 bg-premium-danger/5' : comment.approved ? 'border-premium-borderDark bg-premium-charcoal' : 'border-premium-warning/30 bg-premium-warning/5'
              }`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-premium-gold text-black font-bold text-[10px]">
                  {comment.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-white">{comment.guest}</span>
                    {!comment.approved && <span className="px-1.5 py-0.5 rounded-md bg-premium-warning/20 text-premium-warning text-[9px] font-bold">Pending</span>}
                    {comment.flagged && <span className="px-1.5 py-0.5 rounded-md bg-premium-danger/20 text-premium-danger text-[9px] font-bold">Flagged</span>}
                    <span className="text-[10px] text-zinc-600 ml-auto">{comment.time}</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed mb-2">{comment.message}</p>
                  <div className="flex items-center gap-2">
                    {!comment.approved && (
                      <button type="button" onClick={() => approveComment(comment.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-premium-success/10 border border-premium-success/30 text-premium-success text-[10px] font-bold scale-on-click hover:bg-premium-success/20">
                        <Check className="w-3 h-3" />
                        Approve
                      </button>
                    )}
                    <button type="button" onClick={() => removeComment(comment.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-premium-danger/10 border border-premium-danger/30 text-premium-danger text-[10px] font-bold scale-on-click hover:bg-premium-danger/20">
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                    {comment.approved && !comment.flagged && (
                      <button
                        type="button"
                        onClick={() => setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, flagged: true } : c))}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 text-[10px] font-bold scale-on-click hover:text-white"
                      >
                        <Flag className="w-3 h-3" />
                        Flag
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings tab */}
      {subTab === 'settings' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Comment Wall Settings (preview, not saved)</p>
          <div className="space-y-4">
            {[
              { label: 'Require admin approval', desc: 'Comments appear only after you approve them.', val: requireApproval, set: setRequireApproval },
              { label: 'Profanity filter', desc: 'Flag potentially inappropriate content for review.', val: profanityFilter, set: setProfanityFilter },
              { label: 'Show guest names', desc: 'Display the commenter\'s name on the wall.', val: showGuestNames, set: setShowGuestNames },
            ].map(({ label, desc, val, set }) => (
              <div key={label} className="flex items-center justify-between p-4 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl">
                <div>
                  <div className="text-xs font-bold text-white">{label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{desc}</div>
                </div>
                <button type="button" onClick={() => set(!val)} aria-pressed={val} aria-label={label} className={`w-11 h-6 rounded-full flex-shrink-0 scale-on-click transition-colors ${val ? 'bg-premium-success' : 'bg-premium-borderDark'} flex items-center ${val ? 'justify-end pr-0.5' : 'pl-0.5'}`}>
                  <div className="w-5 h-5 rounded-full bg-white shadow" />
                </button>
              </div>
            ))}
          </div>
          <div className="p-4 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl space-y-2">
            <p className="text-xs font-bold text-white">Max characters per comment</p>
            <div className="flex gap-2">
              {['140', '280', '500'].map((n) => (
                <button key={n} type="button" onClick={() => setMaxChars(n)} className={`flex-1 py-2 rounded-xl text-xs font-bold border scale-on-click transition-all ${maxChars === n ? 'border-premium-gold bg-premium-gold/10 text-premium-gold' : 'border-premium-borderDark text-zinc-500 hover:text-white'}`}>
                  {n} chars
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
