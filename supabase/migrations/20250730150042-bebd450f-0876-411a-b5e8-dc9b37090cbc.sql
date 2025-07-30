-- Insert missing profiles for users who have video submissions but no profile
INSERT INTO public.profiles (id, email, display_name)
SELECT DISTINCT vs.user_id, vs.user_email, vs.user_email
FROM video_submissions vs
LEFT JOIN profiles p ON vs.user_id = p.id
WHERE p.id IS NULL 
  AND vs.user_email IS NOT NULL 
  AND vs.user_id IS NOT NULL;

-- Verify the profiles were created
SELECT id, email FROM profiles;