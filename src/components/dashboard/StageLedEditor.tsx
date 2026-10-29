'use client';

import React, { useState } from 'react';
import { StageConfig, StageModuleId } from '@/lib/types';
import { DEFAULT_STAGE_CONFIG } from '@/lib/mockData';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  RotateCcw,
  MessageSquare,
  Check,
  Tv,
} from 'lucide-react';

interface StageLedEditorProps {
  eventId: string;
  initialConfig?: StageConfig;
  captionsEnabled?: boolean;
  onConfigChange?: (config: StageConfig) => void;
  onCaptionsToggle?: (enabled: boolean) => void;
}

export function StageLedEditor({
  eventId,
  initialConfig = DEFAULT_STAGE_CONFIG,
  captionsEnabled = true,
  onConfigChange,
  onCaptionsToggle,
}: StageLedEditorProps) {
  const [config, setConfig] = useState<StageConfig>(initialConfig);
  const [captionsOn, setCaptionsOn] = useState<boolean>(captionsEnabled);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleToggleModule = (id: StageModuleId) => {
    const updatedModules = config.modules.map((m) =>
      m.id === id ? { ...m, isEnabled: !m.isEnabled } : m
    );
    const updated = { ...config, modules: updatedModules };
    setConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  const handleSetActiveMode = (mode: StageModuleId | 'auto_rotate') => {
    const updated = { ...config, activeMode: mode };
    setConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  const handleDurationChange = (id: StageModuleId, duration: number) => {
    const updatedModules = config.modules.map((m) =>
      m.id === id ? { ...m, durationSeconds: duration } : m
    );
    const updated = { ...config, modules: updatedModules };
    setConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  const handleTickerChange = (text: string) => {
    const updated = { ...config, tickerText: text };
    setConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  const handleToggleCaptions = () => {
    const nextVal = !captionsOn;
    setCaptionsOn(nextVal);
    if (onCaptionsToggle) onCaptionsToggle(nextVal);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans">
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-premium-success/15 border border-premium-success/30 text-premium-success text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>Stage LED broadcast settings updated and synced in realtime!</span>
        </div>
      )}

      {/* Top Banner: Quick Live Mode Selector */}
      <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-premium-gold/15 border border-premium-gold/30 text-premium-gold flex items-center justify-center shadow-gold">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-display font-medium text-white flex items-center gap-2">
                <span>Ballroom Stage LED Master Controller</span>
                <span className="w-2 h-2 rounded-full bg-premium-success animate-pulse" />
              </h3>
              <p className="text-xs text-zinc-400">
                Direct what appears on the grand ballroom LED projector. Strictly system-governed modules.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSetActiveMode('auto_rotate')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 scale-on-click ${
              config.activeMode === 'auto_rotate'
                ? 'bg-premium-gold hover:bg-premium-goldHover text-black shadow-gold font-bold'
                : 'bg-premium-surfaceDark text-zinc-300 hover:text-white border border-premium-borderDark'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Auto-Rotate Enabled Modules</span>
          </button>
        </div>

        {/* Mode Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2">
          {config.modules.map((m) => {
            const isActive = config.activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSetActiveMode(m.id)}
                disabled={!m.isEnabled}
                className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 scale-on-click ${
                  isActive
                    ? 'bg-premium-neon/15 border-premium-neon text-white shadow-neon'
                    : m.isEnabled
                    ? 'bg-premium-surfaceDark border-premium-borderDark text-zinc-300 hover:border-premium-gold'
                    : 'bg-premium-black border-zinc-900 text-zinc-600 opacity-40 cursor-not-allowed'
                }`}
              >
                <span className="text-xs font-display font-medium truncate w-full">{m.name}</span>
                <span className="text-[10px] font-mono text-zinc-500">
                  {m.isEnabled ? `${m.durationSeconds}s` : 'Disabled'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Permissions & Carousel Editor */}
      <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-5 shadow-xl">
        <div className="border-b border-premium-borderDark pb-3 flex items-center justify-between">
          <div>
            <h4 className="text-lg font-display font-medium text-white">System Display Modules</h4>
            <p className="text-xs text-zinc-400">
              Toggle which system slides are permitted to appear on the ballroom stage projector
            </p>
          </div>
          <span className="px-3 py-1 bg-premium-neon/15 text-premium-neon border border-premium-neon/30 rounded-full font-mono text-xs font-bold">
            {config.modules.filter((m) => m.isEnabled).length} of {config.modules.length} active
          </span>
        </div>

        <div className="space-y-3">
          {config.modules.map((mod) => (
            <div
              key={mod.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                mod.isEnabled
                  ? 'bg-premium-surfaceDark border-premium-borderDark'
                  : 'bg-premium-black border-zinc-900 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleModule(mod.id)}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors scale-on-click ${
                    mod.isEnabled ? 'bg-premium-gold text-black shadow-gold font-bold' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {mod.isEnabled && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
                <div>
                  <h5 className="text-sm font-display font-medium text-white flex items-center gap-2">
                    <span>{mod.name}</span>
                    <span className="text-[10px] font-mono text-premium-gold uppercase">[{mod.id}]</span>
                  </h5>
                  <p className="text-xs text-zinc-400">{mod.description}</p>
                </div>
              </div>

              {/* Duration slider */}
              {mod.isEnabled && (
                <div className="flex items-center gap-3 pl-10 sm:pl-0">
                  <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
                    Slide Time: <strong className="text-white">{mod.durationSeconds}s</strong>
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={5}
                    value={mod.durationSeconds}
                    onChange={(e) => handleDurationChange(mod.id, Number(e.target.value))}
                    className="w-24 accent-[#C5A059] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Photowall Policy Settings: Captions ON/OFF Toggle */}
      <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-premium-dangerDim border border-premium-danger/30 text-premium-danger flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-display font-medium text-white">Photo Wall Guest Captions Policy</h4>
              <p className="text-xs text-zinc-400">
                Control whether attendees are allowed to write short words/captions (up to 300 characters)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleCaptions}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all scale-on-click ${
              captionsOn
                ? 'bg-premium-gold text-black shadow-gold font-bold'
                : 'bg-premium-surfaceDark border border-premium-borderDark text-zinc-400 hover:text-white'
            }`}
          >
            {captionsOn ? 'Captions: ON (300 Max)' : 'Captions: OFF (Media Only)'}
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-xs text-zinc-400 space-y-2">
          <div className="flex items-center justify-between">
            <span>When Captions are <strong>ON</strong>:</span>
            <span className="text-premium-gold font-semibold">Attendees can write up to 300 characters alongside their photo/video</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
            <span>When Captions are <strong>OFF</strong>:</span>
            <span className="text-zinc-300 font-semibold">Only images or videos can be submitted; caption input is disabled</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
            <span>Enforced Media Constraints:</span>
            <span className="text-premium-neon font-mono">Image: ≤ 2MB WebP • Video: ≤ 20MB 720p HD</span>
          </div>
        </div>
      </div>

      {/* Stage LED Ticker Banner Editor */}
      <div className="p-8 rounded-[2.5rem] bg-premium-charcoal border border-premium-borderDark space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-lg font-display font-medium text-white">Stage Bottom Ticker Text</h4>
            <p className="text-xs text-zinc-400">
              Live announcement ticker scrolling continuously across the bottom of the stage screen
            </p>
          </div>
          <span className="text-xs font-mono text-premium-gold font-bold">{config.tickerText.length} chars</span>
        </div>

        <input
          type="text"
          value={config.tickerText}
          onChange={(e) => handleTickerChange(e.target.value)}
          placeholder="e.g. ★ Welcome to our celebration! Post your selfies at clientname.all41.app ★"
          className="w-full px-5 py-4 rounded-2xl bg-premium-surfaceDark border border-premium-borderDark text-sm font-mono text-white focus:border-premium-gold outline-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="bg-premium-gold hover:bg-premium-goldHover text-black px-8 py-4 rounded-2xl font-bold transition-all shadow-gold scale-on-click text-sm font-display"
        >
          Save & Broadcast to Ballroom LED
        </button>
      </div>
    </div>
  );
}
