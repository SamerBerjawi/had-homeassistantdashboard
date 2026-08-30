/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { X, UploadSimple, Trash, Image, Sparkle, Car, Bicycle, Check } from '@phosphor-icons/react';

interface VehicleCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: 'car' | 'bike';
  currentCarImage?: string;
  currentCarLogo?: string;
  currentBikeImage?: string;
  currentBikeLogo?: string;
  onSaveAsset: (type: 'car_image' | 'car_logo' | 'bike_image' | 'bike_logo', dataUrl: string) => void;
  onResetAssets: (target: 'car' | 'bike') => void;
  darkMode?: boolean;
}

export function VehicleCustomizerModal({
  isOpen,
  onClose,
  target: initialTarget,
  currentCarImage,
  currentCarLogo,
  currentBikeImage,
  currentBikeLogo,
  onSaveAsset,
  onResetAssets,
  darkMode = true
}: VehicleCustomizerModalProps) {
  const [activeTab, setActiveTab] = useState<'car' | 'bike'>(initialTarget);
  const [carImageDraft, setCarImageDraft] = useState<string | undefined>(currentCarImage);
  const [carLogoDraft, setCarLogoDraft] = useState<string | undefined>(currentCarLogo);
  const [bikeImageDraft, setBikeImageDraft] = useState<string | undefined>(currentBikeImage);
  const [bikeLogoDraft, setBikeLogoDraft] = useState<string | undefined>(currentBikeLogo);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  const carImgInputRef = useRef<HTMLInputElement>(null);
  const carLogoInputRef = useRef<HTMLInputElement>(null);
  const bikeImgInputRef = useRef<HTMLInputElement>(null);
  const bikeLogoInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTarget);
      setCarImageDraft(currentCarImage);
      setCarLogoDraft(currentCarLogo);
      setBikeImageDraft(currentBikeImage);
      setBikeLogoDraft(currentBikeLogo);
    }
  }, [isOpen, initialTarget, currentCarImage, currentCarLogo, currentBikeImage, currentBikeLogo]);

  if (!isOpen) return null;

  const handleFileUpload = (
    e: ChangeEvent<HTMLInputElement>,
    type: 'car_image' | 'car_logo' | 'bike_image' | 'bike_logo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (type === 'car_image') setCarImageDraft(result);
      if (type === 'car_logo') setCarLogoDraft(result);
      if (type === 'bike_image') setBikeImageDraft(result);
      if (type === 'bike_logo') setBikeLogoDraft(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (
    e: DragEvent<HTMLDivElement>,
    type: 'car_image' | 'car_logo' | 'bike_image' | 'bike_logo'
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (type === 'car_image') setCarImageDraft(result);
      if (type === 'car_logo') setCarLogoDraft(result);
      if (type === 'bike_image') setBikeImageDraft(result);
      if (type === 'bike_logo') setBikeLogoDraft(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (activeTab === 'car') {
      if (carImageDraft) onSaveAsset('car_image', carImageDraft);
      if (carLogoDraft) onSaveAsset('car_logo', carLogoDraft);
    } else {
      if (bikeImageDraft) onSaveAsset('bike_image', bikeImageDraft);
      if (bikeLogoDraft) onSaveAsset('bike_logo', bikeLogoDraft);
    }
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    onResetAssets(activeTab);
    if (activeTab === 'car') {
      setCarImageDraft(undefined);
      setCarLogoDraft(undefined);
    } else {
      setBikeImageDraft(undefined);
      setBikeLogoDraft(undefined);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          darkMode
            ? 'bg-slate-900/95 border-white/15 text-white shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300'
        }`}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Sparkle size={20} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">Customize Vehicle Appearance</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Upload custom vehicle renders and manufacturer logos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Modal"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="p-4 bg-slate-100/60 dark:bg-white/[0.02] border-b border-slate-200/60 dark:border-white/10 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('car')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'car'
                ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/10'
            }`}
          >
            <Car size={16} weight="bold" />
            <span>Electric Vehicle</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bike')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'bike'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white/10'
            }`}
          >
            <Bicycle size={16} weight="bold" />
            <span>Smart E-Bike</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {activeTab === 'car' ? (
            <>
              {/* Car Main Image Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Vehicle Render PNG (Transparent background recommended)
                  </label>
                  {carImageDraft && (
                    <button
                      type="button"
                      onClick={() => setCarImageDraft(undefined)}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash size={12} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'car_image')}
                  onClick={() => carImgInputRef.current?.click()}
                  className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    carImageDraft
                      ? 'border-cyan-500/50 bg-cyan-500/5'
                      : 'border-slate-300 dark:border-white/15 hover:border-cyan-500/50 bg-slate-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <input
                    ref={carImgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'car_image')}
                  />
                  {carImageDraft ? (
                    <div className="space-y-2">
                      <img
                        src={carImageDraft}
                        alt="Car Preview"
                        className="max-h-28 max-w-full object-contain mx-auto drop-shadow-xl"
                      />
                      <p className="text-[11px] text-cyan-400 font-bold">Click or drag to replace image</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-4">
                      <UploadSimple size={28} weight="duotone" className="mx-auto text-slate-400 dark:text-slate-500" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Click to browse or drag & drop PNG/JPG
                      </p>
                      <p className="text-[10px] text-slate-500">Supports transparent Mach-E / Lightning / Tesla cutouts</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Car Brand Logo Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Manufacturer / Custom Logo
                  </label>
                  {carLogoDraft && (
                    <button
                      type="button"
                      onClick={() => setCarLogoDraft(undefined)}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash size={12} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'car_logo')}
                  onClick={() => carLogoInputRef.current?.click()}
                  className={`p-3 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 cursor-pointer transition-all ${
                    carLogoDraft
                      ? 'border-cyan-500/50 bg-cyan-500/5'
                      : 'border-slate-300 dark:border-white/15 hover:border-cyan-500/50 bg-slate-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <input
                    ref={carLogoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'car_logo')}
                  />
                  {carLogoDraft ? (
                    <div className="flex items-center gap-3">
                      <img src={carLogoDraft} alt="Brand Logo" className="h-8 max-w-[120px] object-contain" />
                      <span className="text-[11px] font-bold text-cyan-400">Replace logo</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-1 text-slate-500">
                      <Image size={18} weight="duotone" />
                      <span className="text-xs font-bold">Upload Custom Brand Logo (PNG)</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Bike Main Image Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    E-Bike Render PNG
                  </label>
                  {bikeImageDraft && (
                    <button
                      type="button"
                      onClick={() => setBikeImageDraft(undefined)}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash size={12} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'bike_image')}
                  onClick={() => bikeImgInputRef.current?.click()}
                  className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    bikeImageDraft
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-slate-300 dark:border-white/15 hover:border-amber-500/50 bg-slate-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <input
                    ref={bikeImgInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'bike_image')}
                  />
                  {bikeImageDraft ? (
                    <div className="space-y-2">
                      <img
                        src={bikeImageDraft}
                        alt="Bike Preview"
                        className="max-h-28 max-w-full object-contain mx-auto drop-shadow-xl"
                      />
                      <p className="text-[11px] text-amber-400 font-bold">Click or drag to replace image</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-4">
                      <UploadSimple size={28} weight="duotone" className="mx-auto text-slate-400 dark:text-slate-500" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Click to browse or drag & drop PNG/JPG
                      </p>
                      <p className="text-[10px] text-slate-500">Upload side-profile transparent Dark Avenger or E-Bike PNG</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bike Logo Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    E-Bike Brand Logo
                  </label>
                  {bikeLogoDraft && (
                    <button
                      type="button"
                      onClick={() => setBikeLogoDraft(undefined)}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash size={12} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'bike_logo')}
                  onClick={() => bikeLogoInputRef.current?.click()}
                  className={`p-3 rounded-2xl border-2 border-dashed flex items-center justify-center gap-3 cursor-pointer transition-all ${
                    bikeLogoDraft
                      ? 'border-amber-500/50 bg-amber-500/5'
                      : 'border-slate-300 dark:border-white/15 hover:border-amber-500/50 bg-slate-50 dark:bg-white/[0.02]'
                  }`}
                >
                  <input
                    ref={bikeLogoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'bike_logo')}
                  />
                  {bikeLogoDraft ? (
                    <div className="flex items-center gap-3">
                      <img src={bikeLogoDraft} alt="Bike Logo" className="h-8 max-w-[120px] object-contain" />
                      <span className="text-[11px] font-bold text-amber-400">Replace logo</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 py-1 text-slate-500">
                      <Image size={18} weight="duotone" />
                      <span className="text-xs font-bold">Upload Custom Brand Logo (PNG)</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-3 bg-slate-100/50 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
          >
            Reset to Default
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              {savedFeedback ? (
                <>
                  <Check size={14} weight="bold" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save & Apply</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
