'use client';

import React, { useState } from 'react';
import {
  MessageSquare, Heart, Flag, Trash2, Check, Eye, EyeOff,
  Plus, Send, Copy, QrCode, Download, Filter, Star,
  ThumbsUp, AlertTriangle, X, Link2, ExternalLink,
} from 'lucide-react';

type CommentSubTab = 'wall' | 'moderate' | 'settings' | 'link';

interface Comment {
  id: string;
  guest: string;
  initials: string;
  avatarColor: string;
  message: string;
  time: string;
  approved: boolean;
  flagged: boolean;
  likes: number;
  liked: boolean;
  pinned: boolean;
}

const SAMPLE_COMMENTS: Comment[] = [
  { id: 'c1', guest: 'Alicia Santos', initials: 'AS', avatarColor: '#C5A059', message: 'Incredible event — the keynote was absolutely inspiring! Already looking forward to next year. 🙌', time: '2m ago', approved: true, flagged: false, likes: 14, liked: false, pinned: true },
  { id: 'c2', guest: 'Marcus Tan', initials: 'MT', avatarColor: '#00F0FF', message: 'The networking lunch was incredible — met some amazing founders. Thank you All41 team! 🚀', time: '8m ago', approved: true, flagged: false, likes: 9, liked: false, pinned: false },
  { id: 'c3', guest: 'Priya Sharma', initials: 'PS', avatarColor: '#FF3366', message: 'First time attending and I\'m blown away by the production quality. The LED stage is stunning.', time: '12m ago', approved: true, flagged: false, likes: 6, liked: false, pinned: false },
  { id: 'c4', guest: 'Rafael Cruz', initials: 'RC', avatarColor: '#8B5CF6', message: 'Loved the door prize segment — congrats to all the winners!', time: '18m ago', approved: false, flagged: false, likes: 0, liked: false, pinned: false },
  { id: 'c5', guest: 'Hana Kim', initials: 'HK', avatarColor: '#10B981', message: 'The photo wall is such a fun touch. Already shared mine on Instagram!', time: '25m ago', approved: true, flagged: false, likes: 11, liked: false, pinned: false },
  { id: 'c6', guest: 'Jordan Reyes', initials: 'JR', avatarColor: '#F59E0B', message: 'This is my third All41 event and honestly they keep getting better. Truly world-class.', time: '31m ago', approved: false, flagged: true, likes: 0, liked: false, pinned: false },
];

const COMMENT_THEMES = [
  { id: 'dark', label: 'Midnight Dark', bg: '#09090B', text: '#fff', accent: '#C5A059' },
  { id: 'glass', label: 'Glass Panel', bg: 'rgba(18,18,20,0.85)', text: '#fff', accent: '#00F0FF' },
  { id: 'warm', label: 'Warm Ivory', bg: '#FBF8F0', text: '#3D2B1F', accent: '#C5A059' },
  { id: 'neon', label: 'Neon Cyber', bg: '#0A0A14', text: '#fff', accent: '#00F0FF' },
];

export function CommentsWall({ isWedding }: { isWedding: boolean }) {
  const [subTab, setSubTab] = useState<CommentSubTab>('wall');
  const [comments, setComments] = useState<Comment[]>(SAMPLE_COMMENTS);
  const [commentTheme, setCommentTheme] = useState('dark');
  const [requireApproval, setRequireApproval] = useState(true);
  const [profanityFilter, setProfanityFilter] = useState(true);
  const [showGuestNames, setShowGuestNames] = useState(true);
  const [maxChars, setMaxChars] = useState('280');
  const [newMessage, setNewMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
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
    { id: 'link', label: 'Link URL', icon: Link2 },
  ];

  return (
    <div className="space-y-5">
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
              { label: 'Pending Review', value: pending.length, color: 'text-amber-400' },
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

          {/* Live comments preview */}
          <div className="p-5 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Live Comments ({approved.length})</p>
              <div className="flex items-center gap-1.5">
                {pending.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold">
                    {pending.length} awaiting review
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {[...comments.filter((c) => c.pinned && c.approved), ...comments.filter((c) => !c.pinned && c.approved)].map((comment) => (
                <div
                  key={comment.id}
                  className={`flex items-start gap-3 p-4 rounded-2xl border group transition-all ${
                    comment.pinned ? 'border-premium-gold/40 bg-premium-gold/5' : 'border-premium-borderDark bg-premium-surfaceDark'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold text-xs"
                    style={{ backgroundColor: comment.avatarColor }}
                  >
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
                      <button type="button" onClick={() => removeComment(comment.id)} className="text-[10px] text-zinc-600 hover:text-premium-danger scale-on-click ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
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
                    guest: 'Admin Preview',
                    initials: 'AP',
                    avatarColor: '#C5A059',
                    message: newMessage,
                    time: 'Just now',
                    approved: true,
                    flagged: false,
                    likes: 0,
                    liked: false,
                    pinned: false,
                  }, ...prev]);
                  setNewMessage('');
                }}
                className="px-4 py-2.5 rounded-xl bg-premium-gold text-black font-bold text-xs scale-on-click shadow-gold flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
            </div>
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
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${filterMode === id ? 'bg-premium-gold text-black' : 'bg-zinc-700 text-zinc-400'}`}>{count}</span>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {displayed.map((comment) => (
              <div key={comment.id} className={`flex items-start gap-3 p-4 rounded-2xl border ${
                comment.flagged ? 'border-premium-danger/30 bg-premium-danger/5' : comment.approved ? 'border-premium-borderDark bg-premium-charcoal' : 'border-amber-500/30 bg-amber-950/20'
              }`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-black font-bold text-[10px]" style={{ backgroundColor: comment.avatarColor }}>
                  {comment.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-white">{comment.guest}</span>
                    {!comment.approved && <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[9px] font-bold">Pending</span>}
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
                      <button type="button" className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 text-[10px] font-bold scale-on-click hover:text-white">
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
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Comment Wall Settings</p>
          <div className="space-y-4">
            {[
              { label: 'Require admin approval', desc: 'Comments appear only after you approve them.', val: requireApproval, set: setRequireApproval },
              { label: 'Profanity filter', desc: 'Automatically flags potentially inappropriate content.', val: profanityFilter, set: setProfanityFilter },
              { label: 'Show guest names', desc: 'Display commenter\'s name on the public wall.', val: showGuestNames, set: setShowGuestNames },
            ].map(({ label, desc, val, set }) => (
              <div key={label} className="flex items-center justify-between p-4 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl">
                <div>
                  <div className="text-xs font-bold text-white">{label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{desc}</div>
                </div>
                <button type="button" onClick={() => set(!val)} className={`w-11 h-6 rounded-full flex-shrink-0 scale-on-click transition-colors ${val ? 'bg-premium-success' : 'bg-zinc-700'} flex items-center ${val ? 'justify-end pr-0.5' : 'pl-0.5'}`}>
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

      {/* Link URL tab */}
      {subTab === 'link' && (
        <div className="p-6 rounded-[2rem] bg-premium-charcoal border border-premium-borderDark space-y-5">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Comment Wall URLs</p>
            <p className="text-xs text-zinc-400">Share with guests so they can leave comments and see the live wall on screen.</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-zinc-500 mb-1.5 font-mono">Guest Submit URL</p>
              <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl px-4 py-3">
                <span className="text-premium-neon font-mono text-sm flex-1 truncate">https://comment.all41.app/your-event-slug</span>
                <button type="button" onClick={() => { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }} className="p-2 rounded-xl bg-premium-black border border-premium-borderDark scale-on-click">
                  {copiedLink ? <Check className="w-4 h-4 text-premium-success" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 mb-1.5 font-mono">Stage Display Wall URL</p>
              <div className="flex items-center gap-2 bg-premium-surfaceDark border border-premium-borderDark rounded-2xl px-4 py-3">
                <span className="text-premium-neon font-mono text-sm flex-1 truncate">https://wall.all41.app/comments/your-event-slug</span>
                <ExternalLink className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center">
              <QrCode className="w-14 h-14 text-black" />
            </div>
            <div className="space-y-2">
              <p className="text-xs text-zinc-400">QR for table tents / place cards</p>
              <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-premium-gold text-black rounded-xl text-xs font-bold scale-on-click shadow-gold">
                <Download className="w-3.5 h-3.5" />
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
