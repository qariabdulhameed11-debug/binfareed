import React from 'react';
import { sized, srcSet } from '../lib/img';
import { Link } from 'react-router-dom';
import type { Collection } from '../types';

/**
 * Modern luxury collection card:
 * 100% clean photography with zero distracting overlays on the image,
 * elegant title and explore link below the image,
 * and direct 1-tap navigation for best mobile user experience.
 */
export const FlipCollectionCard: React.FC<{ collection: Collection; index?: number }> = ({ collection }) => {
  return (
    <Link
      to={`/collections/${collection.slug}`}
      className="group block"
    >
      <div className="relative aspect-[4/5] sm:aspect-[5/6] rounded-xl overflow-hidden bg-[#F3EFE6] border border-[#0D0D0D]/8 shadow-sm group-hover:shadow-xl transition-all duration-500">
        <img
          src={sized(collection.image, 520)}
          srcSet={srcSet(collection.image, 520)}
          decoding="async"
          alt={collection.name}
          loading="lazy"
          width={600}
          height={750}
          className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-108"
        />
        <span className="lux-sheen" aria-hidden />
      </div>

      <div className="mt-2.5 sm:mt-3 text-center sm:text-left">
        <h3 className="font-serif-luxury text-[15px] sm:text-xl font-semibold text-[#0D0D0D] group-hover:text-[#9E7B36] transition-colors leading-tight">
          {collection.name}
        </h3>
        <span className="text-[10px] sm:text-xs uppercase tracking-[0.16em] text-[#9E7B36] font-semibold mt-1 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
          <span>Explore Collection</span> →
        </span>
      </div>
    </Link>
  );
};
