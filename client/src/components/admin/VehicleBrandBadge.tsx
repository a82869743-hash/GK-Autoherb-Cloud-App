import React, { useState, useEffect } from 'react';
import { Car } from 'lucide-react';
import { getPreloadedCarImage, markCarImageFailed } from '../../utils/carImageService';

interface VehicleBrandBadgeProps {
  brand?: string;
  model?: string;
  regNo?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export default function VehicleBrandBadge({
  brand,
  model,
  regNo,
  className = '',
  size = 'md',
  showText,
}: VehicleBrandBadgeProps) {
  const [imgFailed, setImgFailed] = useState(false);

  // Reset error state when brand or model changes
  useEffect(() => {
    setImgFailed(false);
  }, [brand, model]);

  const b = (brand || '').toLowerCase().trim();
  const carPhoto = !imgFailed && (brand || model) ? getPreloadedCarImage(brand, model) : null;

  const sizeClasses = {
    sm: 'w-6 h-6 text-[9px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  const handleImageError = (url?: string | null) => {
    if (url) markCarImageFailed(url);
    setImgFailed(true);
  };

  const renderIcon = () => {
    if (b.includes('bmw')) {
      return (
        <div className={`${sizeClasses} rounded-full bg-slate-900 border border-slate-700 p-0.5 flex items-center justify-center shrink-0 shadow-xs`}>
          <div className="w-full h-full rounded-full border border-white flex flex-wrap overflow-hidden">
            <div className="w-1/2 h-1/2 bg-blue-600" />
            <div className="w-1/2 h-1/2 bg-white" />
            <div className="w-1/2 h-1/2 bg-white" />
            <div className="w-1/2 h-1/2 bg-blue-600" />
          </div>
        </div>
      );
    }

    if (b.includes('mercedes') || b.includes('benz')) {
      return (
        <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-600 flex items-center justify-center text-slate-200 font-black shrink-0 shadow-xs`}>
          <span className="select-none leading-none">★</span>
        </div>
      );
    }

    if (b.includes('audi')) {
      return (
        <div className={`${sizeClasses} rounded-full bg-neutral-950 border border-neutral-700 text-neutral-300 flex items-center justify-center font-bold tracking-tighter shrink-0 shadow-xs`}>
          ○○
        </div>
      );
    }

    if (b.includes('porsche')) {
      return (
        <div className={`${sizeClasses} rounded-full bg-amber-500 border border-amber-600 text-neutral-900 flex items-center justify-center font-black shrink-0 shadow-xs`}>
          P
        </div>
      );
    }

    if (b.includes('mahindra')) {
      return (
        <div className={`${sizeClasses} rounded-full bg-red-600 border border-red-700 text-white flex items-center justify-center font-black shrink-0 shadow-xs`}>
          M
        </div>
      );
    }

    if (b.includes('hyundai')) {
      return (
        <div className={`${sizeClasses} rounded-full bg-blue-900 border border-blue-800 text-blue-100 flex items-center justify-center font-black italic shrink-0 shadow-xs`}>
          H
        </div>
      );
    }

    if (b.includes('suzuki') || b.includes('maruti')) {
      return (
        <div className={`${sizeClasses} rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center font-black shrink-0 shadow-xs`}>
          S
        </div>
      );
    }

    if (b.includes('tata')) {
      return (
        <div className={`${sizeClasses} rounded-full bg-blue-600 border border-blue-700 text-white flex items-center justify-center font-black shrink-0 shadow-xs`}>
          T
        </div>
      );
    }

    if (b.includes('toyota')) {
      return (
        <div className={`${sizeClasses} rounded-full bg-red-700 border border-red-800 text-white flex items-center justify-center font-black shrink-0 shadow-xs`}>
          T
        </div>
      );
    }

    if (b.includes('kia')) {
      return (
        <div className={`${sizeClasses} rounded-full bg-slate-900 border border-slate-700 text-white flex items-center justify-center font-black text-[9px] shrink-0 shadow-xs`}>
          KIA
        </div>
      );
    }

    return (
      <div className={`${sizeClasses} rounded-full bg-red-50 border border-red-100 text-[#D32F2F] flex items-center justify-center font-black shrink-0 shadow-xs`}>
        <Car size={size === 'sm' ? 12 : size === 'lg' ? 18 : 14} />
      </div>
    );
  };

  // Thumbnail photo avatar (when caller renders text separately)
  if (showText === false) {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
        {carPhoto ? (
          <img
            src={carPhoto}
            alt={`${brand || ''} ${model || ''}`}
            onError={() => handleImageError(carPhoto)}
            className={`${
              size === 'sm'
                ? 'w-8 h-6'
                : size === 'lg'
                ? 'w-14 h-9'
                : 'w-10 h-7'
            } object-cover rounded-lg border border-slate-200/90 bg-white p-0.5 shadow-2xs shrink-0`}
            loading="lazy"
          />
        ) : (
          renderIcon()
        )}
      </div>
    );
  }

  // Composite vehicle pill badge (photo/emblem + brand/model + regNo)
  if (model || regNo) {
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs ${className}`}>
        {carPhoto ? (
          <img
            src={carPhoto}
            alt={`${brand || ''} ${model || ''}`}
            onError={() => handleImageError(carPhoto)}
            className={`${
              size === 'sm'
                ? 'w-8 h-6'
                : size === 'lg'
                ? 'w-14 h-9'
                : 'w-10 h-7'
            } object-cover rounded-lg border border-slate-200/90 bg-white p-0.5 shadow-2xs shrink-0`}
            loading="lazy"
          />
        ) : (
          renderIcon()
        )}
        <div className="flex flex-col text-left">
          {(brand || model) && (
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {brand ? `${brand} ` : ''}{model || ''}
            </span>
          )}
          {regNo && (
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
              {regNo}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Standalone circular emblem
  return <div className={`inline-block ${className}`}>{renderIcon()}</div>;
}
