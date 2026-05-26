import { FC, useState, useEffect, useRef } from 'react';
import { startOfDay, endOfDay, format } from 'date-fns';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Printer,
  FileText,
  Loader2,
  Filter
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  note: string;
  amount: number;
}

export const Reports: FC = () => {
  const { isDarkMode: darkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  
  // Inicializar fechas con el día de hoy (startOfDay y endOfDay)
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start: format(startOfDay(today), 'yyyy-MM-dd'),
    end: format(endOfDay(today), 'yyyy-MM-dd')
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedType, setSelectedType] = useState('all');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ amount: '', note: '' });
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // 1. Cargar datos desde la tabla unificada de transacciones
  const fetchReportData = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateRange.start) query = query.gte('created_at', dateRange.start);
      if (dateRange.end) query = query.lte('created_at', dateRange.end + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;

      const mapped: Transaction[] = (data || []).map(t => ({
        id: t.id,
        date: t.created_at,
        amount: Number(t.amount) || 0,
        type: t.type as 'income' | 'expense',
        note: t.note || '',
        category: t.category || ''
      }));

      setTransactions(mapped);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount) return;
    
    setIsSavingExpense(true);
    const { error } = await supabase.from('financial_transactions').insert({
      type: 'expense',
      amount: Number(expenseForm.amount),
      note: expenseForm.note,
      category: 'Gasto Administrativo'
    });

    if (error) {
      alert('Error al registrar gasto: ' + error.message);
    } else {
      setShowExpenseModal(false);
      setExpenseForm({ amount: '', note: '' });
      await fetchReportData();
    }
    setIsSavingExpense(false);
  };

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  // 2. Lógica de Filtros
  const filteredTransactions = transactions.filter(t => {
    if (selectedType === 'all') return true;
    return t.type === selectedType;
  });

  // 3. Cálculos de Totales
  const stats = {
    income: transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
    expense: transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
  };
  const netIncome = stats.income - stats.expense;

  // 4. Configuración de Impresión
  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Andes24_Reporte_${new Date().toISOString().split('T')[0]}`,
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <p className={darkMode ? 'text-white' : 'text-gray-600'}>Cargando contabilidad...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header y Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold dark:text-white text-gray-800">Informes Financieros</h1>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2 mr-2">
            <Filter size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <option value="all">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Egresos</option>
            </select>
          </div>

          <input
            type="date"
            className={`px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-700'
            }`}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <input
            type="date"
            className={`px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-700'
            }`}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium"
          >
            <DollarSign size={18} className="mr-2" />
            Registrar Gasto
          </button>
          <button
            onClick={() => void handlePrint()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium"
          >
            <Printer size={18} className="mr-2" />
            Imprimir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard 
          title="Ingresos Totales" 
          value={`€ ${stats.income.toFixed(2)}`} 
          icon={<TrendingUp className="text-emerald-500" />} 
          darkMode={darkMode} 
        />
        <SummaryCard 
          title="Gastos Totales" 
          value={`€ ${stats.expense.toFixed(2)}`} 
          icon={<DollarSign className="text-red-500" />} 
          darkMode={darkMode} 
        />
        <SummaryCard 
          title="Utilidad Neta" 
          value={`€ ${netIncome.toFixed(2)}`} 
          icon={<BarChart3 className="text-blue-500" />} 
          darkMode={darkMode} 
          highlight={netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
      </div>

      {/* Área del Reporte (Lo que se imprime) */}
      <div ref={reportRef} className="space-y-6 p-2">
        {/* Tabla de Transacciones */}
        <div className={`rounded-lg shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
          <div className="p-4 border-b dark:border-gray-700 flex items-center">
            <FileText size={20} className="mr-2 text-gray-500" />
            <h2 className="text-lg font-semibold dark:text-white">Detalle de Operaciones</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={darkMode ? 'bg-gray-900/50' : 'bg-gray-50'}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTransactions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-300">
                      {new Date(t.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm dark:text-gray-300">
                      {t.note}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        t.type === 'income' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {t.type === 'income' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'} € {t.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Registro de Gasto */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowExpenseModal(false)} />
          <div className={`relative w-full max-w-md rounded-xl shadow-xl p-6 border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Registrar Gasto Administrativo
            </h2>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                  Monto del Gasto (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  className={`w-full px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-red-500 border transition-all ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                  Nota / Descripción
                </label>
                <textarea
                  required
                  className={`w-full px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-red-500 border transition-all ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows={3}
                  value={expenseForm.note}
                  onChange={(e) => setExpenseForm({...expenseForm, note: e.target.value})}
                  placeholder="Ej: Pago de papelería, limpieza, etc."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingExpense}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {isSavingExpense ? (
                    <Loader2 className="animate-spin mr-2" size={16} />
                  ) : 'Confirmar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  darkMode: boolean;
  highlight?: string;
}

const SummaryCard: FC<SummaryCardProps> = ({ title, value, icon, darkMode, highlight }) => (
  <div className={`p-6 rounded-xl border shadow-sm ${
    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  }`}>
    <div className="flex items-center justify-between mb-4">
      <span className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</span>
      <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
        {icon}
      </div>
    </div>
    <div className={`text-2xl font-bold ${highlight || (darkMode ? 'text-white' : 'text-gray-900')}`}>
      {value}
    </div>
  </div>
);