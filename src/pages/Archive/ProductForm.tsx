import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Edit2, Trash2 } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  price_usd: z.number().min(0, 'El precio debe ser mayor a 0'),
  price_bs: z.number().min(0, 'El precio debe ser mayor a 0'),
  type: z.enum(['stationery', 'policy'], {
    required_error: 'Debe seleccionar un tipo de producto',
  }),
});

type ProductFormData = z.infer<typeof productSchema>;

export const ProductForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema)
  });

  const onSubmit = (data: ProductFormData) => {
    console.log(data);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Registro de Producto</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre del Producto</label>
          <input
            type="text"
            {...register('name')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Precio (USD)</label>
            <input
              type="number"
              step="0.01"
              {...register('price_usd', { valueAsNumber: true })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {errors.price_usd && (
              <p className="text-red-500 text-sm mt-1">{errors.price_usd.message}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Precio (Bs.)</label>
            <input
              type="number"
              step="0.01"
              {...register('price_bs', { valueAsNumber: true })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {errors.price_bs && (
              <p className="text-red-500 text-sm mt-1">{errors.price_bs.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tipo de Producto</label>
          <select
            {...register('type')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione un tipo</option>
            <option value="stationery">Papelería</option>
            <option value="policy">Póliza</option>
          </select>
          {errors.type && (
            <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
          )}
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