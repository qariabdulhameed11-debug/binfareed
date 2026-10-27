import React, { useState, useRef } from 'react';
import { Upload, X, Star, Loader2, Plus, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../../lib/compressImage';
import { apiRequest } from '../../lib/api';

export interface GalleryImage {
  url: string;
  alt?: string;
  isMain?: boolean;
}

interface ProductGalleryUploaderProps {
  images: GalleryImage[];
  mainImage: string;
  onChangeImages: (images: GalleryImage[]) => void;
  onSetMainImage: (url: string) => void;
}

export const ProductGalleryUploader: React.FC<ProductGalleryUploaderProps> = ({
  images = [],
  mainImage = '',
  onChangeImages,
  onSetMainImage,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize list to ensure mainImage is included
  const allImages = React.useMemo(() => {
    const list = [...images];
    if (mainImage && !list.some((img) => img.url === mainImage)) {
      list.unshift({ url: mainImage, isMain: true, alt: 'Primary Watch Photo' });
    }
    return list;
  }, [images, mainImage]);

  const handleMultipleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    const newUploaded: GalleryImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgressMsg(`Optimising & uploading ${i + 1} of ${files.length}…`);
      try {
        const compressed = await compressImage(file, { maxDimension: 1600, quality: 0.85 });
        const formData = new FormData();
        formData.append('image', compressed.file);

        const res = await apiRequest<{ success: boolean; url: string }>('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.success && res.url) {
          newUploaded.push({
            url: res.url,
            alt: file.name.replace(/\.[^.]+$/, ''),
            isMain: false,
          });
        }
      } catch (err) {
        console.error('Failed to upload image:', file.name, err);
      }
    }

    if (newUploaded.length > 0) {
      const updated = [...allImages, ...newUploaded];
      onChangeImages(updated);
      if (!mainImage && newUploaded[0]) {
        onSetMainImage(newUploaded[0].url);
      }
    }

    setUploading(false);
    setProgressMsg('');
  };

  const handleRemove = (urlToRemove: string) => {
    const remaining = allImages.filter((img) => img.url !== urlToRemove);
    onChangeImages(remaining);
    if (mainImage === urlToRemove) {
      onSetMainImage(remaining[0]?.url || '');
    }
  };

  const handleSetMain = (newMainUrl: string) => {
    onSetMainImage(newMainUrl);
    const updated = allImages.map((img) => ({
      ...img,
      isMain: img.url === newMainUrl,
    }));
    onChangeImages(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="font-bold text-xs uppercase tracking-wider text-neutral-800 block">
            Watch Gallery Photos ({allImages.length})
          </label>
          <p className="text-[11px] text-neutral-500">
            Upload multiple photos (wrist shots, dial macro, caseback, strap). Click star to set Primary photo.
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="px-3.5 py-1.5 bg-[#0D0D0D] hover:bg-[#C5A059] text-[#FAF8F5] hover:text-[#0D0D0D] rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload Photos</span>
        </button>
      </div>

      {uploading && (
        <div className="p-3 bg-[#FAF8F5] border border-[#C5A059]/30 rounded-xl flex items-center gap-2.5 text-xs text-neutral-800">
          <Loader2 className="w-4 h-4 text-[#C5A059] animate-spin shrink-0" />
          <span className="font-semibold">{progressMsg}</span>
        </div>
      )}

      {/* Grid of photos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {allImages.map((img, idx) => {
          const isPrimary = img.url === mainImage || img.isMain;
          return (
            <div
              key={idx}
              className={`group relative rounded-xl border overflow-hidden bg-white aspect-square shadow-xs transition-all ${
                isPrimary ? 'border-[#C5A059] ring-2 ring-[#C5A059]/40' : 'border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <img
                src={img.url}
                alt={img.alt || `Photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Badges / Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                {!isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetMain(img.url)}
                    title="Set as Primary Watch Photo"
                    className="p-1.5 bg-white/90 hover:bg-[#C5A059] hover:text-black text-neutral-800 rounded-lg transition-colors"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(img.url)}
                  title="Remove this photo"
                  className="p-1.5 bg-white/90 hover:bg-red-600 hover:text-white text-neutral-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isPrimary && (
                <div className="absolute top-1.5 left-1.5 bg-[#0D0D0D] text-[#C5A059] text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Star className="w-2.5 h-2.5 fill-[#C5A059]" />
                  <span>Primary</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state / Add more tile */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-300 hover:border-[#C5A059] rounded-xl flex flex-col items-center justify-center gap-1 p-4 cursor-pointer text-center aspect-square bg-neutral-50 hover:bg-[#FAF8F5] transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-neutral-500">
            <Plus className="w-4 h-4 text-[#C5A059]" />
          </div>
          <span className="text-[11px] font-bold text-neutral-700 mt-1">+ Add More</span>
          <span className="text-[9px] text-neutral-400">Multiple files ok</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif"
        onChange={handleMultipleFiles}
        className="hidden"
      />
    </div>
  );
};
