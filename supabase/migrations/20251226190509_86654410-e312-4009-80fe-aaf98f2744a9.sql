-- Create email_queue table for delayed email sending
CREATE TABLE public.email_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  cpf TEXT,
  telefone TEXT,
  tipo_chave TEXT,
  chave_pix TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

-- Policy for service role to manage
CREATE POLICY "Service role can manage email_queue"
ON public.email_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_queue;

-- Create index for efficient querying
CREATE INDEX idx_email_queue_status_created ON public.email_queue(status, created_at);