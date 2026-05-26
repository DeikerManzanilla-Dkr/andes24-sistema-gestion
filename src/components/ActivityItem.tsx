import { FC } from 'react';

interface ActivityItemProps {
  title: string;
  description: string;
  timestamp: string;
  icon: JSX.Element;
}

export const ActivityItem: FC<ActivityItemProps> = ({ 
  title, 
  description, 
  timestamp, 
  icon 
}) => {
  return (
    <div className="flex space-x-3 py-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-500">
          {icon}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      <div className="flex-shrink-0 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
        {timestamp}
      </div>
    </div>
  );
};