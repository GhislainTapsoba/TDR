-- Créer la table email_logs si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid,
  recipient character varying NOT NULL,
  subject character varying NOT NULL,
  body text NOT NULL,
  status character varying DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','SENT','FAILED')),
  sent_at timestamp with time zone,
  error_message text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_recipient_id_fkey
    FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE SET NULL
);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_id ON public.email_logs(recipient_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at);
