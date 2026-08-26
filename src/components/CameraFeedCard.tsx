/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Video, 
  Mic2, 
  Maximize2, 
  Volume2, 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  VolumeX,
  Radio,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { CAMERA_FEEDS } from '../data';

interface CameraFeedCardProps {
  onCaptureSnapshot: (cameraName: string) => void;
  onIntercomToggle: (cameraName: string, isMuted: boolean) => void;
  doorLocked: boolean;
  onToggleDoorLock: () => void;
  darkMode?: boolean;
}

export default function CameraFeedCard({
  onCaptureSnapshot,
  onIntercomToggle,
  doorLocked,
  onToggleDoorLock,
  darkMode = false
}: CameraFeedCardProps) {
  const [activeFeedIndex, setActiveFeedIndex] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [fullscreenMode, setFullscreenMode] = useState(false);

  const currentFeed = CAMERA_FEEDS[activeFeedIndex];

  const handleNextFeed = () => {
    setActiveFeedIndex((prev) => (prev + 1) % CAMERA_FEEDS.length);
  };

  const handlePrevFeed = () => {
    setActiveFeedIndex((prev) => (prev - 1 + CAMERA_FEEDS.length) % CAMERA_FEEDS.length);
  };

  const triggerCapture = () => {
    onCaptureSnapshot(currentFeed.name);
  };

  const triggerMicToggle = () => {
    const nextState = !micActive;
    setMicActive(nextState);
    onIntercomToggle(currentFeed.name, nextState);
  };

  return (
    <div id="camera-feed-card" className={`relative rounded-[32px] overflow-hidden group shadow-2xl border h-80 transition-all duration-300 ${
      darkMode ? 'border-white/10 shadow-black/60' : 'border-white/50'
    }`}>
      
      {/* Background Live video representation */}
      <img 
        src={currentFeed.url} 
        alt={currentFeed.name}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      
      {/* Visual Overlay tint */}
      <div className={`absolute inset-0 transition-all duration-300 ${
        darkMode ? 'bg-slate-950/40 group-hover:bg-slate-950/30' : 'bg-slate-950/25 group-hover:bg-slate-950/20'
      }`} />

      {/* Pulsing Live indicator */}
      <div className="absolute top-4 left-4 bg-rose-500 px-3 py-1 text-white text-[10px] font-black rounded-full flex items-center gap-1.5 z-10 shadow-md">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
        </span>
        <span className="tracking-widest uppercase">LIVE FEED</span>
      </div>

      {/* Stream Type Tag */}
      <div className="absolute top-4 right-4 bg-[#7B61FF] border border-indigo-400 text-white text-[9px] font-black tracking-widest px-3 py-1 rounded-full z-10 shadow-sm uppercase">
        {currentFeed.tag}
      </div>

      {/* Slide Navigation controls */}
      <div className="absolute top-1/2 -translate-y-1/2 left-3 right-3 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
        <button 
          id="btn-cam-prev"
          onClick={handlePrevFeed}
          className={`w-9 h-9 backdrop-blur-md rounded-full flex items-center justify-center shadow-md cursor-pointer pointer-events-auto transition-transform active:scale-95 ${
            darkMode ? 'bg-slate-900/80 hover:bg-slate-900 text-slate-100 border border-slate-700' : 'bg-white/90 hover:bg-white text-slate-800'
          }`}
        >
          <ChevronLeft size={16} />
        </button>
        <button 
          id="btn-cam-next"
          onClick={handleNextFeed}
          className={`w-9 h-9 backdrop-blur-md rounded-full flex items-center justify-center shadow-md cursor-pointer pointer-events-auto transition-transform active:scale-95 ${
            darkMode ? 'bg-slate-900/80 hover:bg-slate-900 text-slate-100 border border-slate-700' : 'bg-white/90 hover:bg-white text-slate-800'
          }`}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Fullscreen simulation overlay */}
      {fullscreenMode && (
        <div 
          id="camera-fullscreen-backdrop"
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[9999] flex items-center justify-center p-4"
        >
          <div className="w-full max-w-4xl bg-black rounded-[40px] overflow-hidden border border-slate-800 relative shadow-2xl">
            <img 
              src={currentFeed.url} 
              alt={currentFeed.name}
              referrerPolicy="no-referrer"
              className="w-full max-h-[70vh] object-contain"
            />
            <div className="p-6 bg-slate-900 text-slate-100 flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-base">{currentFeed.name}</h4>
                <p className="text-xs text-slate-400">Stream Status: Connecting via WebRTC H.265 secure tunnel</p>
              </div>
              <button 
                onClick={() => setFullscreenMode(false)}
                className="bg-slate-800 hover:bg-slate-700 px-5 py-2 rounded-full font-bold text-xs text-white"
              >
                Close Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Motion alarm banner */}
      {currentFeed.id === 'front_door' && !doorLocked && (
        <div className="absolute inset-x-0 top-14 mx-4 bg-amber-400 border border-amber-300 text-slate-900 px-4 py-2 rounded-2xl flex items-center justify-between text-xs font-semibold z-10 animate-bounce">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="animate-pulse" />
            <span>Front door door lock is UNLOCKED</span>
          </div>
          <button 
            id="btn-door-quick-lock"
            onClick={onToggleDoorLock} 
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider py-1 px-3 rounded-lg cursor-pointer"
          >
            Lock Door
          </button>
        </div>
      )}

      {/* Bottom Floating controls shelf */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-3 z-10">
        
        {/* Expanded overlay control box */}
        <div className={`backdrop-blur-md p-3.5 rounded-2xl flex items-center gap-3 shadow-lg border ${
          darkMode ? 'bg-slate-900/85 border-slate-700 text-white' : 'bg-white/90 border-white text-slate-800'
        }`}>
          <button 
            id="btn-cam-intercom"
            onClick={triggerMicToggle}
            title={micActive ? "Mute Intercom Speaker" : "Broadcast Voice Intercom"}
            className={`p-3.5 rounded-full shadow-md transition-all duration-300 cursor-pointer ${
              micActive 
                ? 'bg-rose-500 text-white animate-pulse' 
                : 'bg-[#7B61FF] text-white hover:bg-[#684be3]'
            }`}
          >
            <Mic2 size={16} />
          </button>
          
          <div>
            <p className={`text-[9px] font-black tracking-wider uppercase ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>{currentFeed.name}</p>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-extrabold leading-tight ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {micActive ? 'Intercom Active' : currentFeed.status}
              </span>
              
              {/* Voice ripple simulation inside box */}
              {micActive && (
                <div className="flex items-end gap-0.5 h-3">
                  <span className="w-0.5 bg-rose-500 rounded-full animate-bounce h-1.5" style={{ animationDelay: '0.1s' }} />
                  <span className="w-0.5 bg-rose-500 rounded-full animate-bounce h-3" style={{ animationDelay: '0.3s' }} />
                  <span className="w-0.5 bg-rose-500 rounded-full animate-bounce h-2" style={{ animationDelay: '0.5s' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mini action utility buttons (Capture, Volume, Fullscreen) */}
        <div className="flex gap-2">
          {/* Snapshots Button */}
          <button 
            id="btn-cam-snapshot"
            onClick={triggerCapture}
            title="Snap Photo Trigger"
            className={`p-3 backdrop-blur-md rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer border ${
              darkMode 
                ? 'bg-slate-900/85 hover:bg-slate-800 text-slate-200 border-slate-700' 
                : 'bg-white/90 hover:bg-white text-slate-800 border-white'
            }`}
          >
            <Camera size={14} />
          </button>

          {/* Volume Control widget */}
          <div className="relative group/vol">
            <button 
              id="btn-cam-mute"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute Live stream Audio" : "Mute Live stream Audio"}
              className={`p-3 backdrop-blur-md rounded-full shadow-lg transition-transform cursor-pointer border ${
                darkMode 
                  ? 'bg-slate-900/85 hover:bg-slate-800 text-slate-200 border-slate-700' 
                  : 'bg-white/90 hover:bg-white text-slate-800 border-white'
              }`}
            >
              {isMuted ? <VolumeX size={14} className="text-rose-500" /> : <Volume2 size={14} />}
            </button>
            
            {/* Hover slider indicator */}
            <div className={`absolute bottom-12 right-0 p-2 rounded-xl shadow-xl hidden group-hover/vol:block border ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-16 accent-[#7B61FF] cursor-pointer"
              />
            </div>
          </div>

          {/* Fullscreen Button */}
          <button 
            id="btn-cam-maximize"
            onClick={() => setFullscreenMode(true)}
            title="View Full resolution stream"
            className={`p-3 backdrop-blur-md rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer border ${
              darkMode 
                ? 'bg-slate-900/85 hover:bg-slate-800 text-slate-200 border-slate-700' 
                : 'bg-white/90 hover:bg-white text-slate-800 border-white'
            }`}
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
