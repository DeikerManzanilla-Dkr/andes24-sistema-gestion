import { FC, ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}

export const StatCard: FC<StatCardProps> = ({ title, value, icon, color }) => {
  const bgClass = `bg-${color}-50 dark:bg-gray-800`;
  const textClass = `text-${color}-500`;
  const iconBgClass = `bg-${color}-500`;
  
  return (
    <div className={`rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${bgClass} p-5`}>
      <div className="flex items-center">
        <div className={`${iconBgClass} w-10 h-10 rounded-lg flex items-center justify-center text-white`}>
          {icon}
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          <div className="mt-1 flex items-baseline">
            <p className="text-2xl font-semibold dark:text-white">{value}</p>
          </div>
        </div>
      </div>
    </div>
  );
};