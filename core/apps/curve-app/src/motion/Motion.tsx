import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

// Basic fade in animation
export const FadeIn = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Slide animations for form transitions
export const SlideLeft = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.8 }}
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const SlideRight = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Expanding reveal animation for errors/validation
export const ExpandReveal = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.8 }}
      className={`w-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Page transition with slight vertical movement
export const PageTransition = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Wrapper for AnimatePresence with common settings
export const FormTransition = ({
  children,
  mode = 'wait' as const,
}: {
  children: ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
}) => {
  // Type assertion needed due to framer-motion's bundled React types not matching React 19 types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AnimatePresence mode={mode}>{children as any}</AnimatePresence>;
};

// Pop-in animation - appears with scale and fade
export const PopIn = ({ children, className = '' }: { children: ReactNode; className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Legacy export for backward compatibility
export const FormMotion = FadeIn;
