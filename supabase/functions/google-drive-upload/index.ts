import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileName, folderId, fileData, mimeType } = await req.json();

    if (!fileName || !fileData) {
      throw new Error('fileName and fileData are required');
    }

    // Get access token (call the token refresh function)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL not configured');
    }

    const tokenResponse = await fetch(
      `${supabaseUrl}/functions/v1/google-drive-token`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY') || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Failed to get access token: ${error.error || tokenResponse.statusText}`);
    }

    const { accessToken } = await tokenResponse.json();

    // Convert base64 to Uint8Array
    const fileBuffer = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    // Create multipart body for Google Drive API
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const metadata = {
      name: fileName,
      ...(folderId && { parents: [folderId] }),
    };

    const encoder = new TextEncoder();
    const metadataPart = encoder.encode(
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`
    );
    const endBoundary = encoder.encode(`\r\n--${boundary}--\r\n`);

    const body = new Uint8Array(metadataPart.length + fileBuffer.length + endBoundary.length);
    body.set(metadataPart, 0);
    body.set(fileBuffer, metadataPart.length);
    body.set(endBoundary, metadataPart.length + fileBuffer.length);

    // Upload to Google Drive
    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: body,
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Upload error:', error);
      throw new Error(`Upload failed: ${JSON.stringify(error)}`);
    }

    const uploadData = await uploadResponse.json();

    // Get file URLs
    const fileId = uploadData.id;
    const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;
    const webContentLink = `https://drive.google.com/uc?export=download&id=${fileId}`;

    return new Response(
      JSON.stringify({
        id: fileId,
        webViewLink,
        webContentLink,
        name: uploadData.name,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in google-drive-upload function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
