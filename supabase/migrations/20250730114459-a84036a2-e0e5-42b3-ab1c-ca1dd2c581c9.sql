-- Create table to track daily upload attempts
CREATE TABLE public.daily_upload_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  attempt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, attempt_date)
);

-- Enable RLS
ALTER TABLE public.daily_upload_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own upload attempts" 
ON public.daily_upload_attempts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own upload attempts" 
ON public.daily_upload_attempts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload attempts" 
ON public.daily_upload_attempts 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to check and increment upload attempts
CREATE OR REPLACE FUNCTION public.check_and_increment_upload_attempts(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_upload_attempts_updated_at
BEFORE UPDATE ON public.daily_upload_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();