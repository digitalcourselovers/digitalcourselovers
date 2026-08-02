
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_chat_member(uuid) FROM anon, authenticated, public;
