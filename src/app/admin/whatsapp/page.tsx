'use client';

import React, { useState } from 'react';
import { formatDateTime } from '@/lib/utils';
import {
  MessageSquare,
  ShieldAlert,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Play,
  Pause,
  Sliders,
} from 'lucide-react';

export default function AdminWhatsAppQueuePage() {
  const [queueStatus, setQueueStatus] = useState<'running' | 'paused'>('running');

  const [queueItems, setQueueItems] = useState([
    {
      id: 'msg-001',
      eventName: 'TechUnite APAC Summit 2026',
      recipientPhone: '+6281234567890',
      recipientName: 'Budi Santoso',
      type: 'Ticket Pass QR',
      scheduledDelay: '4.2s delay',
      status: 'sent',
      sentAt: 'Just now',
    },
    {
      id: 'msg-002',
      eventName: 'TechUnite APAC Summit 2026',
      recipientPhone: '+6281987654321',
      recipientName: 'Clarissa Tan',
      type: 'Ticket Pass QR',
      scheduledDelay: '5.8s delay',
      status: 'sending',
      sentAt: 'Processing...',
    },
    {
      id: 'msg-003',
      eventName: 'TechUnite APAC Summit 2026',
      recipientPhone: '+6285712348888',
      recipientName: 'Siti Rahmawati',
      type: 'Ticket Pass QR',
      scheduledDelay: '6.1s delay',
      status: 'queued',
      sentAt: 'In Queue',
    },
    {
      id: 'msg-004',
      eventName: 'Aria & Daniel: The Grand Celebration',
      recipientPhone: '+6281333221100',
      recipientName: 'Nadia Michelle',
      type: 'Digital RSVP Reminder',
      scheduledDelay: '4.0s delay',
      status: 'queued',
      sentAt: 'In Queue',
    },
  ]);

  return (
    <div className="flex-1 flex flex-col p-6 sm:p-10 space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#241a38] pb-6">
        <div>
          <h1 className="text-2xl font-black text-white">WhatsApp Rate-Limiting & Pacing Queue</h1>
          <p className="text-xs text-gray-400">
            Background worker queue enforcing automated jitter delays to safeguard event phone numbers from carrier anti-spam bans
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQueueStatus(queueStatus === 'running' ? 'paused' : 'running')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              queueStatus === 'running'
                ? 'bg-[#00ff88]/20 border border-[#00ff88] text-[#00ff88]'
                : 'bg-amber-400/20 border border-amber-400 text-amber-300'
            }`}
          >
            {queueStatus === 'running' ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>Queue Status: {queueStatus.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* Pacing Rules Notice Card */}
      <div className="p-6 rounded-3xl bg-[#120e22] border border-[#2d1f47] space-y-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-[#dfb76c]" />
          <h3 className="text-sm font-bold text-white">Automated Background Policy (Hidden from End-User)</h3>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
          As agreed in dayoneproject.xyz policy, end-users do not need to manage timing delays. The queue worker automatically spaces outbound WhatsApp requests between <strong>3.5s to 7.0s</strong> with randomized jitter. Burst submissions are throttled without dropping to protect BYON numbers from suspension.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#090b14] border border-[#201736]">
            <span className="text-[10px] text-gray-400 uppercase font-mono">Current Active Queue</span>
            <div className="text-lg font-black text-white mt-0.5">3 Messages</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#090b14] border border-[#201736]">
            <span className="text-[10px] text-gray-400 uppercase font-mono">Random Delay Window</span>
            <div className="text-lg font-black text-[#00f0ff] mt-0.5">3.500ms - 7.000ms</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#090b14] border border-[#201736]">
            <span className="text-[10px] text-gray-400 uppercase font-mono">Provider Gateway</span>
            <div className="text-lg font-black text-[#dfb76c] mt-0.5">Fonnte API (BYON)</div>
          </div>
        </div>
      </div>

      {/* Message Queue Stream Table */}
      <div className="rounded-2xl bg-[#110e1c] border border-[#241a38] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#241a38] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Active Dispatch Queue</h3>
          <span className="text-xs font-mono text-gray-400">Live Pacing Telemetry</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0c0a14] border-b border-[#241a38] text-purple-300 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Event Name</th>
                <th className="px-6 py-3.5">Recipient</th>
                <th className="px-6 py-3.5">Message Type</th>
                <th className="px-6 py-3.5">Pacing Jitter</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d1530]">
              {queueItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#181329] transition-colors">
                  <td className="px-6 py-4 font-semibold text-white">
                    {item.eventName}
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{item.recipientName}</div>
                    <div className="text-[11px] text-gray-400 font-mono">{item.recipientPhone}</div>
                  </td>

                  <td className="px-6 py-4 font-mono text-[#dfb76c]">
                    {item.type}
                  </td>

                  <td className="px-6 py-4 font-mono text-purple-300">
                    {item.scheduledDelay}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {item.status === 'sent' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] text-[11px] font-semibold border border-[#00ff88]/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Delivered</span>
                      </span>
                    )}
                    {item.status === 'sending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00f0ff]/10 text-[#00f0ff] text-[11px] font-semibold border border-[#00f0ff]/20">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Transmitting</span>
                      </span>
                    )}
                    {item.status === 'queued' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-[11px] font-semibold border border-amber-400/20">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pacing Wait</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
