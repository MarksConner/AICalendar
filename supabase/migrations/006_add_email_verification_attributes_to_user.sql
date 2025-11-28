ALTER TABLE public.users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE
NOT NULL;

ALTER TABLE public.users
ADD COLUMN email_verification_token UUID;
