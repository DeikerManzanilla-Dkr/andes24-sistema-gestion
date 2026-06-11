import { FC } from 'react';
import { User, Car, FileText, DollarSign, UserPlus, CarFront, FilePlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { StatCard } from '../components/StatCard';
import { ActivityItem } from '../components/ActivityItem';
import { ActionButton } from '../components/ActionButton';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { useReminders } from '../hooks/useReminders';

export const Dashboard: FC = () => {
  const { stats, loading: statsLoading, error: statsError, refresh: refreshStats } = useDashboardStats();
  const { activities, loading: activityLoading, error: activityError, refresh: refreshActivity } = useRecentActivity(5);
  const { reminders, loading: remindersLoading, error: remindersError, refresh: refreshReminders, markDone } = useReminders(10);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'new_client':
        navigate('/clients');
        return;
      case 'new_vehicle':
        navigate('/clients');
        return;
      case 'new_policy':
        navigate('/documents');
        return;
      default:
        return;
    }
  };

  const isLoading = statsLoading || activityLoading || remindersLoading;
  const error = statsError ?? activityError ?? remindersError;
  
  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Bienvenido</h1>
        <p className="text-gray-600 dark:text-gray-400">Acceso rápido a la información de Andes 24</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-red-700 dark:text-red-200">Error cargando datos: {error}</p>
            <button
              type="button"
              onClick={() => {
                void refreshStats();
                void refreshActivity();
                void refreshReminders();
              }}
              className="px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Clientes" 
          value={isLoading ? '—' : stats.totalClients} 
          icon={<User size={20} />} 
          color="blue" 
        />
        <StatCard 
          title="Vehículos" 
          value={isLoading ? '—' : stats.totalVehicles} 
          icon={<Car size={20} />} 
          color="green" 
        />
        <StatCard 
          title="Pólizas activas" 
          value={isLoading ? '—' : stats.activePolicies} 
          icon={<FileText size={20} />} 
          color="purple" 
        />
        <StatCard 
          title="Vencen (30 días)" 
          value={isLoading ? '—' : stats.renewalsPending30d} 
          icon={<DollarSign size={20} />} 
          color="red" 
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Actividad Reciente!</h2>
            </div>
            <div className="p-6">
              {activityLoading && activities.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
              ) : activities.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No hay actividad Reciente.</p>
              ) : (
                activities.map((a) => (
                  <ActivityItem
                    key={a.id}
                    title={a.title}
                    description={a.description}
                    timestamp={formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
                    icon={<FileText size={16} />}
                  />
                ))
              )}
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Acciones Rápidas</h2>
            </div>
            <div className="p-6">
              <ActionButton 
                label="Registrar Nuevo Cliente" 
                icon={<UserPlus size={18} />} 
                color="blue" 
                onClick={() => handleAction('new_client')} 
              />
              <ActionButton 
                label="Nuevo Vehículo" 
                icon={<CarFront size={18} />} 
                color="green" 
                onClick={() => handleAction('new_vehicle')} 
              />
              <ActionButton 
                label="Nueva Póliza" 
                icon={<FilePlus size={18} />} 
                color="amber" 
                onClick={() => handleAction('new_policy')} 
              />
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Tareas Pendientes</h3>
                <div className="space-y-2">
                  {remindersLoading ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Cargando...</p>
                  ) : reminders.length === 0 ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400">No hay recordatorios pendientes.</p>
                  ) : (
                    reminders.map((r) => {
                      const id = `reminder-${r.id}`;
                      const dueText = r.dueAt
                        ? formatDistanceToNow(new Date(r.dueAt), { addSuffix: true, locale: es })
                        : '';

                      return (
                        <div key={r.id} className="flex items-start">
                          <input
                            id={id}
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            onChange={() => void markDone(r.id)}
                          />
                          <label htmlFor={id} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">{r.clientName}</span>
                            {r.type ? ` — ${r.type}` : ''}
                            {r.description ? `: ${r.description}` : ''}
                            {dueText ? (
                              <span className="block text-xs text-gray-500 dark:text-gray-400">{dueText}</span>
                            ) : null}
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};