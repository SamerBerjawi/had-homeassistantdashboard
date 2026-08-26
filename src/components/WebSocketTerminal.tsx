/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronRight, 
  Terminal, 
  Play, 
  Trash2, 
  Activity, 
  Settings, 
  User, 
  Sparkles, 
  Server,
  Code,
  X,
  Minus
} from 'lucide-react';
import { LogMessage, HAEntity } from '../types';

interface WebSocketTerminalProps {
  logs: LogMessage[];
  entities: HAEntity[];
  onClearLogs: () => void;
  onSimulateServiceCall: (domain: string, service: string, targetId: string, attrData?: any) => void;
  onSimulateEvent: (eventType: string) => void;
  onClose?: () => void;
}

export default function WebSocketTerminal({
  logs,
  entities,
  onClearLogs,
  onSimulateServiceCall,
  onSimulateEvent,
  onClose
}: WebSocketTerminalProps) {
  const [filter, setFilter] = useState<'all' | 'service_call' | 'state_changed'>('all');
  const [selectedDomain, setSelectedDomain] = useState('light');
  const [selectedService, setSelectedService] = useState('turn_on');
  const [selectedEntity, setSelectedEntity] = useState('light.bedroom');
  const [customValue, setCustomValue] = useState('80'); // brightness value
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto Scroll log stream
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Adjust services depending on selected domain
  const getServicesForDomain = (domain: string) => {
    switch (domain) {
      case 'light':
        return ['turn_on', 'turn_off', 'toggle', 'set_brightness'];
      case 'vacuum':
        return ['start', 'stop', 'return_to_base', 'set_fan_speed'];
      case 'climate':
        return ['set_temperature', 'set_hvac_mode', 'turn_on', 'turn_off'];
      case 'lock':
        return ['lock', 'unlock'];
      default:
        return ['turn_on', 'turn_off'];
    }
  };

  const getEntitiesForDomain = (domain: string) => {
    return entities.filter(ent => ent.entity_id.startsWith(domain));
  };

  // Dispatch custom service
  const handleSendCommand = () => {
    let attrs: any = {};
    if (selectedService === 'set_brightness') {
      attrs.brightness = Number(customValue) || 100;
    } else if (selectedService === 'set_temperature') {
      attrs.target_temp = Number(customValue) || 24;
    } else if (selectedService === 'turn_on' && selectedDomain === 'light') {
      attrs.brightness = 100;
    } else if (selectedService === 'return_to_base') {
      attrs.mode = 'Silent';
    }
    
    // Trigger
    const resolvedState = (selectedService === 'turn_off' || selectedService === 'stop' || selectedService === 'lock') 
      ? 'off' 
      : (selectedService === 'lock') ? 'locked' : (selectedService === 'unlock') ? 'unlocked' : 'on';
      
    onSimulateServiceCall(selectedDomain, selectedService, selectedEntity, { ...attrs, target_state: resolvedState });
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.type === filter;
  });

  return (
    <div className="bg-slate-950/95 border border-white/[0.1] text-slate-100 rounded-3xl p-6 shadow-2xl font-mono overflow-hidden flex flex-col h-[520px] transition-all backdrop-blur-2xl">
      {/* Title Header */}
      <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Terminal size={18} className="text-yellow-400 animate-pulse" />
          <span className="text-xs font-bold tracking-wider uppercase text-slate-300">Hass Developer WebSocket Monitor</span>
        </div>
        <div className="flex gap-2">
          {/* Status Badge */}
          <span className="text-[10px] bg-slate-900 text-emerald-400 px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            LIVE
          </span>
          <button 
            id="btn-clear-logs"
            onClick={onClearLogs} 
            title="Clear Monitor Logs"
            className="text-slate-500 hover:text-red-400 p-1 rounded-md hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
          </button>
          {onClose && (
            <button 
              id="btn-close-terminal"
              onClick={onClose} 
              title="Minimize / Close WebSocket Terminal"
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Simulator Actions shelf */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-900">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-2">Simulate Hardware Events</span>
          <div className="flex flex-col gap-2">
            <button 
              id="btn-sim-doorbell"
              onClick={() => onSimulateEvent('doorbell_ring')}
              className="flex items-center justify-between text-left text-[11px] bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-200 p-2 rounded-xl border border-indigo-900/60 cursor-pointer transition-colors"
            >
              <span>Ring Front Doorbell</span>
              <Play size={10} />
            </button>
            <button 
              id="btn-sim-motion"
              onClick={() => onSimulateEvent('motion_detected')}
              className="flex items-center justify-between text-left text-[11px] bg-green-950/40 hover:bg-green-900/40 text-green-200 p-2 rounded-xl border border-green-900/60 cursor-pointer transition-colors"
            >
              <span>Trigger Living Room Motion</span>
              <Play size={10} />
            </button>
          </div>
        </div>

        <div className="sm:col-span-2">
          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block mb-2">Send Simulated WS Service Call</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            
            {/* Domain */}
            <select
              value={selectedDomain}
              onChange={(e) => {
                setSelectedDomain(e.target.value);
                const firstEnt = getEntitiesForDomain(e.target.value)[0]?.entity_id || '';
                setSelectedEntity(firstEnt);
                setSelectedService(getServicesForDomain(e.target.value)[0]);
              }}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl p-2 text-[11px] focus:outline-none focus:border-brand-purple"
            >
              <option value="light">light</option>
              <option value="vacuum">vacuum</option>
              <option value="climate">climate</option>
              <option value="lock">lock</option>
            </select>

            {/* Service */}
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl p-2 text-[11px] focus:outline-none focus:border-brand-purple"
            >
              {getServicesForDomain(selectedDomain).map(srv => (
                <option key={srv} value={srv}>{srv}</option>
              ))}
            </select>

            {/* Entity Target */}
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded-xl p-2 text-[11px] focus:outline-none focus:border-brand-purple"
            >
              {getEntitiesForDomain(selectedDomain).map(ent => (
                <option key={ent.entity_id} value={ent.entity_id}>{ent.entity_id}</option>
              ))}
            </select>

            {/* Custom modifier input / Dispatch */}
            <div className="flex gap-1.5 items-center">
              {(selectedService.includes('brightness') || selectedService.includes('temperature')) ? (
                <input
                  type="number"
                  placeholder={selectedService.includes('brightness') ? "0-100" : "16-32"}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  className="w-16 bg-slate-950 border border-slate-800 text-center text-slate-100 rounded-xl p-2 text-[11px]"
                />
              ) : null}
              
              <button
                id="btn-dispatch-ws"
                onClick={handleSendCommand}
                className="flex-1 bg-brand-purple hover:bg-brand-purple-hover text-white rounded-xl py-2 px-3 text-center font-bold text-[10px] tracking-wide cursor-pointer transition-transform duration-100 active:scale-95 flex items-center justify-center gap-1"
              >
                <span>CALL</span>
                <ChevronRight size={10} />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Logs category toggler */}
      <div className="flex gap-2 mb-3 text-[10px]">
        {[
          { id: 'all', label: 'ALL COMMUNICATIONS' },
          { id: 'service_call', label: 'SERVICE CALLS' },
          { id: 'state_changed', label: 'STATE CHANGES' }
        ].map((btn) => (
          <button
            key={btn.id}
            id={`btn-terminal-filter-${btn.id}`}
            onClick={() => setFilter(btn.id as any)}
            className={`px-3 py-1.5 font-black rounded-lg border cursor-pointer transition-colors ${
              filter === btn.id 
                ? 'bg-slate-800 border-slate-700 text-yellow-400' 
                : 'bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-300'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Console log display container */}
      <div 
        ref={scrollRef}
        id="websocket-log-stream"
        className="flex-1 bg-slate-950 border border-slate-900 rounded-2xl p-4 overflow-y-auto text-xs font-mono space-y-1.5 scrolling-touch"
      >
        {filteredLogs.length === 0 ? (
          <p className="text-slate-600 italic text-center text-[11px] pt-8">No matching socket packets logged. Interact with the dashboard above or trigger an event!</p>
        ) : (
          filteredLogs.map((log) => {
            let badgeColor = 'text-slate-500';
            if (log.type === 'service_call') badgeColor = 'text-indigo-400 font-bold';
            if (log.type === 'state_changed') badgeColor = 'text-cyan-400';
            if (log.type === 'warning') badgeColor = 'text-amber-500 font-bold animate-pulse';
            if (log.type === 'error') badgeColor = 'text-red-500 font-bold';

            return (
              <div key={log.id} className="border-b border-slate-900/40 pb-1 text-[11px]">
                <div className="flex gap-2">
                  <span className="text-slate-500">[{log.timestamp}]</span>
                  <span className={badgeColor}>[{log.type.toUpperCase()}]</span>
                  <p className="flex-1 text-slate-300 leading-relaxed">{log.message}</p>
                </div>
                {log.details && (
                  <pre className="text-[9px] bg-slate-900/60 p-2 rounded-lg border border-slate-900/80 text-sky-400/95 overflow-x-auto mt-1 max-w-full">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
