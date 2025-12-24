CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_transaction TEXT NOT NULL,
  user_cpf TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_phone TEXT,
  amount NUMERIC NOT NULL,
  product_name TEXT NOT NULL,
  payment_code TEXT,
  status TEXT NOT NULL DEFAULT 'waiting_payment',
  page_origin TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Users can view" ON public.transactions FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.update_transactions_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_transactions_updated_at();