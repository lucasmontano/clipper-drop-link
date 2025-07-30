-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public) VALUES ('video-uploads', 'video-uploads', false);

-- Create table for upload configurations
CREATE TABLE public.upload_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  max_file_size_mb INTEGER NOT NULL DEFAULT 100,
  allowed_formats TEXT[] NOT NULL DEFAULT ARRAY['mp4', 'mov', 'avi', 'mkv'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upload_configs ENABLE ROW LEVEL SECURITY;

-- Create policy for reading configs (public access)
CREATE POLICY "Upload configs are publicly readable" 
ON public.upload_configs 
FOR SELECT 
USING (true);

-- Create table for upload sessions
CREATE TABLE public.upload_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_token TEXT NOT NULL UNIQUE,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for upload sessions
CREATE POLICY "Users can create upload sessions" 
ON public.upload_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can read their own sessions by token" 
ON public.upload_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own sessions by token" 
ON public.upload_sessions 
FOR UPDATE 
USING (true);

-- Create storage policies for video uploads
CREATE POLICY "Users can upload videos with valid session" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'video-uploads' AND
  EXISTS (
    SELECT 1 FROM public.upload_sessions 
    WHERE upload_token = (storage.foldername(name))[1] 
    AND is_verified = true 
    AND expires_at > now()
  )
);

CREATE POLICY "Users can view their uploaded videos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'video-uploads' AND
  EXISTS (
    SELECT 1 FROM public.upload_sessions 
    WHERE upload_token = (storage.foldername(name))[1]
  )
);

-- Insert default configuration
INSERT INTO public.upload_configs (max_file_size_mb, allowed_formats) 
VALUES (100, ARRAY['mp4', 'mov', 'avi', 'mkv']);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_upload_configs_updated_at
BEFORE UPDATE ON public.upload_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();