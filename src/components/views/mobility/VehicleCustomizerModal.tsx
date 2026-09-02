import React, { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { X, UploadSimple, Trash, Sparkle, Car, Bicycle, Check, Sliders, BatteryCharging, Lightning, Warning } from '@phosphor-icons/react';
import { resolveAssetUrl } from '../../../utils/assetUrl';
import { optimizeImageForUpload } from '../../../utils/imageOptimizer';

interface VehicleCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: 'car' | 'bike';
  currentCarName?: string;
  currentCarTargetSoc?: number;
  currentCarBatteryCapacity?: number;
  currentCarImage?: string;
  currentCarLogo?: string;
  currentBikeName?: string;
  currentBikeImage?: string;
  currentBikeLogo?: string;
  onSaveAsset: (type: 'car_image' | 'car_logo' | 'bike_image' | 'bike_logo', dataUrl: string) => Promise<string>;
  onSaveSettings?: (settings: {
    car?: {
      customName?: string;
      targetSocDefault?: number;
      batteryCapacityKwh?: number;
      vehicleImageUrl?: string;
      brandLogoUrl?: string;
    };
    bike?: {
      customName?: string;
      bikeImageUrl?: string;
      brandLogoUrl?: string;
    };
  }) => Promise<void> | void;
  onResetAssets: (target: 'car' | 'bike') => void;
  darkMode?: boolean;
}

export function VehicleCustomizerModal({
  isOpen,
  onClose,
  target: initialTarget,
  currentCarName = 'Porsche Taycan 4S',
  currentCarTargetSoc = 80,
  currentCarBatteryCapacity = 93.4,
  currentCarImage,
  currentCarLogo,
  currentBikeName = 'VanMoof S3',
  currentBikeImage,
  currentBikeLogo,
  onSaveAsset,
  onSaveSettings,
  onResetAssets,
  darkMode = true
}: VehicleCustomizerModalProps) {
  const [activeTab, setActiveTab] = useState<'car' | 'bike'>(initialTarget);
  const [carNameDraft, setCarNameDraft] = useState<string>(currentCarName);
  const [carTargetSocDraft, setCarTargetSocDraft] = useState<number>(currentCarTargetSoc);
  const [carCapacityDraft, setCarCapacityDraft] = useState<number>(currentCarBatteryCapacity);
  const [carImageDraft, setCarImageDraft] = useState<string | undefined>(currentCarImage);
  const [carLogoDraft, setCarLogoDraft] = useState<string | undefined>(currentCarLogo);

  const [bikeNameDraft, setBikeNameDraft] = useState<string>(currentBikeName);
  const [bikeImageDraft, setBikeImageDraft] = useState<string | undefined>(currentBikeImage);
  const [bikeLogoDraft, setBikeLogoDraft] = useState<string | undefined>(currentBikeLogo);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const carImgInputRef = useRef<HTMLInputElement>(null);
  const carLogoInputRef = useRef<HTMLInputElement>(null);
  const bikeImgInputRef = useRef<HTMLInputElement>(null);
  const bikeLogoInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTarget);
      setCarNameDraft(currentCarName);
      setCarTargetSocDraft(currentCarTargetSoc);
      setCarCapacityDraft(currentCarBatteryCapacity);
      setCarImageDraft(currentCarImage);
      setCarLogoDraft(currentCarLogo);
      setBikeNameDraft(currentBikeName);
      setBikeImageDraft(currentBikeImage);
      setBikeLogoDraft(currentBikeLogo);
      setUploadError(null);
    }
  }, [isOpen, initialTarget, currentCarName, currentCarTargetSoc, currentCarBatteryCapacity, currentCarImage, currentCarLogo, currentBikeName, currentBikeImage, currentBikeLogo]);

  if (!isOpen) return null;

  const processFile = async (
    file: File,
    type: 'car_image' | 'car_logo' | 'bike_image' | 'bike_logo'
  ) => {
    setUploadError(null);
    try {
      const isLogo = type.endsWith('_logo');
      const maxDim = isLogo ? 1024 : 1920;
      const optimized = await optimizeImageForUpload(file, {
        maxDimension: maxDim,
        maxSizeBytes: 1.5 * 1024 * 1024
      });

      if (type === 'car_image') setCarImageDraft(optimized.dataUrl);
      if (type === 'car_logo') setCarLogoDraft(optimized.dataUrl);
      if (type === 'bike_image') setBikeImageDraft(optimized.dataUrl);
      if (type === 'bike_logo') setBikeLogoDraft(optimized.dataUrl);
    } catch (err: any) {
      setUploadError(err.message || 'Could not process image.');
    }
  };

  const handleFileUpload = (
    e: ChangeEvent<HTMLInputElement>,
    type: 'car_image' | 'car_logo' | 'bike_image' | 'bike_logo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, type);
  };

  const handleDrop = (
    e: DragEvent<HTMLDivElement>,
    type: 'car_image' | 'car_logo' | 'bike_image' | 'bike_logo'
  ) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file, type);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalCarImage = carImageDraft;
      let finalCarLogo = carLogoDraft;
      let finalBikeImage = bikeImageDraft;
      let finalBikeLogo = bikeLogoDraft;

      if (carImageDraft && carImageDraft.startsWith('data:')) {
        finalCarImage = await onSaveAsset('car_image', carImageDraft);
      }
      if (carLogoDraft && carLogoDraft.startsWith('data:')) {
        finalCarLogo = await onSaveAsset('car_logo', carLogoDraft);
      }
      if (bikeImageDraft && bikeImageDraft.startsWith('data:')) {
        finalBikeImage = await onSaveAsset('bike_image', bikeImageDraft);
      }
      if (bikeLogoDraft && bikeLogoDraft.startsWith('data:')) {
        finalBikeLogo = await onSaveAsset('bike_logo', bikeLogoDraft);
      }

      if (onSaveSettings) {
        await onSaveSettings({
          car: {
            customName: carNameDraft.trim() || undefined,
            targetSocDefault: carTargetSocDraft,
            batteryCapacityKwh: carCapacityDraft > 0 ? carCapacityDraft : undefined,
            vehicleImageUrl: finalCarImage,
            brandLogoUrl: finalCarLogo
          },
          bike: {
            customName: bikeNameDraft.trim() || undefined,
            bikeImageUrl: finalBikeImage,
            brandLogoUrl: finalBikeLogo
          }
        });
      }

      setSavedFeedback(true);
      setTimeout(() => {
        setSavedFeedback(false);
        setIsSaving(false);
        onClose();
      }, 500);
    } catch (err) {
      console.error('Failed to save vehicle customizations:', err);
      setIsSaving(false);
    }
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
        <div className="p-5 sm:p-6 border-b border-slate-200/60 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Sparkle size={20} weight="duotone" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">Vehicle & Fleet Customizer</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Customize vehicle names, target SoC, battery capacity, and assets (synced to NAS)
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

        {uploadError && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <Warning size={16} weight="fill" className="shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {activeTab === 'car' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Vehicle Display Name
                  </label>
                  <input
                    type="text"
                    value={carNameDraft}
                    onChange={(e) => setCarNameDraft(e.target.value)}
                    placeholder="e.g. Porsche Taycan 4S"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Target SoC Limit</span>
                    <span className="text-cyan-400 font-bold">{carTargetSocDraft}%</span>
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    step={5}
                    value={carTargetSocDraft}
                    onChange={(e) => setCarTargetSocDraft(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-2"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Battery Capacity (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={carCapacityDraft || ''}
                    onChange={(e) => setCarCapacityDraft(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 93.4"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

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
                        src={resolveAssetUrl(carImageDraft)}
                        alt="Car Preview"
                        className="max-h-28 max-w-full object-contain mx-auto drop-shadow-xl"
                      />
                      <p className="text-[11px] text-cyan-400 font-bold">Click or drag to replace image</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-4">
                      <UploadSimple size={28} weight="duotone" className="mx-auto text-slate-400 dark:text-slate-500" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Click to browse or drag & drop PNG/JPG/WebP
                      </p>
                      <p className="text-[10px] text-slate-500">Supports transparent Mach-E / Taycan / Model Y cutouts</p>
                    </div>
                  )}
                </div>
              </div>

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
                  className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
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
                    <div className="space-y-2">
                      <img
                        src={resolveAssetUrl(carLogoDraft)}
                        alt="Logo Preview"
                        className="max-h-12 max-w-[120px] object-contain mx-auto drop-shadow-md"
                      />
                      <p className="text-[11px] text-cyan-400 font-bold">Click or drag to replace logo</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-2">
                      <UploadSimple size={24} weight="duotone" className="mx-auto text-slate-400 dark:text-slate-500" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Upload manufacturer logo (PNG/SVG/WebP)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Smart E-Bike Name
                </label>
                <input
                  type="text"
                  value={bikeNameDraft}
                  onChange={(e) => setBikeNameDraft(e.target.value)}
                  placeholder="e.g. VanMoof S3 / Cowboy 4"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-sm font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

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
                        src={resolveAssetUrl(bikeImageDraft)}
                        alt="Bike Preview"
                        className="max-h-28 max-w-full object-contain mx-auto drop-shadow-xl"
                      />
                      <p className="text-[11px] text-amber-400 font-bold">Click or drag to replace bike render</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-4">
                      <UploadSimple size={28} weight="duotone" className="mx-auto text-slate-400 dark:text-slate-500" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Click to browse or drag & drop PNG/JPG/WebP
                      </p>
                    </div>
                  )}
                </div>
              </div>

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
                  className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
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
                    <div className="space-y-2">
                      <img
                        src={resolveAssetUrl(bikeLogoDraft)}
                        alt="Logo Preview"
                        className="max-h-12 max-w-[120px] object-contain mx-auto drop-shadow-md"
                      />
                      <p className="text-[11px] text-amber-400 font-bold">Click or drag to replace logo</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 py-2">
                      <UploadSimple size={24} weight="duotone" className="mx-auto text-slate-400 dark:text-slate-500" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Upload brand badge (Cowboy/VanMoof/Specialized)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-200/60 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.02] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Reset Defaults
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-50 ${
                savedFeedback
                  ? 'bg-emerald-500 text-black'
                  : activeTab === 'car'
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md shadow-cyan-500/20'
                  : 'bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/20'
              }`}
            >
              {savedFeedback ? (
                <>
                  <Check size={14} weight="bold" />
                  <span>Saved to NAS!</span>
                </>
              ) : isSaving ? (
                <>
                  <Sparkle size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Sparkle size={14} weight="bold" />
                  <span>Save & Sync</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
