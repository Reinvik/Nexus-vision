import React from 'react';
import { motion } from 'motion/react';

interface SpartanLogoProps {
  className?: string;
  isWatermark?: boolean;
}

export function SpartanLogo({ className = "w-16 h-16", isWatermark = false }: SpartanLogoProps) {
  return (
    <motion.img 
      src="/assets/brand/logo.png" 
      alt="Roma Center Logo"
      className={`${className} object-contain ${isWatermark ? 'grayscale brightness-100 contrast-100' : ''}`}
    />
  );
}
