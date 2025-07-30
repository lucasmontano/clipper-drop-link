-- Fix the function security issue by setting search_path
CREATE OR REPLACE FUNCTION public.check_and_increment_upload_attempts(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    current_attempts INTEGER := 0;
    max_attempts INTEGER := 5;
    result JSON;
BEGIN
    -- Get current attempts for today
    SELECT attempt_count INTO current_attempts
    FROM public.daily_upload_attempts
    WHERE user_id = user_uuid AND attempt_date = CURRENT_DATE;
    
    -- If no record exists, create one
    IF current_attempts IS NULL THEN
        INSERT INTO public.daily_upload_attempts (user_id, attempt_date, attempt_count)
        VALUES (user_uuid, CURRENT_DATE, 1);
        current_attempts := 1;
    ELSE
        -- Check if limit exceeded
        IF current_attempts >= max_attempts THEN
            result := json_build_object(
                'allowed', false,
                'current_attempts', current_attempts,
                'max_attempts', max_attempts,
                'message', 'Daily upload limit exceeded. Try again tomorrow.'
            );
            RETURN result;
        END IF;
        
        -- Increment attempt count
        UPDATE public.daily_upload_attempts
        SET attempt_count = attempt_count + 1,
            updated_at = now()
        WHERE user_id = user_uuid AND attempt_date = CURRENT_DATE;
        
        current_attempts := current_attempts + 1;
    END IF;
    
    result := json_build_object(
        'allowed', true,
        'current_attempts', current_attempts,
        'max_attempts', max_attempts,
        'remaining_attempts', max_attempts - current_attempts
    );
    
    RETURN result;
END;
$$;