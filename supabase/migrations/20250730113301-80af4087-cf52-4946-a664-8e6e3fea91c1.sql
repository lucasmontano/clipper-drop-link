-- Update upload_sessions table to link to authenticated users
ALTER TABLE public.upload_sessions 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update RLS policies for upload_sessions
DROP POLICY IF EXISTS "Users can create upload sessions" ON public.upload_sessions;
DROP POLICY IF EXISTS "Users can read their own sessions by token" ON public.upload_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions by token" ON public.upload_sessions;

-- Create new policies for authenticated users
CREATE POLICY "Authenticated users can create upload sessions" 
ON public.upload_sessions 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own sessions" 
ON public.upload_sessions 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.upload_sessions 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Update storage policies for authenticated users
CREATE POLICY "Users can upload their own videos" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own videos" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'video-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);