import { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { img: 'h-6', text: 'text-sm' },
  md: { img: 'h-8', text: 'text-base' },
  lg: { img: 'h-12', text: 'text-lg' },
};

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const [imgError, setImgError] = useState(false);
  const { img, text } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {imgError ? (
        <div className={`${img} aspect-square bg-[#D32F2F] rounded flex items-center justify-center`}>
          <span className="text-white font-black text-xs">GK</span>
        </div>
      ) : (
        <img
          src="/assets/logo.png"
          alt="GK AutoHerb"
          className={`${img} object-contain`}
          onError={() => setImgError(true)}
        />
      )}
      {showText && (
        <span className={`font-bold text-[#1c1b1b] tracking-tight ${text}`}>AutoHerb</span>
      )}
    </div>
  );
}
