-- Add email column to video_submissions table
ALTER TABLE public.video_submissions 
ADD COLUMN user_email text;