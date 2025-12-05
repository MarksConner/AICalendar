-- If an user is eliminated all chats in which that users UUID appears are also eliminated.
ALTER TABLE public.chat
DROP CONSTRAINT IF EXISTS chat_user_id_fkey
ALTER TABLE public.chat
DROP CONSTRAINT IF EXISTS fk_chat_user
ALTER TABLE public.chat
ADD CONSTRAINT chat_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(user_id)
ON DELETE CASCADE