CREATE TABLE public.users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
)
CREATE TABLE public.calendar (
  calendar_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  updated_at TIMESTAMP,
  calendar_name TEXT NOT NULL,
  date_start TIMESTAMP,
  date_end TIMESTAMP,
  user_id UUID REFERENCES public.users(user_id)
)
CREATE TABLE public.locations (
  full_address TEXT PRIMARY KEY,
  zip_code INT,
  state TEXT,
  city TEXT,
  user_id UUID REFERENCES public.users(user_id)
)
CREATE TABLE public.events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_address TEXT REFERENCES public.locations(full_address),
  event_description TEXT,
  priority_rank INT,
  calendar_id UUID REFERENCES public.calendar(calendar_id),
  event_name TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP
)
CREATE TABLE public.events_participants (
  name TEXT,
  role TEXT,
  info TEXT,
  event_id UUID REFERENCES public.events(event_id),
  PRIMARY KEY (name, info, event_id)
)
CREATE TABLE public.chat (
  chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(user_id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP,
  chat_name TEXT
)
CREATE TABLE public.messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.chat(chat_id),
  sent_at TIMESTAMP DEFAULT now(),
  sender_is BOOLEAN,
  content TEXT,
  file_url TEXT
)