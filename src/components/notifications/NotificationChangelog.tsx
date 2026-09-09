/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  CaretDown,
  ArrowSquareOut,
  ArrowsClockwise,
  Article,
  CheckCircle,
  Tag
} from '@phosphor-icons/react';
import { HANotificationItem } from '../../types/notifications';
import { haWebSocketService } from '../../services/haWebSocket';
import { safeOpenExternalUrl } from '../../lib/utils';

interface NotificationChangelogProps {
  item: HANotificationItem;
  darkMode?: boolean;
}

/**
 * Parses simple Markdown headers, bullet lists, bold text, code, and links
 * into formatted React elements.
 */
function FormattedChangelog({ content, darkMode = true }: { content: string; darkMode?: boolean }) {
  const lines = content.split('\n');

  const formatInlineText = (text: string) => {
    // Replace markdown links [label](url)
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let linkMatch: RegExpExecArray | null;

    while ((linkMatch = linkRegex.exec(text)) !== null) {
      if (linkMatch.index > lastIndex) {
        parts.push(text.substring(lastIndex, linkMatch.index));
      }
      const label = linkMatch[1];
      const href = linkMatch[2];
      parts.push(
        <a
          key={`link-${linkMatch.index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
            safeOpenExternalUrl(href);
          }}
          className="text-sky-500 hover:text-sky-400 underline underline-offset-2 font-medium inline-flex items-center gap-0.5"
        >
          <span>{label}</span>
          <ArrowSquareOut size={10} />
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // Now format bold **text** in string parts
    return parts.map((part, pIdx) => {
      if (typeof part !== 'string') return part;

      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      if (boldParts.length === 1) return part;

      return (
        <span key={`bold-group-${pIdx}`}>
          {boldParts.map((bPart, bIdx) => {
            if (bPart.startsWith('**') && bPart.endsWith('**')) {
              return (
                <strong key={`b-${bIdx}`} className={darkMode ? 'text-white font-bold' : 'text-slate-950 font-bold'}>
                  {bPart.slice(2, -2)}
                </strong>
              );
            }
            return bPart;
          })}
        </span>
      );
    });
  };

  return (
    <div className="space-y-1.5 text-xs">
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={`empty-${idx}`} className="h-1" />;

        // Heading 1 & 2
        if (line.startsWith('# ') || line.startsWith('## ')) {
          const title = line.replace(/^#{1,2}\s+/, '');
          return (
            <div key={`h-${idx}`} className="pt-2 pb-1 border-b border-white/5 first:pt-0">
              <h5 className={`font-black text-xs sm:text-[13px] tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {title}
              </h5>
            </div>
          );
        }

        // Heading 3
        if (line.startsWith('### ')) {
          const title = line.replace(/^###\s+/, '');
          return (
            <h6 key={`h3-${idx}`} className={`font-bold text-xs pt-1.5 ${darkMode ? 'text-sky-300' : 'text-sky-700'}`}>
              {title}
            </h6>
          );
        }

        // Bullet point
        if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
          const bulletText = line.replace(/^[-*•]\s+/, '');
          return (
            <div key={`bullet-${idx}`} className="flex items-start gap-2 pl-1 leading-relaxed">
              <span className="text-sky-400 mt-1 select-none text-[10px] shrink-0">•</span>
              <div className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                {formatInlineText(bulletText)}
              </div>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={`p-${idx}`} className={`leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {formatInlineText(line)}
          </p>
        );
      })}
    </div>
  );
}

export default function NotificationChangelog({
  item,
  darkMode = true
}: NotificationChangelogProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [changelogContent, setChangelogContent] = useState<string | null>(item.releaseNotes || null);

  // Sync if item.releaseNotes updates externally
  useEffect(() => {
    if (item.releaseNotes) {
      setChangelogContent(item.releaseNotes);
    }
  }, [item.releaseNotes]);

  // When user expands, if notes are not yet loaded and this is an update entity, fetch from WebSocket
  const handleToggle = async () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);

    if (nextState && !changelogContent && item.entity_id?.startsWith('update.')) {
      setIsLoading(true);
      try {
        const notes = await haWebSocketService.getReleaseNotes(item.entity_id);
        if (notes) {
          setChangelogContent(notes);
        }
      } catch (err) {
        console.debug('[NotificationChangelog] Failed to fetch release notes:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Has content to show or load
  const hasNotesOrSummary = Boolean(
    changelogContent ||
    item.releaseNotes ||
    item.releaseSummary ||
    item.releaseUrl ||
    item.category === 'update'
  );

  if (!hasNotesOrSummary) {
    return null;
  }

  const effectiveContent = changelogContent || item.releaseNotes || item.releaseSummary || '';

  return (
    <div className="w-full pt-1">
      {/* Expand / Collapse Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none active:scale-98 ${
          isExpanded
            ? darkMode
              ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 shadow-xs'
              : 'bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 shadow-xs'
            : darkMode
              ? 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06]'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200'
        }`}
        title={isExpanded ? 'Collapse changelog' : 'Expand changelog and release notes'}
      >
        <Article size={13} weight="duotone" className="text-sky-400 shrink-0" />
        <span>Changelog & Release Notes</span>
        {item.latestVersion && (
          <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${darkMode ? 'bg-white/10 text-sky-200' : 'bg-slate-200 text-slate-800'}`}>
            v{item.latestVersion}
          </span>
        )}
        <CaretDown
          size={11}
          weight="bold"
          className={`shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expandable Content Panel */}
      {isExpanded && (
        <div
          className={`mt-2 p-3 rounded-xl border text-xs leading-relaxed max-h-72 overflow-y-auto custom-scrollbar space-y-2.5 transition-all duration-200 ${
            darkMode
              ? 'bg-black/35 border-white/10 text-slate-200'
              : 'bg-slate-50 border-slate-200 text-slate-800 shadow-inner'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-5 text-xs text-sky-400 font-medium">
              <ArrowsClockwise size={15} className="animate-spin" />
              <span>Fetching changelog from Home Assistant...</span>
            </div>
          ) : effectiveContent ? (
            <div className="space-y-3">
              <FormattedChangelog content={effectiveContent} darkMode={darkMode} />

              {/* Footer with External Link */}
              {item.releaseUrl && (
                <div className={`pt-2.5 mt-2 border-t flex items-center justify-between flex-wrap gap-2 ${
                  darkMode ? 'border-white/5' : 'border-slate-200'
                }`}>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Official release announcement & full changelog
                  </span>
                  <a
                    href={item.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      safeOpenExternalUrl(item.releaseUrl!);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-500 hover:text-sky-400 hover:underline"
                  >
                    <span>View Full Changelog</span>
                    <ArrowSquareOut size={12} weight="bold" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-center text-slate-400 text-xs">
              No detailed release notes provided for this version.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
