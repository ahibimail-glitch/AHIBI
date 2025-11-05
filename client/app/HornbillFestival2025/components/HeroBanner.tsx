"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface HeroBannerProps {
  image: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

const HeroBanner = ({ image, title, subtitle, children }: HeroBannerProps) => {
  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{ backgroundImage: `url(${image})` }}
      />
      <div 
        className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-background"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 mix-blend-overlay" />
      
      <div className="relative h-full container mx-auto px-4 sm:px-6 flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-6 drop-shadow-2xl leading-tight"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-transparent">
              {title}
            </span>
          </motion.h1>
          {subtitle && (
            <motion.p 
              className="text-xl md:text-3xl text-gray-200 mb-8 drop-shadow-lg font-medium"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {subtitle}
            </motion.p>
          )}
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default HeroBanner;
