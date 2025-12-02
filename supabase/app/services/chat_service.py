from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.chat import Chat
from app.models.messages import Messages


#Create a chat for a given user
def create_chat(session: Session, chat_name: str, user_id: UUID) -> Chat:
    new_chat = Chat(chat_name=chat_name, user_id=user_id)
    session.add(new_chat)
    session.commit()
    session.refresh(new_chat)
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
def add_message_to_chat(session: Session,chat_id: UUID,sender_id: UUID,content: str,)->Messages:
    new_message = Messages(chat_id=chat_id, sender_id=sender_id,content=content,sent_at=datetime.utcnow(),)
    session.add(new_message)
    session.commit()
    session.refresh(new_message)
    return new_message

#Get all the messages in a chat.
def get_messages_by_chat_id(session: Session, chat_id: UUID) -> list[Messages]:
    return (session.query(Messages).filter(Messages.chat_id == chat_id).order_by(Messages.sent_at.asc()).all())


def delete_message_from_chat(session: Session, message_id: UUID, user_id: UUID) -> bool:
    message = (session.query(Messages).filter(Messages.message_id == message_id, Messages.sender_id == user_id).one_or_none())
    if message is None:
        raise ValueError("Message not found")

    session.delete(message)
    session.commit()
    return True