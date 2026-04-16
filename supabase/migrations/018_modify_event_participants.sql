-- Add a new UUID primary key column to the events_participants table
ALTER TABLE events_participants
ADD COLUMN event_participant_id UUID DEFAULT gen_random_uuid();

ALTER TABLE events_participants
ALTER COLUMN event_participant_id SET NOT NULL;

-- Drop old composite primary key constraint, name and infoare no longer primary keys.
ALTER TABLE events_participants
DROP CONSTRAINT events_participants_pkey;


ALTER TABLE events_participants
ADD CONSTRAINT events_participants_pkey PRIMARY KEY (event_participant_id);
-- Add nullable columns for name and info, since they are no longer part of the primary key
-- Name can not be null
ALTER TABLE events_participants
ALTER COLUMN name SET NOT NULL;

-- info can be null
ALTER TABLE events_participants
ALTER COLUMN info DROP NOT NULL;