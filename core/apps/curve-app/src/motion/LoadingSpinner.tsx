import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: number;
  borderWidth?: number;
  trackColor?: string;
  spinColor?: string;
  className?: string;
}

export const LoadingSpinner = ({
  size = 50,
  borderWidth = 4,
  trackColor = 'var(--color-curve-master-light, #f3f3f3)',
  spinColor = 'var(--color-curve-primary, #3498db)',
  className = '',
}: LoadingSpinnerProps) => {
  return (
    <motion.div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${borderWidth}px solid ${trackColor}`,
        borderTopColor: spinColor,
        willChange: 'transform',
      }}
      animate={{ rotate: 360 }}
      transition={{
        repeat: Infinity,
        ease: 'linear',
        duration: 1,
      }}
    />
  );
};
