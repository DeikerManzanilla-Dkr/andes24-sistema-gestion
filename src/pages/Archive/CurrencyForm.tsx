import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, RefreshCw } from 'lucide-react';

const currencySchema = z.object({
  rate: z.number().min(0, 'La tasa debe ser mayor a 0'),
});

type CurrencyFormData = z.infer<typeof currencySchema>;

export const CurrencyForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<CurrencyFormData>({
    resolver: zodResolver(currencySchema)
  });

  const onSubmit = (data: CurrencyFormData) => {
    console.log(data);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6">Tasa de Cambio</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tasa USD/Bs.</label>
          <div className="flex space-x-2">
            <input
              type="number"
              step="0.01"
              {...register('rate', { valueAsNumber: true })}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
              onClick={() => console.log('Actualizar precios')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar Precios
            </button>
          </div>
          {errors.rate && (
            <p className="text-red-500 text-sm mt-1">{errors.rate.message}</p>
          )}
        </div>

        <div className="flex justify-end pt-6">
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar Tasa
          </button>
        </div>
      </form>
    </div>
  );
};