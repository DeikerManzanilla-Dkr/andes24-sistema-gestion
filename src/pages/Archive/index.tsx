import { useState } from 'react';
import { Users, Package, UserCog, DollarSign } from 'lucide-react';
import { ClientForm } from './ClientForm';
import { ProductForm } from './ProductForm';
import { UserForm } from './UserForm';
import { CurrencyForm } from './CurrencyForm';

export const Archive = () => {
  const [activeTab, setActiveTab] = useState('clients');

  const tabs = [
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'users', label: 'Usuarios', icon: UserCog },
    { id: 'currency', label: 'Moneda', icon: DollarSign },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'clients':
        return <ClientForm />;
      case 'products':
        return <ProductForm />;
      case 'users':
        return <UserForm />;
      case 'currency':
        return <CurrencyForm />;
      default:
        return <ClientForm />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archivo</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-2 px-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium border-b-2 
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {renderContent()}
    </div>
  );
};