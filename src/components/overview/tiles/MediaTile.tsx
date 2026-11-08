/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Pause, CaretRight, MusicNotes, SkipBack, SkipForward, SpeakerHigh } from '@phosphor-icons/react';
import { getHAImageUrl } from '../../../lib/utils';
import type { TileProps } from './types';

export default function MediaTile({ s, is2x }: TileProps) {
  const {
    activeMedia,
    darkMode,
    handleNextTrack,
    handlePreviousTrack,
    handleTogglePlayPause,
    isPlayingMedia,
    mediaPalette,
    serverUrl,
    tileBaseClass
  } = s;

  const mediaArt = getHAImageUrl(activeMedia?.attributes?.entity_picture || activeMedia?.attributes?.media_image, serverUrl);
  const volumePct = typeof activeMedia?.attributes?.volume_level === 'number'
    ? Math.round(activeMedia.attributes.volume_level * 100)
    : undefined;
  const trackTitle = activeMedia?.attributes?.media_title || (isPlayingMedia ? 'Playing Media' : 'No Media Playing');
  const trackArtist = activeMedia?.attributes?.media_artist || (activeMedia ? activeMedia.name : 'Audio Idle');
  const appOrAlbum = activeMedia?.attributes?.app_name || activeMedia?.attributes?.media_album_name || (isPlayingMedia ? 'Active Playback' : 'Tap to open player');

  const hasActiveMedia = isPlayingMedia || !!mediaArt;
  const dynamicCardStyle: React.CSSProperties = hasActiveMedia
    ? {
        borderColor: mediaPalette.badgeBorder,
        boxShadow: `0 10px 25px -5px ${mediaPalette.glowSubtle}, 4px 6px 12px rgba(0, 0, 0, 0.15)`,
        background: mediaArt
          ? (darkMode ? 'rgba(10, 15, 29, 0.65)' : 'rgba(255, 255, 255, 0.78)')
          : (darkMode
              ? `linear-gradient(135deg, ${mediaPalette.glowSubtle} 0%, rgba(15, 23, 42, 0.85) 100%)`
              : `linear-gradient(135deg, ${mediaPalette.glowSubtle} 0%, rgba(255, 255, 255, 0.88) 100%)`),
      }
    : {};

  if (is2x) {
    return (
      <div
        className={tileBaseClass(
          hasActiveMedia,
          darkMode ? 'text-white' : 'text-slate-900',
          false,
          true
        )}
        style={dynamicCardStyle}
      >
        {/* Dynamic Blurred Album Artwork Background */}
        {mediaArt && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
            <img loading="lazy" decoding="async"
              src={mediaArt}
              alt=""
              className="w-full h-full object-cover scale-125 filter blur-2xl opacity-40 dark:opacity-45 transition-opacity duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/55 to-slate-950/35 dark:block hidden" />
            <div className="absolute inset-0 bg-gradient-to-t from-white/92 via-white/75 to-white/50 dark:hidden block" />
          </div>
        )}

        {/* Ambient Artwork Glow */}
        <div
          className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full blur-3xl opacity-35 dark:opacity-30 pointer-events-none transition-all duration-700"
          style={{ backgroundColor: mediaPalette.primary }}
        />

        {/* Top Bar: Now Playing Equalizer Badge & Caret aligned to the right */}
        <div className="flex items-center justify-end gap-2 relative z-10 shrink-0">
          {isPlayingMedia && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-black uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: mediaPalette.badgeBg,
                borderColor: mediaPalette.badgeBorder,
                color: mediaPalette.badgeText,
              }}
            >
              <div className="flex items-end gap-0.5 h-2.5">
                <span className="w-0.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: mediaPalette.primary }} />
                <span className="w-0.5 h-1.5 rounded-full animate-pulse [animation-delay:150ms]" style={{ backgroundColor: mediaPalette.primary }} />
                <span className="w-0.5 h-2 rounded-full animate-pulse [animation-delay:300ms]" style={{ backgroundColor: mediaPalette.primary }} />
              </div>
              <span>Now Playing</span>
            </div>
          )}

          <div
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all group-hover:translate-x-0.5 shrink-0"
            style={{ color: hasActiveMedia ? (darkMode ? mediaPalette.light : mediaPalette.badgeText) : undefined }}
          >
            <CaretRight size={14} weight="bold" />
          </div>
        </div>

        {/* Center Hero: Artwork, Track Info & Full Transport Controls (brought up to optimize space) */}
        <div className="relative z-10 flex items-center justify-between gap-3.5 w-full -mt-2 sm:-mt-2.5">
          {/* Left: Artwork + Track details */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl overflow-hidden shadow-lg border shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform duration-300"
              style={{ borderColor: hasActiveMedia ? mediaPalette.badgeBorder : undefined }}
            >
              {mediaArt ? (
                <img loading="lazy" decoding="async"
                  src={mediaArt}
                  alt="Album artwork"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    backgroundColor: hasActiveMedia ? mediaPalette.badgeBg : (darkMode ? 'rgba(147, 51, 234, 0.2)' : 'rgba(243, 232, 255, 1)'),
                    color: hasActiveMedia ? mediaPalette.primary : (darkMode ? '#d8b4fe' : '#9333ea'),
                  }}
                >
                  <MusicNotes size={28} weight="duotone" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate leading-tight">
                {trackTitle}
              </h4>
              <p
                className="text-xs sm:text-sm font-bold truncate mt-1 transition-colors leading-tight"
                style={{ color: hasActiveMedia ? (darkMode ? mediaPalette.light : mediaPalette.badgeText) : undefined }}
              >
                {trackArtist}
              </p>
            </div>
          </div>

          {/* Right: Transport Control Deck */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 relative z-20" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handlePreviousTrack}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 border shadow-2xs text-slate-700 dark:text-slate-200"
              style={{
                backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
                borderColor: hasActiveMedia ? mediaPalette.badgeBorder : undefined,
              }}
              title="Previous Track"
            >
              <SkipBack size={15} weight="fill" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlayPause}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 shrink-0 text-white font-black"
              style={{
                backgroundColor: hasActiveMedia ? mediaPalette.primary : '#9333ea',
                boxShadow: hasActiveMedia ? `0 8px 20px -4px ${mediaPalette.glow}` : '0 8px 20px -4px rgba(147, 51, 234, 0.4)',
              }}
              title={isPlayingMedia ? 'Pause Audio' : 'Play Audio'}
            >
              {isPlayingMedia ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleNextTrack}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 border shadow-2xs text-slate-700 dark:text-slate-200"
              style={{
                backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)',
                borderColor: hasActiveMedia ? mediaPalette.badgeBorder : undefined,
              }}
              title="Next Track"
            >
              <SkipForward size={15} weight="fill" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Active Player Name & Bigger Volume */}
        <div className="relative z-10 flex items-center justify-between text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <SpeakerHigh
              size={13}
              weight="bold"
              className="shrink-0"
              style={{ color: hasActiveMedia ? mediaPalette.primary : undefined }}
            />
            <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
              {activeMedia?.name || 'Media Player'}
            </span>
          </div>
          {volumePct !== undefined && (
            <div
              className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-black tracking-tight shrink-0 ml-2"
              style={{ color: hasActiveMedia ? (darkMode ? mediaPalette.light : mediaPalette.badgeText) : undefined }}
            >
              <SpeakerHigh size={14} weight="bold" />
              <span>{volumePct}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 1x Compact Mode
  return (
    <div
      className={tileBaseClass(
        hasActiveMedia,
        darkMode ? 'text-white' : 'text-slate-900',
        false,
        false
      )}
      style={dynamicCardStyle}
    >
      {/* Dynamic Blurred Album Artwork Background */}
      {mediaArt && (
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">
          <img loading="lazy" decoding="async"
            src={mediaArt}
            alt=""
            className="w-full h-full object-cover scale-125 filter blur-2xl opacity-40 dark:opacity-45 transition-opacity duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/55 to-slate-950/35 dark:block hidden" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/92 via-white/75 to-white/50 dark:hidden block" />
        </div>
      )}

      {/* Ambient Artwork Glow */}
      <div
        className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full blur-2xl opacity-35 dark:opacity-25 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: mediaPalette.primary }}
      />

      {/* Top Row: Artwork/Icon on left, Controls on right */}
      <div className="flex items-center justify-between relative z-10">
        <div
          className="relative w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-2xl overflow-hidden shadow-xs border shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform"
          style={{ borderColor: hasActiveMedia ? mediaPalette.badgeBorder : undefined }}
        >
          {mediaArt ? (
            <img loading="lazy" decoding="async"
              src={mediaArt}
              alt="Album artwork"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                backgroundColor: hasActiveMedia ? mediaPalette.badgeBg : (darkMode ? 'rgba(147, 51, 234, 0.2)' : 'rgba(243, 232, 255, 1)'),
                color: hasActiveMedia ? mediaPalette.primary : (darkMode ? '#d8b4fe' : '#9333ea'),
              }}
            >
              <MusicNotes size={19} weight="duotone" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {isPlayingMedia && (
            <div
              className="flex items-end gap-0.5 h-2.5 px-1.5 py-0.5 rounded-full border hidden sm:flex"
              style={{
                backgroundColor: mediaPalette.badgeBg,
                borderColor: mediaPalette.badgeBorder,
              }}
            >
              <span className="w-0.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: mediaPalette.primary }} />
              <span className="w-0.5 h-1.5 rounded-full animate-pulse [animation-delay:150ms]" style={{ backgroundColor: mediaPalette.primary }} />
              <span className="w-0.5 h-2 rounded-full animate-pulse [animation-delay:300ms]" style={{ backgroundColor: mediaPalette.primary }} />
            </div>
          )}
          <button
            type="button"
            onClick={handleTogglePlayPause}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 text-white font-black"
            style={{
              backgroundColor: hasActiveMedia ? mediaPalette.primary : '#9333ea',
              boxShadow: hasActiveMedia ? `0 6px 16px -3px ${mediaPalette.glow}` : '0 6px 16px -3px rgba(147, 51, 234, 0.35)',
            }}
            title={isPlayingMedia ? 'Pause Audio' : 'Play Audio'}
          >
            {isPlayingMedia ? <Pause size={13} weight="fill" /> : <Play size={13} weight="fill" className="ml-0.5" />}
          </button>
        </div>
      </div>

      {/* Middle: Title & Artist */}
      <div className="relative z-10 my-0.5 min-w-0">
        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
          {trackTitle}
        </h4>
        <p
          className="text-[11px] sm:text-xs font-bold truncate mt-0.5 transition-colors"
          style={{ color: hasActiveMedia ? (darkMode ? mediaPalette.light : mediaPalette.badgeText) : undefined }}
        >
          {trackArtist}
        </p>
      </div>

      {/* Bottom: Device Name & Subtitle with Chevron */}
      <div className="relative z-10">
        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
          {activeMedia?.name || 'Media Player'}
        </div>
        <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-between">
          <span className="truncate">{isPlayingMedia ? 'Now Playing' : 'Audio Idle'}{volumePct !== undefined ? ` • ${volumePct}% vol` : ''}</span>
          <CaretRight
            size={13}
            weight="bold"
            className="text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-1"
            style={{ color: hasActiveMedia ? (darkMode ? mediaPalette.light : mediaPalette.badgeText) : undefined }}
          />
        </div>
      </div>
    </div>
  );
}
