-- Add approval status to video submissions
ALTER TABLE public.video_submissions 
ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending';

-- Add a check constraint to ensure valid statuses
ALTER TABLE public.video_submissions 
ADD CONSTRAINT video_submissions_approval_status_check 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Create an index for better performance when filtering by approval status
CREATE INDEX idx_video_submissions_approval_status ON public.video_submissions(approval_status);