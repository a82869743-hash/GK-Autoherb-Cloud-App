import React, { useState, useEffect } from 'react';
import { useCarImage } from '../../utils/carImageService';
import { Car } from 'lucide-react';

interface CarImageProps {
  brand?: string;
  model?: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  fallbackType?: 'sports' | 'suv' | 'sedan' | 'luxury';
  showShadow?: boolean;
}

export default function CarImage({
  brand,
  model,
  alt,
  className = 'w-full h-full object-contain',
  containerClassName = '',
  fallbackType,
  showShadow = false,
}: CarImageProps) {
  const { imageUrl, isLoading, fallbackUrl, markError } = useCarImage(brand, model, fallbackType);
  const [imgSrc, setImgSrc] = useState<string>(imageUrl);

  // Sync internal src when hook resolves or props change
  useEffect(() => {
    setImgSrc(imageUrl);
  }, [imageUrl]);

  const displayAlt = alt || `${brand || ''} ${model || 'Vehicle'}`.trim();

  const handleImageError = () => {
    markError();
    setImgSrc(fallbackUrl);
  };

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${containerClassName}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center rounded-xl">
          <Car className="w-8 h-8 text-slate-300 animate-bounce" />
        </div>
      )}

      <img
        key={`${brand}-${model}-${imgSrc}`}
        src={imgSrc || fallbackUrl}
        alt={displayAlt}
        onError={handleImageError}
        className={`${className} transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} ${
          showShadow ? 'drop-shadow-[0_12px_24px_rgba(0,0,0,0.14)]' : ''
        }`}
        loading="lazy"
      />
    </div>
  );
}
