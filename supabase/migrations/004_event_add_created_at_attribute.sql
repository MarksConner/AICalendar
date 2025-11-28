ALTER TABLE public.events
ADD COLUMN created_at TIMESTAMP DEFAULT now();