-- Add DELETE policy for users to delete their own submissions
CREATE POLICY "Users can delete their own submissions" 
ON public.video_submissions 
FOR DELETE 
USING (auth.uid() = user_id);