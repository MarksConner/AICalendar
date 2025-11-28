
ALTER TABLE public.calendar
DROP CONSTRAINT IF EXISTS calendar_user_id_fkey;
ALTER TABLE public.calendar
DROP CONSTRAINT IF EXISTS fk_calendar_user;

ALTER TABLE public.calendar
ADD CONSTRAINT calendar_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(user_id)
ON DELETE CASCADE;

ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_calendar_id_fkey;
ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS fk_events_calendar;

ALTER TABLE public.events
ADD CONSTRAINT events_calendar_id_fkey
FOREIGN KEY (calendar_id)
REFERENCES public.calendar(calendar_id)
ON DELETE CASCADE;

ALTER TABLE public.events_participants
DROP CONSTRAINT IF EXISTS events_participants_event_id_fkey;
ALTER TABLE public.events_participants
DROP CONSTRAINT IF EXISTS fk_events_participants_event;

ALTER TABLE public.events_participants
ADD CONSTRAINT events_participants_event_id_fkey
FOREIGN KEY (event_id)
REFERENCES public.events(event_id)
ON DELETE CASCADE;

