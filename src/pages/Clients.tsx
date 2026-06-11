import { FC, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import type { ClientRow } from '../types/database';
import { SearchBar } from '../components/SearchBar';
import { useDebounce } from '../hooks/useDebounce';

export const Clients: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);

  const [vehicles, setVehicles] = useState<
    Array<{ id: string; plate: string; serial_motor: string | null; serial_carroceria: string | null; brand: string | null; model: string | null; year: number | null; color: string | null; tipo_vehiculo: string | null; uso: string | null; clase: string | null; peso: string | null; puestos: number | null; created_at: string }>
  >([]);
  const [isVehiclesLoading, setIsVehiclesLoading] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState<string>('');
  const [vehicleSerialMotor, setVehicleSerialMotor] = useState('');
  const [vehicleSerialCarroceria, setVehicleSerialCarroceria] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleClase, setVehicleClase] = useState('');
  const [vehicleTipoVehiculo, setVehicleTipoVehiculo] = useState('');
  const [vehicleUso, setVehicleUso] = useState('');
  const [vehiclePeso, setVehiclePeso] = useState('');
  const [vehiclePuestos, setVehiclePuestos] = useState<string>('');

  const [editingVehicle, setEditingVehicle] = useState<typeof vehicles[0] | null>(null);
  const [isEditingVehicleOpen, setIsEditingVehicleOpen] = useState(false);

  const [name, setName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const isValid = useMemo(() => {
    return name.trim().length >= 3 && documentId.trim().length >= 6 && phone.trim().length >= 10;
  }, [name, documentId, phone]);

  const loadClients = async (searchQuery?: string) => {
    setIsLoading(true);
    setError(null);

    let query = supabase
      .from('clients')
      .select('id,name,document_id,phone,address,email,created_at');

    if (searchQuery && searchQuery.trim()) {
      query = query.or(`name.ilike.%${searchQuery}%,document_id.ilike.%${searchQuery}%`);
    }

    const { data, error: selectError } = await query.order('created_at', { ascending: false });

    if (selectError) {
      setError(selectError.message);
      setClients([]);
      setIsLoading(false);
      return;
    }

    setClients((data ?? []) as ClientRow[]);
    setIsLoading(false);
  };

  const loadVehicles = async (clientId: string) => {
    setIsVehiclesLoading(true);
    setVehicleError(null);

    const { data, error: selectError } = await supabase
      .from('vehicles')
      .select('id,plate,serial_motor,serial_carroceria,brand,model,year,color,tipo_vehiculo,uso,clase,peso,puestos,created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (selectError) {
      setVehicleError(selectError.message);
      setVehicles([]);
      setIsVehiclesLoading(false);
      return;
    }

    setVehicles(data ?? []);
    setIsVehiclesLoading(false);
  };

  useEffect(() => {
    void loadClients(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const resetClientForm = () => {
    setName('');
    setDocumentId('');
    setPhone('');
    setAddress('');
    setEmail('');
    setBirthDate('');
    setSelectedClient(null);
    setVehicles([]);
    setVehicleError(null);
    setVehiclePlate('');
    setVehicleBrand('');
    setVehicleModel('');
    setVehicleYear('');
    setVehicleSerialMotor('');
    setVehicleSerialCarroceria('');
    setVehicleColor('');
    setVehicleClase('');
    setVehicleTipoVehiculo('');
    setVehicleUso('');
    setVehiclePeso('');
    setVehiclePuestos('');
  };

  const handleSelectClient = async (client: ClientRow) => {
    setSelectedClient(client);
    setName(client.name);
    setDocumentId(client.document_id);
    setPhone(client.phone);
    setAddress(client.address ?? '');
    setEmail(client.email ?? '');
    setBirthDate(client.birth_date ?? '');
    await loadVehicles(client.id);
  };

  const handleCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setIsLoading(true);
    setError(null);

    if (selectedClient) {
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          name: name.trim(),
          document_id: documentId.trim(),
          phone: phone.trim(),
          address: address.trim(),
          email: email.trim() || null,
          birth_date: birthDate.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedClient.id);

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      await loadClients();
      await handleSelectClient({
        ...selectedClient,
        name: name.trim(),
        document_id: documentId.trim(),
        phone: phone.trim(),
        address: address.trim(),
        email: email.trim() || null,
        birth_date: birthDate.trim() || null,
        updated_at: new Date().toISOString(),
      });
      setIsLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('clients').insert({
      name: name.trim(),
      document_id: documentId.trim(),
      phone: phone.trim(),
      address: address.trim(),
      email: email.trim() || null,
      birth_date: birthDate.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
      setIsLoading(false);
      return;
    }

    setName('');
    setDocumentId('');
    setPhone('');
    setAddress('');
    setEmail('');
    setBirthDate('');
    await loadClients();
  };

  const handleDeleteClient = async () => {
    if (!selectedClient || isLoading) return;
    setIsLoading(true);
    setError(null);

    const { error: deleteError } = await supabase.from('clients').delete().eq('id', selectedClient.id);
    if (deleteError) {
      setError(deleteError.message);
      setIsLoading(false);
      return;
    }

    resetClientForm();
    await loadClients();
    setIsLoading(false);
  };

  const handleCreateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedClient || isVehiclesLoading) return;

    const plate = vehiclePlate.trim();
    if (!plate) return;

    setIsVehiclesLoading(true);
    setVehicleError(null);

    const yearNum = vehicleYear.trim() ? Number(vehicleYear.trim()) : null;
    const puestosNum = vehiclePuestos.trim() ? Number(vehiclePuestos.trim()) : null;
    const { error: insertError } = await supabase.from('vehicles').insert({
      client_id: selectedClient.id,
      plate,
      brand: vehicleBrand.trim() || null,
      model: vehicleModel.trim() || null,
      year: Number.isFinite(yearNum) ? yearNum : null,
      serial_motor: vehicleSerialMotor.trim() || null,
      serial_carroceria: vehicleSerialCarroceria.trim() || null,
      color: vehicleColor.trim() || null,
      clase: vehicleClase.trim() || null,
      tipo_vehiculo: vehicleTipoVehiculo.trim() || null,
      uso: vehicleUso.trim() || null,
      peso: vehiclePeso.trim() || null,
      puestos: Number.isFinite(puestosNum) ? puestosNum : null,
    });

    if (insertError) {
      setVehicleError(insertError.message);
      setIsVehiclesLoading(false);
      return;
    }

    setVehiclePlate('');
    setVehicleBrand('');
    setVehicleModel('');
    setVehicleYear('');
    setVehicleSerialMotor('');
    setVehicleSerialCarroceria('');
    setVehicleColor('');
    setVehicleClase('');
    setVehicleTipoVehiculo('');
    setVehicleUso('');
    setVehiclePeso('');
    setVehiclePuestos('');
    await loadVehicles(selectedClient.id);
    setIsVehiclesLoading(false);
  };

  const handleEditVehicle = (vehicle: typeof vehicles[0]) => {
    setEditingVehicle(vehicle);
    setVehiclePlate(vehicle.plate);
    setVehicleBrand(vehicle.brand || '');
    setVehicleModel(vehicle.model || '');
    setVehicleYear(vehicle.year ? String(vehicle.year) : '');
    setVehicleSerialMotor(vehicle.serial_motor || '');
    setVehicleSerialCarroceria(vehicle.serial_carroceria || '');
    setVehicleColor(vehicle.color || '');
    setVehicleClase(vehicle.clase || '');
    setVehicleTipoVehiculo(vehicle.tipo_vehiculo || '');
    setVehicleUso(vehicle.uso || '');
    setVehiclePeso(vehicle.peso || '');
    setVehiclePuestos(vehicle.puestos ? String(vehicle.puestos) : '');
    setIsEditingVehicleOpen(true);
  };

  const handleUpdateVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingVehicle || !selectedClient || isVehiclesLoading) return;

    const plate = vehiclePlate.trim();
    if (!plate) return;

    setIsVehiclesLoading(true);
    setVehicleError(null);

    const yearNum = vehicleYear.trim() ? Number(vehicleYear.trim()) : null;
    const puestosNum = vehiclePuestos.trim() ? Number(vehiclePuestos.trim()) : null;

    const { error: updateError } = await supabase
      .from('vehicles')
      .update({
        plate,
        brand: vehicleBrand.trim() || null,
        model: vehicleModel.trim() || null,
        year: Number.isFinite(yearNum) ? yearNum : null,
        serial_motor: vehicleSerialMotor.trim() || null,
        serial_carroceria: vehicleSerialCarroceria.trim() || null,
        color: vehicleColor.trim() || null,
        tipo_vehiculo: vehicleTipoVehiculo.trim() || null,
        uso: vehicleUso.trim() || null,
        clase: vehicleClase.trim() || null,
        peso: vehiclePeso.trim() || null,
        puestos: Number.isFinite(puestosNum) ? puestosNum : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingVehicle.id);

    if (updateError) {
      setVehicleError(updateError.message);
      setIsVehiclesLoading(false);
      return;
    }

    setIsEditingVehicleOpen(false);
    setEditingVehicle(null);
    setVehiclePlate('');
    setVehicleBrand('');
    setVehicleModel('');
    setVehicleYear('');
    setVehicleSerialMotor('');
    setVehicleSerialCarroceria('');
    setVehicleColor('');
    setVehicleClase('');
    setVehicleTipoVehiculo('');
    setVehicleUso('');
    setVehiclePeso('');
    setVehiclePuestos('');

    await loadVehicles(selectedClient.id);
    setIsVehiclesLoading(false);
  };

  const resetVehicleForm = () => {
    setVehiclePlate('');
    setVehicleBrand('');
    setVehicleModel('');
    setVehicleYear('');
    setVehicleSerialMotor('');
    setVehicleSerialCarroceria('');
    setVehicleColor('');
    setVehicleClase('');
    setVehicleTipoVehiculo('');
    setVehicleUso('');
    setVehiclePeso('');
    setVehiclePuestos('');
    setEditingVehicle(null);
    setIsEditingVehicleOpen(false);
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Clientes</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-210 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {selectedClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
            </h2>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre y Apellido</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">C.I / RIF</label>
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direccion</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
              )}

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={!isValid || isLoading}
                  className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {isLoading ? 'Guardando...' : selectedClient ? 'Actualizar' : 'Guardar'}
                </button>

                {selectedClient && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDeleteClient()}
                      disabled={isLoading}
                      className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
                    >
                      Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={resetClientForm}
                      disabled={isLoading}
                      className="px-4 py-2 text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedClient ? `Vehículos de ${selectedClient.name}` : 'Listado'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (selectedClient) {
                    void loadVehicles(selectedClient.id);
                  } else {
                    void loadClients();
                  }
                }}
                className="px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                Actualizar
              </button>
            </div>

            {!selectedClient && (
              <div className="mb-4">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar por nombre o cédula..."
                />
              </div>
            )}

            {selectedClient ? (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Agregar vehículo</h3>
                  <form onSubmit={handleCreateVehicle} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

                    {/* Datalists para campos libres con sugerencias */}
                    <datalist id="clase-options">
                      <option value="Automóvil" /><option value="Moto" /><option value="Camioneta" />
                      <option value="Camión" /><option value="Autobús" /><option value="Van" />
                      <option value="Pick-up" /><option value="Scooter" />
                    </datalist>
                    <datalist id="tipo-options">
                      <option value="Sedán" /><option value="Sport Wagon" /><option value="Pick-up" />
                      <option value="Scooter" /><option value="Coupé" /><option value="SUV" />
                      <option value="Hatchback" /><option value="Convertible" /><option value="Minivan" />
                    </datalist>
                    <datalist id="uso-options">
                      <option value="Particular" /><option value="Carga" /><option value="Transporte" />
                      <option value="Público" /><option value="Oficial" /><option value="Taxi" />
                      <option value="Escolar" />
                    </datalist>

                    {/* Fila 1 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Placa</label>
                      <input
                        type="text"
                        value={vehiclePlate}
                        onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                        maxLength={12}
                        placeholder="Ej: ABC123"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
                      <input
                        type="text"
                        value={vehicleBrand}
                        onChange={(e) => setVehicleBrand(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo</label>
                      <input
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Fila 2 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                      <input
                        type="number"
                        value={vehicleYear}
                        onChange={(e) => setVehicleYear(e.target.value)}
                        min={1900} max={2100}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                      <input
                        type="text"
                        value={vehicleColor}
                        onChange={(e) => setVehicleColor(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Clase (Ej: Automóvil, Moto)</label>
                      <input
                        type="text"
                        list="clase-options"
                        value={vehicleClase}
                        onChange={(e) => setVehicleClase(e.target.value)}
                        placeholder="Automóvil, Moto,etc"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Fila 3 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo (Ej: Sedán, Pick-up)</label>
                      <input
                        type="text"
                        list="tipo-options"
                        value={vehicleTipoVehiculo}
                        onChange={(e) => setVehicleTipoVehiculo(e.target.value)}
                        placeholder="Sedán, Pick-up, etc"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Uso (Ej: Particular, Carga)</label>
                      <input
                        type="text"
                        list="uso-options"
                        value={vehicleUso}
                        onChange={(e) => setVehicleUso(e.target.value)}
                        placeholder="Carga, Particular, ..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Peso (Ej: 1500 kg)</label>
                      <input
                        type="text"
                        value={vehiclePeso}
                        onChange={(e) => setVehiclePeso(e.target.value)}
                        placeholder="Ej: 1500 kg"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    {/* Fila 4 */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Puestos (Ej: 5)</label>
                      <input
                        type="number"
                        value={vehiclePuestos}
                        onChange={(e) => setVehiclePuestos(e.target.value)}
                        min={1} max={99}
                        placeholder="Ej: 5"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Serial de Motor (S/M)</label>
                      <input
                        type="text"
                        value={vehicleSerialMotor}
                        onChange={(e) => setVehicleSerialMotor(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Serial de Carrocería (S/C)</label>
                      <input
                        type="text"
                        value={vehicleSerialCarroceria}
                        onChange={(e) => setVehicleSerialCarroceria(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <div className="flex items-end lg:col-span-3">
                      <button
                        type="submit"
                        disabled={!vehiclePlate.trim() || isVehiclesLoading}
                        className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                      >
                        {isVehiclesLoading ? 'Guardando...' : 'Agregar'}
                      </button>
                    </div>
                  </form>

                  {vehicleError && (
                    <div className="mt-3 text-sm text-red-600 dark:text-red-400">{vehicleError}</div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Listado de vehículos</h3>
                  {isVehiclesLoading && vehicles.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
                  ) : vehicles.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">Este cliente no tiene vehículos registrados.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-600 dark:text-gray-300">
                            <th className="py-2">Placa</th>
                            <th className="py-2">Marca</th>
                            <th className="py-2">Modelo</th>
                            <th className="py-2">Año</th>
                            <th className="py-2">Color</th>
                            <th className="py-2">Tipo</th>
                            <th className="py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {vehicles.map((v) => (
                            <tr
                              key={v.id}
                              className="text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40"
                              onClick={() => handleEditVehicle(v)}
                            >
                              <td className="py-2 pr-3 font-medium">{v.plate}</td>
                              <td className="py-2 pr-3">{v.brand ?? '-'}</td>
                              <td className="py-2 pr-3">{v.model ?? '-'}</td>
                              <td className="py-2 pr-3">{v.year ?? '-'}</td>
                              <td className="py-2 pr-3">{v.color ?? '-'}</td>
                              <td className="py-2 pr-3">{v.tipo_vehiculo ?? '-'}</td>
                              <td className="py-2 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!selectedClient) return;
                                    const url = `/billing?clientId=${encodeURIComponent(selectedClient.id)}&vehicleId=${encodeURIComponent(v.id)}`;
                                    window.history.pushState({}, '', url);
                                    window.dispatchEvent(new PopStateEvent('popstate'));
                                  }}
                                  className="mr-2 px-3 py-1.5 text-xs text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                                >
                                  Emitir RCV
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!selectedClient) return;
                                    const url = `/documents?clientId=${encodeURIComponent(selectedClient.id)}&vehicleId=${encodeURIComponent(v.id)}`;
                                    window.history.pushState({}, '', url);
                                    window.dispatchEvent(new PopStateEvent('popstate'));
                                  }}
                                  className="mr-2 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                                >
                                  Ver póliza
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditVehicle(v);
                                  }}
                                  disabled={isVehiclesLoading}
                                  className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-1"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              isLoading && clients.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
              ) : clients.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No hay clientes aún.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 dark:text-gray-300">
                        <th className="py-2">Nombre</th>
                        <th className="py-2">Documento</th>
                        <th className="py-2">Teléfono</th>
                        <th className="py-2">Correo</th>
                        <th className="py-2">Dirección</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {clients.map((c: ClientRow) => {
                        const isSelected = (selectedClient as ClientRow | null)?.id === c.id;
                        const isMatch = debouncedSearchTerm && (
                          c.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                          c.document_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
                        );
                        return (
                          <tr
                            key={c.id}
                            className={`text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 ${
                              isSelected ? 'bg-gray-50 dark:bg-gray-700/30' : ''
                            } ${
                              isMatch ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => void handleSelectClient(c)}
                          >
                            <td className="py-2 pr-3 font-medium">{c.name}</td>
                            <td className="py-2 pr-3">{c.document_id}</td>
                            <td className="py-2 pr-3">{c.phone}</td>
                            <td className="py-2 pr-3">{c.email ?? '-'}</td>
                            <td className="py-2">{c.address ?? '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Haz click en un cliente para ver/gestionar sus vehículos.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {isEditingVehicleOpen && editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={resetVehicleForm} />
          <div className="relative w-full max-w-4xl rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Editar Vehículo</h2>

            <form onSubmit={handleUpdateVehicle} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <datalist id="clase-options">
                <option value="Automóvil" /><option value="Moto" /><option value="Camioneta" />
                <option value="Camión" /><option value="Autobús" /><option value="Van" />
                <option value="Pick-up" /><option value="Scooter" />
              </datalist>
              <datalist id="tipo-options">
                <option value="Sedán" /><option value="Sport Wagon" /><option value="Pick-up" />
                <option value="Scooter" /><option value="Coupé" /><option value="SUV" />
                <option value="Hatchback" /><option value="Convertible" /><option value="Minivan" />
              </datalist>
              <datalist id="uso-options">
                <option value="Particular" /><option value="Carga" /><option value="Transporte" />
                <option value="Público" /><option value="Oficial" /><option value="Taxi" />
                <option value="Escolar" />
              </datalist>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Placa</label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  maxLength={12}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
                <input
                  type="text"
                  value={vehicleBrand}
                  onChange={(e) => setVehicleBrand(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo</label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                <input
                  type="number"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                  min={1900} max={2100}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <input
                  type="text"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Clase (Ej: Automóvil, Moto)</label>
                <input
                  type="text"
                  list="clase-options"
                  value={vehicleClase}
                  onChange={(e) => setVehicleClase(e.target.value)}
                  placeholder="Automóvil, Moto, etc"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo (Ej: Sedán, Pick-up)</label>
                <input
                  type="text"
                  list="tipo-options"
                  value={vehicleTipoVehiculo}
                  onChange={(e) => setVehicleTipoVehiculo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Uso (Ej: Particular, Carga)</label>
                <input
                  type="text"
                  list="uso-options"
                  value={vehicleUso}
                  onChange={(e) => setVehicleUso(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Peso (Ej: 1500 kg)</label>
                <input
                  type="text"
                  value={vehiclePeso}
                  onChange={(e) => setVehiclePeso(e.target.value)}
                  placeholder="Ej: 1500 kg"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Puestos (Ej: 5)</label>
                <input
                  type="number"
                  value={vehiclePuestos}
                  onChange={(e) => setVehiclePuestos(e.target.value)}
                  min={1} max={99}
                  placeholder="Ej: 5"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Serial de Motor (S/M)</label>
                <input
                  type="text"
                  value={vehicleSerialMotor}
                  onChange={(e) => setVehicleSerialMotor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Serial de Carrocería (S/C)</label>
                <input
                  type="text"
                  value={vehicleSerialCarroceria}
                  onChange={(e) => setVehicleSerialCarroceria(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex items-end lg:col-span-4 gap-2">
                <button
                  type="submit"
                  disabled={!vehiclePlate.trim() || isVehiclesLoading}
                  className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {isVehiclesLoading ? 'Guardando...' : 'Actualizar'}
                </button>
                <button
                  type="button"
                  onClick={resetVehicleForm}
                  disabled={isVehiclesLoading}
                  className="px-4 py-2 text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            </form>

            {vehicleError && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-400">{vehicleError}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};