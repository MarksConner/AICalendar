ALTER TABLE public.calendar
ADD CONSTRAINT fk_calendar_user
FOREIGN KEY(user_id) 
REFERENCES public.users(user_id)
ON DELETE CASCADE
ALTER TABLE public.events 
ADD CONSTRAINT fk_events_calendar
FOREIGN KEY(calendar_id)
REFERENCES public.calendar(calendar_id)
ON DELETE CASCADE
ALTER TABLE public.events_participants
ADD CONSTRAINT fk_events_participants_event
FOREIGN KEY(event_id)
REFERENCES public.events(event_id)
ON DELETE CASCADE