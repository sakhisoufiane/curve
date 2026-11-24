// Screen transition variants for multi-step forms
export const createScreenVariants = () => ({
  initial: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 20 : -20,
  }),
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -20 : 20,
  }),
});
