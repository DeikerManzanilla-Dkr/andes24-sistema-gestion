import { FC, ReactNode } from 'react';

interface ActionButtonProps {
  label: string;
  icon: ReactNode;
  color: string;
  onClick: () => void;
}

export const ActionButton: FC<ActionButtonProps> = ({ 
  label, 
  icon, 
  color, 
  onClick 
}) => {
  const bgClass = `bg-${color}-500 hover:bg-${color}-600`;
  
  return (
    <button
      onClick={onClick}
      className={`${bgClass} w-full flex items-center justify-center px-4 py-3 text-white rounded-lg transition-colors mb-3`}
    >
      <span className="mr-2">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
};