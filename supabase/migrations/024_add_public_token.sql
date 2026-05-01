ALTER TABLE calendar
ADD COLUMN IF NOT EXISTS public_token UUID DEFAULT gen_random_uuid();