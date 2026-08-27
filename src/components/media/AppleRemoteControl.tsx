/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CaretUp, 
  CaretDown, 
  CaretLeft, 
  CaretRight, 
  Play, 
  Pause, 
  SpeakerHigh, 
  SpeakerSlash, 
  Power, 
  Television, 
  ArrowUUpLeft, 
  Microphone, 
  Plus, 
  Minus,
  Sparkle,
  Radio
} from '@phosphor-icons/react';
import { MediaPlayerService } from '../../services/mediaPlayerClassification';
import { ResolvedEntity, HAEntity } from '../../types';

interface AppleRemoteControlProps {
  entity: HAEntity | ResolvedEntity;
  remoteEntityId?: string;
  darkMode?: boolean;
}

export default function AppleRemoteControl({
  entity,
  remoteEntityId,
  darkMode = true
}: AppleRemoteControlProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string>('Ready');
  const [feedbackAnim, setFeedbackAnim] = useState<boolean>(false);

  const targetRemoteId = remoteEntityId || `remote.${entity.entity_id.replace('media_player.', '')}`;
  const isPlaying = entity.state === 'playing';
  const isPowerOn = entity.state !== 'off' && entity.state !== 'standby' && entity.state !== 'unavailable';

  const sendKey = async (
    key: 'up' | 'down' | 'left' | 'right' | 'select' | 'menu' | 'top_menu' | 'home' | 'play_pause' | 'volume_up' | 'volume_down' | 'mute',
    label: string
  ) => {
    setActiveKey(key);
    setLastCommand(label);
    setFeedbackAnim(true);

    try {
      if (key === 'play_pause') {
        await MediaPlayerService.playPause(entity.entity_id);
      } else if (key === 'volume_up') {
        await MediaPlayerService.sendRemoteKey(targetRemoteId, 'volume_up');
      } else if (key === 'volume_down') {
        await MediaPlayerService.sendRemoteKey(targetRemoteId, 'volume_down');
      } else {
        await MediaPlayerService.sendRemoteKey(targetRemoteId, key);
      }
    } catch (err) {
      console.warn(`[Apple Remote] Command failed: ${key}`, err);
    } finally {
      setTimeout(() => setActiveKey(null), 180);
      setTimeout(() => setFeedbackAnim(false), 500);
    }
  };

  const handlePowerToggle = async () => {
    setActiveKey('power');
    setLastCommand('Power Toggle');
    try {
      await MediaPlayerService.togglePower(entity.entity_id);
    } finally {
      setTimeout(() => setActiveKey(null), 200);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full py-2">
      {/* Remote Outer Chassis */}
      <div className={`relative w-64 p-5 rounded-[40px] border shadow-2xl transition-all select-none ${
        darkMode 
          ? 'bg-gradient-to-b from-slate-800/90 via-slate-900/95 to-black border-slate-700/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)]' 
          : 'bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 border-slate-300 shadow-xl'
      }`}>
        {/* Subtle Aluminium Edge Highlight */}
        <div className="absolute inset-px rounded-[39px] pointer-events-none border border-white/10" />

        {/* Top Header: Microphone Notch & Power Button */}
        <div className="flex items-center justify-between px-2 mb-5">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full transition-colors ${
              feedbackAnim 
                ? 'bg-emerald-400 animate-ping' 
                : isPowerOn 
                  ? 'bg-emerald-500' 
                  : 'bg-slate-500'
            }`} />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 dark:text-slate-400">
              {lastCommand}
            </span>
          </div>

          <button
            type="button"
            onClick={handlePowerToggle}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              activeKey === 'power'
                ? 'scale-90 bg-rose-500 text-white'
                : isPowerOn
                  ? 'bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white'
                  : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
            }`}
            title="Wake / Sleep Apple TV"
          >
            <Power size={14} weight="bold" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* SIRI REMOTE D-PAD / CLICKPAD (Circular Directional Wheel) */}
        {/* ========================================================= */}
        <div className="relative w-48 h-48 mx-auto my-2 rounded-full bg-slate-300/80 dark:bg-slate-800 border-2 border-slate-400/50 dark:border-slate-700 shadow-inner flex items-center justify-center">
          {/* UP ARROW */}
          <button
            type="button"
            onClick={() => sendKey('up', 'Up')}
            className={`absolute top-1.5 inset-x-12 h-10 flex items-center justify-center rounded-t-full transition-all cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white active:scale-95 ${
              activeKey === 'up' ? 'bg-white/30 dark:bg-white/20 text-sky-400' : ''
            }`}
            title="Up"
          >
            <CaretUp size={20} weight="bold" />
          </button>

          {/* DOWN ARROW */}
          <button
            type="button"
            onClick={() => sendKey('down', 'Down')}
            className={`absolute bottom-1.5 inset-x-12 h-10 flex items-center justify-center rounded-b-full transition-all cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white active:scale-95 ${
              activeKey === 'down' ? 'bg-white/30 dark:bg-white/20 text-sky-400' : ''
            }`}
            title="Down"
          >
            <CaretDown size={20} weight="bold" />
          </button>

          {/* LEFT ARROW */}
          <button
            type="button"
            onClick={() => sendKey('left', 'Left')}
            className={`absolute left-1.5 inset-y-12 w-10 flex items-center justify-center rounded-l-full transition-all cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white active:scale-95 ${
              activeKey === 'left' ? 'bg-white/30 dark:bg-white/20 text-sky-400' : ''
            }`}
            title="Left"
          >
            <CaretLeft size={20} weight="bold" />
          </button>

          {/* RIGHT ARROW */}
          <button
            type="button"
            onClick={() => sendKey('right', 'Right')}
            className={`absolute right-1.5 inset-y-12 w-10 flex items-center justify-center rounded-r-full transition-all cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white active:scale-95 ${
              activeKey === 'right' ? 'bg-white/30 dark:bg-white/20 text-sky-400' : ''
            }`}
            title="Right"
          >
            <CaretRight size={20} weight="bold" />
          </button>

          {/* CENTER SELECT / CLICKPAD BUTTON */}
          <button
            type="button"
            onClick={() => sendKey('select', 'Select')}
            className={`w-20 h-20 rounded-full border border-slate-400/40 dark:border-slate-600 flex items-center justify-center transition-all cursor-pointer shadow-md ${
              activeKey === 'select'
                ? 'scale-90 bg-sky-500 text-white shadow-sky-500/50'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-white active:scale-95'
            }`}
            title="Select / OK"
          >
            <span className="w-4 h-4 rounded-full border-2 border-current opacity-80" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* ACTION BUTTONS GRID                                       */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 gap-3 mt-6 px-1">
          {/* BACK / MENU BUTTON */}
          <button
            type="button"
            onClick={() => sendKey('menu', 'Back / Menu')}
            className={`h-12 rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-300 dark:border-slate-700 shadow-sm ${
              activeKey === 'menu'
                ? 'scale-95 bg-sky-500 text-white'
                : 'bg-slate-300/70 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'
            }`}
            title="Back / Menu"
          >
            <ArrowUUpLeft size={18} weight="bold" />
            <span className="text-xs font-bold font-mono">Back</span>
          </button>

          {/* HOME / TV BUTTON */}
          <button
            type="button"
            onClick={() => sendKey('home', 'Home / TV')}
            className={`h-12 rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-300 dark:border-slate-700 shadow-sm ${
              activeKey === 'home'
                ? 'scale-95 bg-sky-500 text-white'
                : 'bg-slate-300/70 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'
            }`}
            title="Home / TV"
          >
            <Television size={18} weight="duotone" />
            <span className="text-xs font-bold font-mono">TV</span>
          </button>

          {/* PLAY / PAUSE BUTTON */}
          <button
            type="button"
            onClick={() => sendKey('play_pause', isPlaying ? 'Pause' : 'Play')}
            className={`h-12 rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-300 dark:border-slate-700 shadow-sm ${
              activeKey === 'play_pause'
                ? 'scale-95 bg-sky-500 text-white'
                : 'bg-slate-300/70 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
          </button>

          {/* MUTE BUTTON */}
          <button
            type="button"
            onClick={() => sendKey('mute', 'Mute')}
            className={`h-12 rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-300 dark:border-slate-700 shadow-sm ${
              activeKey === 'mute'
                ? 'scale-95 bg-rose-500 text-white'
                : 'bg-slate-300/70 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'
            }`}
            title="Mute"
          >
            <SpeakerSlash size={18} weight="duotone" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* VOLUME ROCKER BAR & SIRI ASSISTANT BUTTON                 */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 gap-3 mt-3 px-1">
          {/* SIRI BUTTON */}
          <button
            type="button"
            onClick={() => sendKey('top_menu', 'Siri Voice')}
            className="h-12 rounded-2xl bg-slate-300/70 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Siri Voice Search"
          >
            <Microphone size={18} weight="duotone" className="text-purple-400" />
            <span className="text-xs font-bold font-mono">Siri</span>
          </button>

          {/* VOLUME + / - ROCKER BUTTON PAIR */}
          <div className="h-12 rounded-2xl bg-slate-300/70 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center divide-x divide-slate-400/40 dark:divide-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => sendKey('volume_up', 'Vol +')}
              className={`flex-1 h-full flex items-center justify-center transition-all cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 ${
                activeKey === 'volume_up' ? 'bg-sky-500 text-white' : ''
              }`}
              title="Volume Up"
            >
              <Plus size={14} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => sendKey('volume_down', 'Vol -')}
              className={`flex-1 h-full flex items-center justify-center transition-all cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 ${
                activeKey === 'volume_down' ? 'bg-sky-500 text-white' : ''
              }`}
              title="Volume Down"
            >
              <Minus size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* Entity ID Subtitle Tag */}
        <div className="text-center mt-5 pt-3 border-t border-slate-300/60 dark:border-white/5">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate block">
            {targetRemoteId}
          </span>
        </div>
      </div>
    </div>
  );
}
