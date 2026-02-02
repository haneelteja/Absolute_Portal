import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppSendRequest {
  customerId: string;
  messageType: 'stock_delivered' | 'invoice' | 'payment_reminder' | 'festival';
  triggerType: 'auto' | 'scheduled' | 'manual';
  templateId?: string;
  customMessage?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  scheduledFor?: string;
  placeholders?: Record<string, string>; // Custom placeholder values
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const {
      customerId,
      messageType,
      triggerType,
      templateId,
      customMessage,
      attachmentUrl,
      attachmentType,
      scheduledFor,
      placeholders = {},
    }: WhatsAppSendRequest = await req.json();

    // Validate required fields
    if (!customerId || !messageType || !triggerType) {
      throw new Error('customerId, messageType, and triggerType are required');
    }

    // Step 1: Get WhatsApp configuration
    const { data: configData, error: configError } = await supabase
      .from('invoice_configurations')
      .select('config_key, config_value')
      .in('config_key', [
        'whatsapp_enabled',
        `whatsapp_${messageType}_enabled`,
        'whatsapp_api_key',
        'whatsapp_api_url',
        'whatsapp_retry_max',
        'whatsapp_failure_notification_email',
      ]);

    if (configError) {
      throw new Error(`Failed to fetch config: ${configError.message}`);
    }

    const config: Record<string, string> = {};
    (configData || []).forEach((item) => {
      config[item.config_key] = item.config_value;
    });

    // Check if WhatsApp is enabled
    if (config.whatsapp_enabled !== 'true') {
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp messaging is disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this message type is enabled
    if (config[`whatsapp_${messageType}_enabled`] !== 'true') {
      return new Response(
        JSON.stringify({ success: false, error: `${messageType} messages are disabled` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = config.whatsapp_api_key;
    const apiUrl = config.whatsapp_api_url || 'https://api.360messenger.com';
    const maxRetries = parseInt(config.whatsapp_retry_max || '3', 10);
    const failureEmail = config.whatsapp_failure_notification_email || 'pega2023test@gmail.com';

    if (!apiKey) {
      throw new Error('WhatsApp API key not configured');
    }

    // Step 2: Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, client_name, whatsapp_number')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      throw new Error(`Customer not found: ${customerError?.message || 'Unknown error'}`);
    }

    if (!customer.whatsapp_number) {
      throw new Error(`Customer ${customer.client_name} does not have a WhatsApp number`);
    }

    // Validate WhatsApp number format
    const whatsappRegex = /^\+?[1-9]\d{1,14}$/;
    if (!whatsappRegex.test(customer.whatsapp_number.replace(/\s/g, ''))) {
      throw new Error(`Invalid WhatsApp number format: ${customer.whatsapp_number}`);
    }

    // Step 3: Get template or use custom message
    let messageContent = customMessage;
    let templateIdToUse = templateId;

    if (!messageContent) {
      // Fetch template
      let templateQuery = supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('message_type', messageType)
        .eq('is_active', true);

      if (templateId) {
        templateQuery = templateQuery.eq('id', templateId);
      } else {
        // Use default template
        templateQuery = templateQuery.eq('is_default', true);
      }

      const { data: template, error: templateError } = await templateQuery.single();

      if (templateError || !template) {
        throw new Error(`Template not found: ${templateError?.message || 'Unknown error'}`);
      }

      templateIdToUse = template.id;
      messageContent = template.template_content;

      // Replace placeholders
      const defaultPlaceholders: Record<string, string> = {
        customerName: customer.client_name,
        ...placeholders,
      };

      // Replace placeholders in template
      messageContent = messageContent.replace(/\{(\w+)\}/g, (match, key) => {
        return defaultPlaceholders[key] || match;
      });
    }

    // Step 4: Create message log entry
    const { data: logEntry, error: logError } = await supabase
      .from('whatsapp_message_logs')
      .insert({
        customer_id: customerId,
        customer_name: customer.client_name,
        whatsapp_number: customer.whatsapp_number,
        message_type: messageType,
        trigger_type: triggerType,
        status: 'pending',
        message_content: messageContent,
        template_id: templateIdToUse,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        max_retries: maxRetries,
      })
      .select()
      .single();

    if (logError || !logEntry) {
      throw new Error(`Failed to create log entry: ${logError?.message || 'Unknown error'}`);
    }

    const logId = logEntry.id;

    // Step 5: Send message via 360Messenger API
    try {
      let apiResponse;

      if (attachmentUrl && attachmentType) {
        // Send media message
        // Note: 360Messenger API may require file download and multipart upload
        // For now, we'll send the URL and let the API handle it
        // Try multiple endpoint formats
        const mediaEndpointVariants = [
          '/api/v1/messages/media',
          '/v1/messages/media',
          '/api/messages/media',
          '/messages/media',
          '/api/v1/messages',
          '/v1/messages',
        ];

        let mediaResponse: Response | null = null;
        let lastMediaError: string = '';

        for (const endpoint of mediaEndpointVariants) {
          try {
            mediaResponse = await fetch(`${apiUrl}${endpoint}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: customer.whatsapp_number,
                message: messageContent,
                media_url: attachmentUrl,
                media_type: attachmentType,
              }),
            });

            if (mediaResponse.ok) {
              break; // Success, exit loop
            } else {
              const errorData = await mediaResponse.json().catch(() => ({ error: 'Unknown error' }));
              lastMediaError = `Endpoint ${endpoint}: ${JSON.stringify(errorData)}`;
              console.log(`Tried ${endpoint}, got ${mediaResponse.status}:`, errorData);
              mediaResponse = null;
            }
          } catch (err) {
            lastMediaError = `Endpoint ${endpoint}: ${err instanceof Error ? err.message : 'Unknown error'}`;
            console.log(`Error trying ${endpoint}:`, err);
            mediaResponse = null;
          }
        }

        if (!mediaResponse || !mediaResponse.ok) {
          throw new Error(`API error: All media endpoint variants failed. Last error: ${lastMediaError}. Please verify the 360Messenger API endpoint structure.`);
        }

        apiResponse = await mediaResponse.json();
      } else {
        // Send text message
        // Try multiple endpoint formats as 360Messenger API structure may vary
        const endpointVariants = [
          '/api/v1/messages/text',
          '/v1/messages/text',
          '/api/messages/text',
          '/messages/text',
          '/api/v1/messages',
          '/v1/messages',
          '/messages/send',
          '/api/send',
          '/send',
          '/api/v1/send',
          '/v1/send',
          '/messages',
          '/api/messages',
        ];

        let textResponse: Response | null = null;
        let lastError: string = '';
        const attemptedEndpoints: string[] = [];

        // Also try with API key as query parameter (some APIs use this)
        const requestBodies = [
          {
            to: customer.whatsapp_number,
            message: messageContent,
            template_id: templateIdToUse,
          },
          {
            phone: customer.whatsapp_number,
            text: messageContent,
            template_id: templateIdToUse,
          },
          {
            recipient: customer.whatsapp_number,
            message: messageContent,
            template_id: templateIdToUse,
          },
        ];

        for (const endpoint of endpointVariants) {
          for (const requestBody of requestBodies) {
            try {
              const fullUrl = `${apiUrl}${endpoint}`;
              attemptedEndpoints.push(fullUrl);
              
              // Try with Bearer token
              textResponse = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
              });

              if (textResponse.ok) {
                console.log(`✅ Success with endpoint: ${endpoint}, body format: ${JSON.stringify(Object.keys(requestBody))}`);
                break; // Success, exit both loops
              } else {
                const errorData = await textResponse.json().catch(() => ({ error: 'Unknown error' }));
                lastError = `Endpoint ${endpoint} (${JSON.stringify(Object.keys(requestBody))}): ${JSON.stringify(errorData)}`;
                console.log(`❌ Tried ${endpoint}, got ${textResponse.status}:`, errorData);
                textResponse = null;
              }
            } catch (err) {
              lastError = `Endpoint ${endpoint}: ${err instanceof Error ? err.message : 'Unknown error'}`;
              console.log(`❌ Error trying ${endpoint}:`, err);
              textResponse = null;
            }
            
            if (textResponse && textResponse.ok) break; // Exit inner loop if successful
          }
          if (textResponse && textResponse.ok) break; // Exit outer loop if successful
        }

        // If Bearer token failed, try with API key as query parameter
        if (!textResponse || !textResponse.ok) {
          console.log('Trying with API key as query parameter...');
          for (const endpoint of endpointVariants.slice(0, 5)) { // Try top 5 endpoints
            try {
              const fullUrl = `${apiUrl}${endpoint}?api_key=${apiKey}`;
              attemptedEndpoints.push(fullUrl);
              
              textResponse = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  to: customer.whatsapp_number,
                  message: messageContent,
                  template_id: templateIdToUse,
                }),
              });

              if (textResponse.ok) {
                console.log(`✅ Success with endpoint (query param): ${endpoint}`);
                break;
              } else {
                const errorData = await textResponse.json().catch(() => ({ error: 'Unknown error' }));
                lastError = `Endpoint ${endpoint} (query param): ${JSON.stringify(errorData)}`;
                console.log(`❌ Tried ${endpoint} (query param), got ${textResponse.status}:`, errorData);
                textResponse = null;
              }
            } catch (err) {
              lastError = `Endpoint ${endpoint} (query param): ${err instanceof Error ? err.message : 'Unknown error'}`;
              console.log(`❌ Error trying ${endpoint} (query param):`, err);
              textResponse = null;
            }
            if (textResponse && textResponse.ok) break;
          }
        }

        if (!textResponse || !textResponse.ok) {
          const errorDetails = {
            message: 'All endpoint variants failed',
            attemptedEndpoints: attemptedEndpoints.slice(0, 10), // Show first 10 attempts
            lastError,
            apiUrl,
            suggestion: 'Please check 360Messenger API documentation or contact support for the correct endpoint format'
          };
          console.error('All endpoint attempts failed:', errorDetails);
          throw new Error(`API error: ${JSON.stringify(errorDetails)}`);
        }

        apiResponse = await textResponse.json();
      }

      // Step 6: Update log with success
      await supabase
        .from('whatsapp_message_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          api_response: apiResponse,
        })
        .eq('id', logId);

      return new Response(
        JSON.stringify({
          success: true,
          messageLogId: logId,
          apiResponse,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (apiError) {
      // Update log with failure
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';

      await supabase
        .from('whatsapp_message_logs')
        .update({
          status: 'failed',
          failure_reason: errorMessage,
          retry_count: 0, // Will be incremented by retry function
        })
        .eq('id', logId);

      // Send failure notification if max retries exceeded (handled by retry function)
      // For now, just return error
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          messageLogId: logId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
