import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl, userId } = await req.json();
    
    console.log('Download video request:', { videoUrl, userId });

    if (!videoUrl || !userId) {
      return new Response(
        JSON.stringify({ error: 'videoUrl and userId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate URL format
    let url: URL;
    try {
      url = new URL(videoUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting video download from:', videoUrl);

    // Download the video file
    const downloadResponse = await fetch(videoUrl);
    
    if (!downloadResponse.ok) {
      console.error('Failed to download video:', downloadResponse.status, downloadResponse.statusText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to download video: ${downloadResponse.status} ${downloadResponse.statusText}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get content type and size
    const contentType = downloadResponse.headers.get('content-type') || 'video/mp4';
    const contentLength = downloadResponse.headers.get('content-length');
    
    console.log('Video details:', { contentType, contentLength });

    // Check file size (200MB limit)
    if (contentLength && parseInt(contentLength) > 200 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Video file is too large (maximum 200MB)' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get file extension from URL or content type
    const pathname = url.pathname;
    let fileExtension = pathname.split('.').pop()?.toLowerCase() || 'mp4';
    
    // Validate file extension
    const allowedFormats = ['mp4', 'mov', 'avi', 'mkv'];
    if (!allowedFormats.includes(fileExtension)) {
      // Try to get extension from content type
      if (contentType.includes('mp4')) fileExtension = 'mp4';
      else if (contentType.includes('mov') || contentType.includes('quicktime')) fileExtension = 'mov';
      else if (contentType.includes('avi')) fileExtension = 'avi';
      else if (contentType.includes('mkv')) fileExtension = 'mkv';
      else {
        return new Response(
          JSON.stringify({ 
            error: `Unsupported video format. Allowed: ${allowedFormats.join(', ')}` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Convert response to blob
    const videoBlob = await downloadResponse.blob();
    
    console.log('Video downloaded, size:', videoBlob.size, 'bytes');

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-downloaded.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    console.log('Uploading to storage:', filePath);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-uploads')
      .upload(filePath, videoBlob, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Video uploaded successfully:', uploadData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        filePath: uploadData.path,
        fileName,
        fileSize: videoBlob.size
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in download-video function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});