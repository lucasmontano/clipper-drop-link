-- Create table for video submissions
CREATE TABLE public.video_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('file_upload', 'url_link')),
  file_path TEXT, -- For uploaded files
  video_url TEXT, -- For URL submissions
  original_filename TEXT,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_submission_data CHECK (
    (submission_type = 'file_upload' AND file_path IS NOT NULL AND video_url IS NULL) OR
    (submission_type = 'url_link' AND video_url IS NOT NULL AND file_path IS NULL)
  )
);

-- Enable RLS
ALTER TABLE public.video_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own submissions" 
ON public.video_submissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions" 
ON public.video_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions" 
ON public.video_submissions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_video_submissions_updated_at
BEFORE UPDATE ON public.video_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();