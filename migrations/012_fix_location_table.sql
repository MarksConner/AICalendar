ALTER TABLE events
DROP CONSTRAINT IF EXISTS events_full_address_fkey
ALTER TABLE locations
DROP CONSTRAINT IF EXISTS locations_pkey
ALTER TABLE locations
ADD COLUMN location_id uuid DEFAULT gen_random_uuid()
ALTER TABLE locations
ADD CONSTRAINT locations_pkey PRIMARY KEY (location_id)
ALTER TABLE locations
ADD CONSTRAINT locations_full_address_key UNIQUE (full_address)
ALTER TABLE events
ADD COLUMN location_id uuid
ALTER TABLE events
ADD CONSTRAINT events_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(location_id) ON DELETE SET NULL