--Migration: add geocoded latitude/longitude to events table
--To be populated by backend when address provided
--Can be null for events without a location
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS geo_latitude FLOAT,
    ADD COLUMN IF NOT EXISTS geo_longitude FLOAT;