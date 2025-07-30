-- Create payments table to track payment history
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  total_views INTEGER NOT NULL DEFAULT 0,
  payment_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  submission_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all payments" 
ON public.payments 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'comercial@lucasmontano.com'::text);

CREATE POLICY "Admin can create payments" 
ON public.payments 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'comercial@lucasmontano.com'::text);

CREATE POLICY "Admin can update payments" 
ON public.payments 
FOR UPDATE 
USING ((auth.jwt() ->> 'email'::text) = 'comercial@lucasmontano.com'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();