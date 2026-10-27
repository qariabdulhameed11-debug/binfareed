import React, { useState, useRef } from 'react';
import { Upload, X, Link as LinkIcon, CheckCircle2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { compressImage, formatBytes, type CompressResult } from '../../lib/compressImage';
import { apiRequest } from '../../lib/api';

interface PhotoUploadBoxProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  aspectRatio?: 'square' | 'video' | 'banner' | 'auto';
  className?: string;
  compress?: boolean;
}

export const PhotoUploadBox: React.FC<PhotoUploadBoxProps> = ({
  value,
  onChange,
  label = 'Photograph',
  hint = 'Upload JPG, PNG, or WebP up to 5 MB',
  aspectRatio = 'square',
  className = '',
  compress = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'compressing' | 'uploading' | 'done'>('idle');
  const [compressInfo, setCompressInfo] = useState<CompressResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setError(null);
    setImgError(false);
    setLoading(true);
    setPhase('compressing');

    try {
      const result = compress
        ? await compressImage(file, { maxDimension: 1600, quality: 0.85 })
        : {
            file,
            originalBytes: file.size,
            compressedBytes: file.size,
            width: 0,
            height: 0,
            compressed: false,
          };

      if (result.file.size > 5 * 1024 * 1024) {
        throw new Error(
          `Image is ${formatBytes(result.file.size)} (limit is 5 MB). Please choose a smaller photo.`
        );
      }

      setCompressInfo(result);
      setPhase('uploading');

      const formData = new FormData();
      formData.append('image', result.file);

      const res = await apiRequest<{ success: boolean; url: string; provider?: string }>(
        '/api/admin/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (res.success && res.url) {
        onChange(res.url);
        setPhase('done');
      } else {
        throw new Error('Server did not return image URL.');
      }
    } catch (err: any) {
      setError(err.message || 'Image upload failed.');
      setPhase('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const aspectClass =
    aspectRatio === 'video'
      ? 'aspect-video'
      : aspectRatio === 'banner'
      ? 'aspect-[21/9]'
      : aspectRatio === 'square'
      ? 'aspect-square'
      : 'min-h-[140px]';

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-bold text-xs uppercase tracking-wider text-neutral-800">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] text-[#9E7B36] hover:text-[#C5A059] inline-flex items-center gap-1 font-semibold transition-colors"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showUrlInput ? 'Hide URL Box' : 'Enter URL manually'}</span>
          </button>
        </div>
      )}

      {/* Main Upload Box / Thumbnail Preview */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl transition-all overflow-hidden ${
          value && !imgError
            ? 'border-neutral-200 bg-[#FAF8F5]'
            : 'border-neutral-300 hover:border-[#C5A059] bg-neutral-50/70 hover:bg-[#FAF8F5]'
        }`}
      >
        {value && !imgError ? (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5">
            <div className={`relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-lg overflow-hidden border border-black/10 bg-white shadow-xs`}>
              <img
                src={value}
                alt="Preview"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-2 text-left w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <p className="font-semibold text-xs text-neutral-800 truncate">{value}</p>
              </div>

              {compressInfo && compressInfo.compressed && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>
                    Optimised {formatBytes(compressInfo.originalBytes)} → {formatBytes(compressInfo.compressedBytes)}
                  </span>
                </span>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Upload className="w-3 h-3" />
                  <span>{loading ? 'Uploading…' : 'Change Photo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setCompressInfo(null);
                    setImgError(false);
                  }}
                  className="px-2.5 py-1.5 text-neutral-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2.5 ${aspectClass}`}
          >
            {loading ? (
              <div className="space-y-2 flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
                <p className="text-xs font-bold text-neutral-800">
                  {phase === 'compressing' ? 'Compressing photo for web speed…' : 'Uploading to vault…'}
                </p>
                <p className="text-[11px] text-neutral-500">Stripping EXIF and creating WebP</p>
              </div>
            ) : (
              <>
                <div className="w-11 h-11 rounded-xl bg-white border border-neutral-200 shadow-xs flex items-center justify-center text-[#9E7B36] group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5 text-[#C5A059]" />
                </div>
                <div>
                  <p className="font-bold text-xs uppercase tracking-wider text-neutral-800">
                    Click to Choose or Drag Photo Here
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{hint}</p>
                </div>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Manual URL input drawer */}
      {showUrlInput && (
        <div className="pt-1">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setImgError(false);
            }}
            placeholder="Paste direct image URL (https://... or /api/uploads/...)"
            className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white font-mono-code focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] outline-hidden"
          />
        </div>
      )}

      {error && (
        <p className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          {error}
        </p>
      )}
    </div>
  );
};
