import { FC } from 'react';
import { 
  Home, 
  User, 
  FileText, 
  FileSignature, 
  Package, 
  BarChart, 
  Settings,
  Phone,
  X
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

interface NavItemProps {
  icon: JSX.Element;
  label: string;
  page: string;
  currentPage: string;
  onClick: () => void;
}

const NavItem: FC<NavItemProps> = ({ icon, label, page, currentPage, onClick }) => {
  const isActive = page === currentPage;
  
  return (
    <li>
      <button 
        onClick={onClick}
        className={`flex items-center w-full px-4 py-2.5 text-sm rounded-lg transition-colors ${
          isActive 
            ? 'bg-blue-600 text-white' 
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <span className="inline-flex items-center justify-center w-6 h-6 mr-3">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
};

interface NavSectionProps {
  title: string;
  children: React.ReactNode;
}

const NavSection: FC<NavSectionProps> = ({ title, children }) => (
  <div className="mt-6 first:mt-0">
    <h2 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
      {title}
    </h2>
    <ul className="space-y-1">
      {children}
    </ul>
  </div>
);

export const Sidebar: FC<SidebarProps> = ({ currentPage, setCurrentPage, isOpen = false, onToggle }) => {
  useTheme();
  
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:flex flex-col`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-lg font-semibold">Menú</span>
          <button 
            onClick={onToggle}
            className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <NavSection title="Archivo">
          <NavItem 
            icon={<Home size={18} />} 
            label="Inicio" 
            page="dashboard" 
            currentPage={currentPage} 
            onClick={() => setCurrentPage('dashboard')} 
          />
          <NavItem 
            icon={<User size={18} />} 
            label="Clientes" 
            page="clients" 
            currentPage={currentPage} 
            onClick={() => setCurrentPage('clients')} 
          />
        </NavSection>

        <NavSection title="Procesos">
          <NavItem 
            icon={<FileText size={18} />} 
            label="Facturacion" 
            page="billing" 
            currentPage={currentPage} 
            onClick={() => setCurrentPage('billing')} 
          />
          <NavItem 
            icon={<FileSignature size={18} />} 
            label="Documentos" 
            page="documents" 
            currentPage={currentPage} 
            onClick={() => setCurrentPage('documents')} 
          />
          <NavItem 
            icon={<Package size={18} />} 
            label="QR Codes" 
            page="qrcodes" 
            currentPage={currentPage} 
            onClick={() => setCurrentPage('qrcodes')} 
          />
          <NavItem 
            icon={<Phone size={18} />} 
            label="CRM" 
            page="crm" 
            currentPage={currentPage} 
            onClick={() => setCurrentPage('crm')} 
          />
        </NavSection>
        
        <NavSection title="Reportes">
          <NavItem 
            icon={<BarChart size={18} />} 
            label="Informes" 
            page="reports" 
            currentPage={currentPage} 
            onClick={() => setCurrentPage('reports')} 
          />
        </NavSection>
      </div>
      
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button 
          className="flex items-center w-full px-4 py-2.5 text-sm rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setCurrentPage('settings')}
        >
          <span className="inline-flex items-center justify-center w-6 h-6 mr-3">
            <Settings size={18} />
          </span>
          <span className="font-medium">Configuración</span>
        </button>
      </div>
    </aside>
    </>
  );
};