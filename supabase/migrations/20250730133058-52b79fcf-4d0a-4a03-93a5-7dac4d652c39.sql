-- Create admin policy for video_submissions to allow admin user to see all submissions
CREATE POLICY "Admin can view all submissions" 
ON public.video_submissions 
FOR SELECT 
USING (
  auth.jwt() ->> 'email' = 'comercial@lucasmontano.com'
);