ALTER TABLE public.calendar
ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.calendar
ALTER COLUMN updated_at SET NOT NULL;