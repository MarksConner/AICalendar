from datetime import datetime, timezone, timedelta
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.chat import Chat
from app.models.messages import Messages
from app.services.messages_service import create_message


#Create a chat for a given user when a message is sent. Add the first sentence as title 
def create_chat_record(session: Session, user_id: UUID, content: str) -> Chat:
    first_sentence = content.split(".")[0].strip() or "New chat"

    new_chat = Chat(chat_name=first_sentence, user_id=user_id)
    new_chat.created_at = datetime.now(timezone.utc)
    new_chat.updated_at = datetime.now(timezone.utc)
    session.add(new_chat)
    session.flush()  
    first_message = create_message(session, new_chat.chat_id, content, True)

    session.commit()
    session.refresh(new_chat)
    session.refresh(first_message)
    return new_chat

#Delete a chat that belongs to a given user
def delete_chat(session: Session, chat_id: UUID, user_id: UUID) -> bool:
    chat = (session.query(Chat).filter(Chat.chat_id == chat_id, Chat.user_id == user_id).one_or_none())

    if chat is None:
        raise ValueError("Chat not found")

    session.delete(chat)
    session.commit()
    return True

# Update only the chat title
def update_chat_title(session: Session, chat_id: UUID, user_id: UUID, new_title: str) -> bool:
    chat = (
        session.query(Chat)
        .filter(Chat.chat_id == chat_id, Chat.user_id == user_id)
        .one_or_none()
    )

    if chat is None:
        raise ValueError("Chat not found")

    chat.chat_name = new_title
    session.commit()
    return True

#Give chat id return a chat object
def get_chat_by_id(session: Session, chat_id: UUID) -> Chat | None:
    return (session.query(Chat).filter(Chat.chat_id == chat_id).one_or_none())

#Give user user id, return a list of chat objects.
def get_chats_by_user_id(session: Session, user_id: UUID) -> list[Chat]:
    return (session.query(Chat).filter(Chat.user_id == user_id).order_by(Chat.created_at.desc()).all())

#Add a message to the chat.
def add_message_to_chat(session: Session,chat_id: UUID,content: str,)->Messages:
    new_message = Messages(chat_id=chat_id,content=content,sent_at=datetime.utcnow(),)
    session.add(new_message)
    session.commit()
    session.refresh(new_message)
    return new_message

#Get all the messages in a chat.
def get_messages_by_chat_id(session: Session, chat_id: UUID) -> list[Messages]:
    return (session.query(Messages).filter(Messages.chat_id == chat_id).order_by(Messages.sent_at.asc()).all())


def delete_message_from_chat(session: Session, message_id: UUID, user_id: UUID) -> bool:
    message = (session.query(Messages).filter(Messages.message_id == message_id).one_or_none())
    if message is None:
        raise ValueError("Message not found")

    session.delete(message)
    session.commit()
    return True



# Get all messages in a chat, ordered by sent_at ascending, to provide context for the next message generation.
# This will be fed to the LLM to have context of user request and improve the response quality.
# returns a dict json object so it can be serialized and sent to the LLM
def get_chat_context(session, chat_id):
    messages = (session.query(Messages).filter(Messages.chat_id == chat_id).order_by(Messages.sent_at.asc()).all())
    return [{"message_id": str(m.message_id),"chat_id": str(m.chat_id), "content": m.content,"sender_is": m.sender_is,"created_at": m.sent_at.isoformat() if m.sent_at else None,}for m in messages]

# modify chat messages.
def update_message_content(session: Session, message_id: UUID, user_id: UUID, new_content: str) -> bool:
    message = session.query(Messages).filter(Messages.message_id == message_id).one_or_none()
    if message is None:
        raise ValueError("Message not found")

    message.content = new_content
    session.commit()
    return True


# summarizes chat history for a given chat id
def summarize_chat_history(session: Session, chat_id: UUID) -> str:
    messages = (session.query(Messages).filter(Messages.chat_id == chat_id).order_by(Messages.sent_at.asc()).all())

    if not messages:
        return ""

    if more_than_8_messages(session, chat_id):
        messages = messages[:-8]

    return " ".join(message.content for message in messages)


def more_than_8_messages(session: Session, chat_id: UUID) -> bool:
    messages = (
        session.query(Messages)
        .filter(Messages.chat_id == chat_id)
        .order_by(Messages.sent_at.asc())
        .all()
    )

    count = 0
    for message in messages:
        count += 1
        if count > 8:
            return True

    return False

