/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  sublabel?: string;
  disabled?: boolean;
}

export interface CustomDropdownProps {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  options: (DropdownOption | string)[];
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  menuClassName?: string;
  searchable?: boolean;
  darkMode?: boolean;
  placement?: 'auto' | 'top' | 'bottom';
}

export default function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  label,
  icon,
  disabled = false,
  size = 'md',
  className = '',
  menuClassName = '',
  searchable = false,
  placement: preferredPlacement = 'auto'
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actualPlacement, setActualPlacement] = useState<'top' | 'bottom'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Normalize options to DropdownOption format
  const normalizedOptions: DropdownOption[] = options.map(opt => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));

  // Filter options if searchable
  const filteredOptions = searchable && searchQuery.trim()
    ? normalizedOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : normalizedOptions;

  // Compute collision detection / placement
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      if (preferredPlacement !== 'auto') {
        setActualPlacement(preferredPlacement);
        return;
      }
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 240px below and more room above, flip to top
      if (spaceBelow < 240 && rect.top > 240) {
        setActualPlacement('top');
      } else {
        setActualPlacement('bottom');
      }
    }
  }, [isOpen, preferredPlacement]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, searchable]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (val: string, optionDisabled?: boolean) => {
    if (optionDisabled) return;
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs rounded-xl gap-2',
    md: 'h-9 px-3.5 text-xs rounded-2xl gap-2',
    lg: 'h-11 px-4 text-sm rounded-2xl gap-2.5'
  }[size];

  return (
    <div className={`relative inline-block w-full text-left ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between font-bold border transition-all cursor-pointer select-none backdrop-blur-md shadow-2xs ${sizeClasses} ${
          disabled
            ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400'
            : isOpen
              ? 'bg-white/95 dark:bg-slate-900/95 border-cyan-500/80 ring-2 ring-cyan-500/20 text-slate-950 dark:text-white shadow-md'
              : 'bg-slate-900/[0.04] hover:bg-white/90 dark:bg-white/5 dark:hover:bg-white/10 border-slate-900/[0.08] dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/20'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {icon && <span className="shrink-0 text-slate-500 dark:text-slate-400">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 text-[9px] font-extrabold shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <CaretDown
          size={13}
          weight="bold"
          className={`shrink-0 text-slate-400 dark:text-slate-400 transition-transform duration-200 ml-2 ${
            isOpen ? 'rotate-180 text-cyan-500' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: actualPlacement === 'top' ? 4 : -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: actualPlacement === 'top' ? 4 : -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute z-70 w-full min-w-[200px] rounded-2xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200/90 dark:border-white/15 shadow-2xl overflow-hidden ${
              actualPlacement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            } ${menuClassName}`}
            style={{ maxHeight: '260px' }}
          >
            {/* Search Input Filter */}
            {searchable && (
              <div className="p-2 border-b border-slate-100 dark:border-white/10 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
                <div className="relative">
                  <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-white/10 border-0 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="p-1.5 space-y-0.5 max-h-52 overflow-y-auto custom-scrollbar" role="listbox">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                  No matching options
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = String(option.value) === String(value);

                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => handleSelect(String(option.value), option.disabled)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                        option.disabled
                          ? 'opacity-40 cursor-not-allowed text-slate-400'
                          : isSelected
                            ? 'bg-cyan-500/15 text-cyan-900 dark:text-cyan-300 font-black'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10'
                      }`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center gap-2 min-w-0 truncate">
                        {option.icon && <span className="shrink-0">{option.icon}</span>}
                        <div className="min-w-0 truncate">
                          <span className="block truncate">{option.label}</span>
                          {option.sublabel && (
                            <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500 truncate">
                              {option.sublabel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {option.badge && (
                          <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[9px] font-bold">
                            {option.badge}
                          </span>
                        )}
                        {isSelected && <Check size={14} weight="bold" className="text-cyan-600 dark:text-cyan-400" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
