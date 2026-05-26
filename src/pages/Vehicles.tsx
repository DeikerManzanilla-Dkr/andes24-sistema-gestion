import { FC } from 'react';

export const Vehicles: FC = () => {
  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Vehículos</h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-gray-600 dark:text-gray-400">Contenido de la página de vehículos</p>
      </div>
    </div>
  );
};