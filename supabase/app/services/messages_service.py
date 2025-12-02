from datetime import datetime
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.chat import Chat
from app.models.messages import Messages


def create_message(session: Session,chat_id: UUID,sender_id: UUID,content: str,) -> Messages:
    new_message = Messages(
        chat_id=chat_id,
        sender_id=sender_id,
        content=content,
    )
    session.add(new_message)
    session.commit()
    session.refresh(new_message)
    return new_message

#Give message id, retruns a single message if found.
def get_message_by_id(session: Session, message_id: UUID) -> Messages|None:
    return (session.query(Messages).filter(Messages.message_id == message_id).one_or_none())


#Give chat_id, returns all the messages in a chat (olders messages first).
def get_messages_by_chat_id(session: Session,chat_id: UUID,) -> list[Messages]:
    return (session.query(Messages).filter(Messages.chat_id == chat_id).order_by(Messages.sent_at.asc()))


def update_message_content(session: Session,message_id: UUID,user_id: UUID,new_content: str,) -> bool:

    message = (session.query(Messages).filter(Messages.message_id == message_id,Messages.sender_id == user_id).one_or_none())
    if message is None:
        raise ValueError("Message not found")

    message.content = new_content
    session.commit()
    return True
