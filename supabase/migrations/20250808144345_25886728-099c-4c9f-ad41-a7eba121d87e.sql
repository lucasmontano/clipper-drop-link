-- Add DELETE policy for admin
CREATE POLICY "Admin can delete submissions" 
ON public.video_submissions 
FOR DELETE 
USING ((auth.jwt() ->> 'email'::text) = 'comercial@lucasmontano.com'::text);