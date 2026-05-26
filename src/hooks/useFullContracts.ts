import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export type FullContractRow = {
  contract_id: string;
  policy_number: string;
  status: string;
  client_id: string;
  vehicle_id: string;
  plan_id: string | null;
  start_date: string;
  end_date: string;
  issued_at: string;
  qr_code_url: string | null;
  pdf_url: string | null;

  client_name: string | null;
  client_document_id: string | null;

  vehicle_plate: string | null;
  vehicle_brand: string | null;

  document_id: string | null;
  document_kind: string | null;
  document_filename: string | null;
  document_storage_bucket: string | null;
  document_storage_path: string | null;
  document_mime_type: string | null;
  document_size_bytes: number | null;
  document_created_at: string | null;
};

export const useFullContracts = () => {
  const [contracts, setContracts] = useState<FullContractRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: selectError } = await supabase
      .from('v_full_contract_details')
      .select(
        'contract_id,policy_number,status,client_id,vehicle_id,plan_id,start_date,end_date,issued_at,qr_code_url,pdf_url,client_name,client_document_id,vehicle_plate,vehicle_brand,document_id,document_kind,document_filename,document_storage_bucket,document_storage_path,document_mime_type,document_size_bytes,document_created_at'
      )
      .order('issued_at', { ascending: false });

    if (selectError) {
      setError(selectError.message);
      setContracts([]);
      setLoading(false);
      return;
    }

    setContracts((data ?? []) as FullContractRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { contracts, loading, error, refresh };
};
