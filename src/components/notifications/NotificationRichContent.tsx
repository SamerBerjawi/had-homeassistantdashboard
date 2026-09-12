/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { useAutoLayoutStore } from '../../store/useAutoLayoutStore';

interface ParsedImage {
  src: string;
  alt: string;
}

interface NotificationRichContentProps {
  content: string;
  imageUrl?: string;
  darkMode?: boolean;
  compact?: boolean;
}

export default function NotificationRichContent({
  content,
  imageUrl,
  darkMode = true,
  compact = false
}: NotificationRichContentProps) {
  const serverUrl = useAutoLayoutStore(s => s.serverUrl);

  // Helper to normalize image URL (e.g. resolve relative HA URLs)
  const resolveImageUrl = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url;
    }
    if (url.startsWith('/') && serverUrl) {
      const cleanServer = serverUrl.replace(/\/+$/, '');
      return `${cleanServer}${url}`;
    }
    return url;
  };

  // Parse markdown content, extracting images, headings, and clean text
  const { images, headings, cleanText } = useMemo(() => {
    const rawImages: ParsedImage[] = [];

    // Add explicitly provided image if any
    if (imageUrl) {
      rawImages.push({
        src: resolveImageUrl(imageUrl),
        alt: 'Notification Image'
      });
    }

    if (!content) {
      return { images: rawImages, headings: [], cleanText: '' };
    }

    let workingText = content;

    // 1. Extract Markdown Images: ![alt](url)
    const mdImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let match: RegExpExecArray | null;
    while ((match = mdImageRegex.exec(workingText)) !== null) {
      const alt = match[1] || 'Notification Image';
      const src = resolveImageUrl(match[2].trim());
      if (src && !rawImages.some(img => img.src === src)) {
        rawImages.push({ src, alt });
      }
    }
    workingText = workingText.replace(mdImageRegex, '');

    // 2. Extract HTML Images: <img ... src="..." ... />
    const htmlImageRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi;
    while ((match = htmlImageRegex.exec(workingText)) !== null) {
      const src = resolveImageUrl(match[1].trim());
      if (src && !rawImages.some(img => img.src === src)) {
        rawImages.push({ src, alt: 'Notification Image' });
      }
    }
    workingText = workingText.replace(htmlImageRegex, '');

    // 3. Extract Markdown Headings: e.g. ### Heading or ## Heading
    const headingsList: string[] = [];
    const lines = workingText.split('\n');
    const remainingLines: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
      if (headingMatch) {
        headingsList.push(headingMatch[1].trim());
      } else {
        // Check inline headings like "### Heading Text"
        const inlineHeadingMatch = line.match(/###+\s*([^\n\r.]+)(\.|\n|$)/);
        if (inlineHeadingMatch && inlineHeadingMatch[1]) {
          headingsList.push(inlineHeadingMatch[1].trim());
          const cleanedLine = line.replace(/###+\s*([^\n\r.]+)(\.|\n|$)/, '$2').trim();
          if (cleanedLine) remainingLines.push(cleanedLine);
        } else {
          remainingLines.push(line);
        }
      }
    }

    const cleaned = remainingLines.join('\n').trim();

    return {
      images: rawImages,
      headings: headingsList,
      cleanText: cleaned
    };
  }, [content, imageUrl, serverUrl]);

  // Helper to format inline markdown (bold, links, code)
  const formatInlineText = (text: string) => {
    // Replace markdown links [label](url)
    const parts = [];
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
          onClick={(e) => e.stopPropagation()}
          className="text-sky-500 hover:text-sky-400 font-semibold underline underline-offset-2 transition-colors inline-flex items-center gap-1"
        >
          <span>{label}</span>
          <ArrowSquareOut size={12} weight="bold" />
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="space-y-2.5">
      {/* Extracted Headings */}
      {headings.length > 0 && (
        <div className="space-y-1">
          {headings.map((h, i) => (
            <h5 
              key={`heading-${i}`} 
              className={`text-xs sm:text-sm font-extrabold tracking-tight ${
                darkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              {h}
            </h5>
          ))}
        </div>
      )}

      {/* Main Cleaned Body Text */}
      {cleanText ? (
        <div className={`${compact ? 'text-[11px] leading-snug line-clamp-3 hover:line-clamp-none' : 'text-xs leading-relaxed'} break-words whitespace-pre-wrap ${
          darkMode ? 'text-slate-300' : 'text-slate-700'
        }`}>
          {formatInlineText(cleanText)}
        </div>
      ) : null}

      {/* Embedded Images - Display full image without cropping */}
      {images.length > 0 && (
        <div className={`pt-1.5 grid gap-2.5 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {images.map((img, idx) => (
            <div
              key={`img-${idx}`}
              className="w-full rounded-xl overflow-hidden flex items-center justify-center bg-black/10 dark:bg-black/35 border border-black/5 dark:border-white/10 p-1.5 sm:p-2 transition-all hover:border-black/15 dark:hover:border-white/20 cursor-pointer group/nimg"
              onClick={(e) => {
                e.stopPropagation();
                if (img.src) window.open(img.src, '_blank');
              }}
              title="Click to view full image"
            >
              <img
                src={img.src}
                alt={img.alt || 'Notification image'}
                loading="lazy"
                className="max-w-full w-auto h-auto max-h-[500px] object-contain rounded-lg select-none transition-transform duration-200 group-hover/nimg:scale-[1.01]"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'p-4 text-center text-xs text-slate-400 font-medium';
                    fallback.innerText = 'Image attachment unavailable';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
