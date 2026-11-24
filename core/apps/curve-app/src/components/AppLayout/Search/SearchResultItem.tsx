import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface SearchResultItemProps {
  id: string;
  title: string;
  subtitle: string;
  type: 'contracts' | 'works' | 'tracks' | 'releases';
  index: number;
  onClose?: () => void;
}

export function SearchResultItem({ id, title, subtitle, type, index, onClose }: SearchResultItemProps) {
  const navigate = useNavigate();

  const handleSelect = () => {
    const route = `/${type}/${id}/edit`;
    navigate(route);
    onClose?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <div
        className="flex cursor-pointer items-center rounded-md p-2 hover:bg-accent hover:text-accent-foreground"
        onClick={handleSelect}
      >
        <div className="flex flex-col w-full">
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </div>
    </motion.div>
  );
}
