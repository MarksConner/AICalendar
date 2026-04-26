ALTER TABLE events
DROP CONSTRAINT events_calendar_id_fkey;

ALTER TABLE events
ADD CONSTRAINT events_calendar_id_fkey
FOREIGN KEY (calendar_id)
REFERENCES calendar(calendar_id)
ON DELETE CASCADE;