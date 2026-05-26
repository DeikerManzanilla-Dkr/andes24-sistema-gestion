import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Edit2, Trash2 } from 'lucide-react';

const clientSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  document_id: z.string().min(6, 'La cédula debe tener al menos 6 caracteres'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 caracteres'),
  vehicle_brand: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_year: z.number().min(1900).max(2025).optional(),
  vehicle_plate: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

export const ClientForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema)
  });

  const onSubmit = (data: ClientFormData) => {
    console.log(data);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Registro de Cliente</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre Completo</label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Cédula</label>
            <input
              type="text"
              {...register('document_id')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {errors.document_id && (
              <p className="text-red-500 text-sm mt-1">{errors.document_id.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              {...register('phone')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 my-6 pt-6">
          <h3 className="text-lg font-medium mb-4">Datos del Vehículo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Marca</label>
              <input
                type="text"
                {...register('vehicle_brand')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Modelo</label>
              <input
                type="text"
                {...register('vehicle_model')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Año</label>
              <input
                type="number"
                {...register('vehicle_year', { valueAsNumber: true })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Placa</label>
              <input
                type="text"
                {...register('vehicle_plate')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-6">
          <button
            type="button"
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </button>
          <button
            type="button"
            className="px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 flex items-center"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Editar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
};