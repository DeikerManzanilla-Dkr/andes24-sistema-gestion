import { FC } from 'react';
import { Bell, Moon, Sun, LogOut, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export const Header: FC<HeaderProps> = ({ isOpen = false, onToggle }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { session, signOut } = useAuth();
  
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
        <button 
          onClick={onToggle}
          className="md:hidden p-2 text-gray-500 rounded-full hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center space-x-4 ml-auto">
          <button 
            onClick={toggleTheme}
            className="p-2 text-gray-500 rounded-full hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button className="p-2 text-gray-500 rounded-full hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          
          {session && (
            <button 
              onClick={() => void signOut()}
              className="p-2 text-gray-500 rounded-full hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
          
          <div className="relative flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
              {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};