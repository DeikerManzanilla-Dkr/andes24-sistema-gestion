import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuración CORS optimizada para localhost y producción
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type IssuePolicyRequest = {
  contract_id?: string;
  policy_number: string;
  client_id: string;
  vehicle_id: string;
  plan_id: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  pdf_base64: string; // base64 sin data: prefix
  mime_type?: string;
  price_eur: number;
};

serve(async (req: Request) => {
  // Handle CORS preflight - respuesta inmediata para OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Solo permitir POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      success: false
    }), { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  try {
    // Validar variables de entorno críticas
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing environment variables:', { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!serviceRoleKey 
      });
      return new Response(JSON.stringify({ 
        error: 'Server configuration error: Missing Supabase credentials',
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log de request para debugging
    const authHeader = req.headers.get('authorization');
    const apiKey = req.headers.get('apikey');
    const userAgent = req.headers.get('user-agent');
    
    console.log('📥 Request received:', {
      method: req.method,
      url: req.url,
      hasAuth: !!authHeader,
      hasApiKey: !!apiKey,
      userAgent: userAgent?.substring(0, 50),
      timestamp: new Date().toISOString()
    });

    // Parse y validación del payload
    let payload: IssuePolicyRequest;
    try {
      const requestBody = await req.text();
      console.log('📄 Request body length:', requestBody.length);
      payload = JSON.parse(requestBody) as IssuePolicyRequest;
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON payload',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validación de campos requeridos
    const requiredFields = ['policy_number', 'client_id', 'vehicle_id', 'plan_id', 'start_date', 'end_date', 'pdf_base64'];
    const missingFields = requiredFields.filter(field => !payload[field as keyof IssuePolicyRequest]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        missing_fields: missingFields,
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mimeType = payload.mime_type ?? 'application/pdf';

    // Crear cliente Supabase con SERVICE_ROLE_KEY para bypass RLS
    console.log('🔑 Creating Supabase client with SERVICE_ROLE_KEY...');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Supabase client created successfully');

    // Decodificar base64 de forma segura
    let binaryString: string;
    let bytes: Uint8Array;
    
    try {
      // Limpiar el base64 si tiene prefijo
      const cleanBase64 = payload.pdf_base64.replace(/^data:application\/pdf;base64,/, '');
      binaryString = atob(cleanBase64);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i += 1) {
        bytes[i] = binaryString.charCodeAt(i);
      }
    } catch (base64Error) {
      console.error('❌ Base64 decode error:', base64Error);
      return new Response(JSON.stringify({ 
        error: 'Invalid base64 data',
        success: false
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const filename = `RCV-${payload.policy_number.replace('RCV-', '')}.pdf`;
    const storageBucket = 'documents'; // Bucket definido en tu estructura
    const storagePath = `policies/${payload.policy_number}/${filename}`;

    console.log('📤 Starting file upload:', { 
      storageBucket, 
      storagePath, 
      fileSize: bytes.byteLength,
      mimeType 
    });

    // Subir archivo al bucket de storage
    const { error: uploadError } = await supabase.storage
      .from(storageBucket)
      .upload(storagePath, bytes, { 
        contentType: mimeType, 
        upsert: true,
        metadata: {
          policy_number: payload.policy_number,
          client_id: payload.client_id,
          upload_timestamp: new Date().toISOString(),
          source: 'issue-policy-function'
        }
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return new Response(JSON.stringify({ 
        error: `File upload failed: ${uploadError.message}`,
        details: uploadError,
        success: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ File uploaded successfully');

    // Obtener URL pública del archivo
    const { data: publicData } = supabase.storage.from(storageBucket).getPublicUrl(storagePath);
    const pdfUrl = publicData.publicUrl;

    console.log('🔗 Public URL generated:', pdfUrl);

    let contractId: string | null = payload.contract_id ?? null;

    // Crear o actualizar contrato
    if (!contractId) {
      console.log('📝 Creating new contract...');
      
      const { data: newContract, error: insertError } = await supabase
        .from('contracts')
        .insert({
          policy_number: payload.policy_number,
          client_id: payload.client_id,
          vehicle_id: payload.vehicle_id,
          plan_id: payload.plan_id,
          start_date: payload.start_date,
          end_date: payload.end_date,
          status: 'active',
          pdf_url: pdfUrl,
          qr_code_url: pdfUrl,
          price_eur: payload.price_eur || 0,
          issued_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Contract insert error:', insertError);
        return new Response(JSON.stringify({ 
          error: `Failed to create contract: ${insertError.message}`,
          details: insertError,
          success: false
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      contractId = newContract?.id ?? null;
      console.log('✅ Contract created:', contractId);

      // Registrar documento en la tabla documents
      if (contractId) {
        const { error: docError } = await supabase
          .from('documents')
          .insert({
            contract_id: contractId,
            kind: 'rcv',
            filename: filename,
            storage_bucket: storageBucket,
            storage_path: storagePath,
            mime_type: mimeType,
            size_bytes: bytes.byteLength
          });

        if (docError) {
          console.error('⚠️ Document insert error:', docError);
          // No fallamos completamente si el documento no se puede registrar
        } else {
          console.log('✅ Document registered successfully');
        }
      }
    } else {
      console.log('🔄 Updating existing contract:', contractId);
      
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ 
          pdf_url: pdfUrl, 
          qr_code_url: pdfUrl, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', contractId);

      if (updateError) {
        console.error('❌ Contract update error:', updateError);
        return new Response(JSON.stringify({ 
          error: `Failed to update contract: ${updateError.message}`,
          details: updateError,
          success: false
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('✅ Contract updated successfully');
    }

    // Respuesta exitosa completa
    const response = {
      success: true,
      message: 'Policy issued successfully',
      data: {
        contract_id: contractId,
        policy_number: payload.policy_number,
        pdf_url: pdfUrl,
        storage_path: storagePath,
        file_size: bytes.byteLength,
        mime_type: mimeType
      }
    };

    console.log('🎉 Operation completed successfully:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('💥 Unexpected error:', err);
    return new Response(JSON.stringify({ 
      error: err instanceof Error ? err.message : 'Unknown server error',
      success: false,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
