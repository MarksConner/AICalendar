import pytest
from uuid import uuid4

from sqlalchemy.exc import IntegrityError

from app.db import SessionLocal
from app.models.users import Users
from app.models.chat import Chat
from app.models.messages import Messages
from app.services.chat_service import (
    add_message_to_chat,
    create_chat_record,
    delete_chat,
    delete_message_from_chat,
    get_chat_by_id,
    get_chats_by_user_id,
    get_chat_context,
    get_messages_by_chat_id,
    more_than_8_messages,
    summarize_chat_history,
    update_chat_title,
    update_message_content,
)


def cleanup_chat(session, chat_id):
    existing = get_chat_by_id(session, chat_id)
    if existing is not None:
        session.query(Messages).filter(Messages.chat_id == chat_id).delete(
            synchronize_session=False
        )
        session.delete(existing)
        session.commit()


@pytest.fixture
def session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def user(session):
    uid = uuid4()
    user = Users(
        user_id=uid,
        email=f"{uid}@test.com",
        username=f"user_{uid.hex[:8]}",
        first_name="Test",
        last_name="User",
        password_hash="fake_hash",
        email_verified=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    yield user

    session.rollback()

    chat_ids = [
        row[0]
        for row in session.query(Chat.chat_id).filter(Chat.user_id == user.user_id).all()
    ]

    if chat_ids:
        session.query(Messages).filter(Messages.chat_id.in_(chat_ids)).delete(
            synchronize_session=False
        )

    session.query(Chat).filter(Chat.user_id == user.user_id).delete(
        synchronize_session=False
    )

    existing_user = (
        session.query(Users).filter(Users.user_id == user.user_id).one_or_none()
    )
    if existing_user is not None:
        session.delete(existing_user)

    session.commit()


@pytest.fixture
def chat(session, user):
    content = "Hello, this is a test message. This should create a new chat."
    chat = create_chat_record(session, user.user_id, content)
    yield chat
    cleanup_chat(session, chat.chat_id)


def test_create_chat_record(session, user):
    content = "Hello, this is a test message. This should create a new chat."
    chat = create_chat_record(session, user.user_id, content)

    try:
        assert chat is not None
        assert chat.chat_name == "Hello, this is a test message"
        assert chat.user_id == user.user_id

        messages = get_messages_by_chat_id(session, chat.chat_id)
        assert len(messages) >= 1
        assert any(m.content == content for m in messages)
    finally:
        cleanup_chat(session, chat.chat_id)


def test_get_chat_by_id(session, chat):
    retrieved_chat = get_chat_by_id(session, chat.chat_id)

    assert retrieved_chat is not None
    assert retrieved_chat.chat_id == chat.chat_id


def test_get_chats_by_user_id(session, user):
    chat1 = create_chat_record(session, user.user_id, "First test message for get_chats_by_user_id.")
    chat2 = create_chat_record(session, user.user_id, "Second test message for get_chats_by_user_id.")

    try:
        chats = get_chats_by_user_id(session, user.user_id)

        assert len(chats) >= 2
        assert any(c.chat_id == chat1.chat_id for c in chats)
        assert any(c.chat_id == chat2.chat_id for c in chats)
    finally:
        cleanup_chat(session, chat1.chat_id)
        cleanup_chat(session, chat2.chat_id)


def test_update_chat_title(session, user):
    chat = create_chat_record(session, user.user_id, "Hello, this is a test message for update_chat_title.")

    try:
        new_title = "Updated Chat Title"
        result = update_chat_title(session, chat.chat_id, user.user_id, new_title)

        assert result is True

        updated_chat = get_chat_by_id(session, chat.chat_id)
        assert updated_chat is not None
        assert updated_chat.chat_name == new_title
    finally:
        cleanup_chat(session, chat.chat_id)


def test_delete_chat(session, user):
    chat = create_chat_record(session, user.user_id, "Hello, this is a test message for delete_chat.")

    # Current service does not delete child messages first, so remove them here.
    session.query(Messages).filter(Messages.chat_id == chat.chat_id).delete(
        synchronize_session=False
    )
    session.commit()

    result = delete_chat(session, chat.chat_id, user.user_id)

    assert result is True
    assert get_chat_by_id(session, chat.chat_id) is None


def test_delete_chat_not_found(session):
    with pytest.raises(ValueError, match="Chat not found"):
        delete_chat(session, uuid4(), uuid4())


def test_update_chat_title_not_found(session):
    with pytest.raises(ValueError, match="Chat not found"):
        update_chat_title(session, uuid4(), uuid4(), "New Title")


def test_get_chat_by_id_not_found(session):
    assert get_chat_by_id(session, uuid4()) is None


def test_get_chats_by_user_id_no_chats(session, user):
    chats = get_chats_by_user_id(session, user.user_id)

    assert isinstance(chats, list)
    assert len(chats) == 0


def test_add_message_to_chat(session, user):
    chat = create_chat_record(session, user.user_id, "Hello, this is a test message for add_message_to_chat.")

    try:
        message_content = "This is a new message being added to the chat."
        message = add_message_to_chat(session, chat.chat_id, message_content)

        assert message is not None
        assert message.content == message_content
        assert message.chat_id == chat.chat_id
    finally:
        cleanup_chat(session, chat.chat_id)


def test_add_message_to_chat_invalid_chat(session):
    with pytest.raises(IntegrityError):
        add_message_to_chat(
            session,
            uuid4(),
            "This message should not be added to a non-existent chat.",
        )
    session.rollback()


def test_add_message_to_chat_empty_content(session, user):
    chat = create_chat_record(session, user.user_id, "Hello, this is a test message for empty content.")

    try:
        # Current service allows empty content.
        message = add_message_to_chat(session, chat.chat_id, "")
        assert message is not None
        assert message.content == ""
        assert message.chat_id == chat.chat_id
    finally:
        cleanup_chat(session, chat.chat_id)


def test_add_message_to_chat_long_content(session, user):
    chat = create_chat_record(session, user.user_id, "Hello, this is a test message for long content.")

    try:
        long_message_content = "A" * 10000
        message = add_message_to_chat(session, chat.chat_id, long_message_content)

        assert message is not None
        assert message.content == long_message_content
        assert message.chat_id == chat.chat_id
    finally:
        cleanup_chat(session, chat.chat_id)


def test_get_messages_by_chat_id(session, user):
    chat = create_chat_record(session, user.user_id, "Initial message.")

    try:
        msg1 = add_message_to_chat(session, chat.chat_id, "Message one.")
        msg2 = add_message_to_chat(session, chat.chat_id, "Message two.")

        messages = get_messages_by_chat_id(session, chat.chat_id)

        assert len(messages) >= 3
        assert any(m.message_id == msg1.message_id for m in messages)
        assert any(m.message_id == msg2.message_id for m in messages)
    finally:
        cleanup_chat(session, chat.chat_id)


def test_delete_message_from_chat(session, user):
    chat = create_chat_record(session, user.user_id, "Initial message.")

    try:
        message = add_message_to_chat(session, chat.chat_id, "Delete this message.")
        result = delete_message_from_chat(session, message.message_id, uuid4())

        assert result is True

        remaining = get_messages_by_chat_id(session, chat.chat_id)
        assert all(m.message_id != message.message_id for m in remaining)
    finally:
        cleanup_chat(session, chat.chat_id)


def test_delete_message_from_chat_not_found(session):
    with pytest.raises(ValueError, match="Message not found"):
        delete_message_from_chat(session, uuid4(), uuid4())


def test_update_message_content(session, user):
    chat = create_chat_record(session, user.user_id, "Initial message.")

    try:
        message = add_message_to_chat(session, chat.chat_id, "Old content.")
        result = update_message_content(session, message.message_id, uuid4(), "New content.")

        assert result is True

        messages = get_messages_by_chat_id(session, chat.chat_id)
        updated = next((m for m in messages if m.message_id == message.message_id), None)

        assert updated is not None
        assert updated.content == "New content."
    finally:
        cleanup_chat(session, chat.chat_id)


def test_update_message_content_not_found(session):
    with pytest.raises(ValueError, match="Message not found"):
        update_message_content(session, uuid4(), uuid4(), "New content.")


def test_get_chat_context(session, user):
    chat = create_chat_record(session, user.user_id, "Hello, this is a test message for get_chat_context.")

    try:
        message1 = add_message_to_chat(session, chat.chat_id, "First message in context.")
        message2 = add_message_to_chat(session, chat.chat_id, "Second message in context.")

        context_messages = get_chat_context(session, chat.chat_id)

        assert len(context_messages) >= 3
        assert any(m.message_id == message1.message_id for m in context_messages)
        assert any(m.message_id == message2.message_id for m in context_messages)
    finally:
        cleanup_chat(session, chat.chat_id)


def test_more_than_8_messages_false(session, user):
    chat = create_chat_record(session, user.user_id, "m0")

    try:
        for i in range(1, 8):
            add_message_to_chat(session, chat.chat_id, f"m{i}")

        assert more_than_8_messages(session, chat.chat_id) is False
    finally:
        cleanup_chat(session, chat.chat_id)


def test_more_than_8_messages_true(session, user):
    chat = create_chat_record(session, user.user_id, "m0")

    try:
        for i in range(1, 9):
            add_message_to_chat(session, chat.chat_id, f"m{i}")

        assert more_than_8_messages(session, chat.chat_id) is True
    finally:
        cleanup_chat(session, chat.chat_id)


def test_summarize_chat_history_under_or_equal_8(session, user):
    chat = create_chat_record(session, user.user_id, "m0")

    try:
        add_message_to_chat(session, chat.chat_id, "m1")
        add_message_to_chat(session, chat.chat_id, "m2")

        summary = summarize_chat_history(session, chat.chat_id)

        assert isinstance(summary, str)
        assert "m0" in summary
        assert "m1" in summary
        assert "m2" in summary
    finally:
        cleanup_chat(session, chat.chat_id)


def test_summarize_chat_history_more_than_8(session, user):
    chat = create_chat_record(session, user.user_id, "m0")

    try:
        for i in range(1, 10):
            add_message_to_chat(session, chat.chat_id, f"m{i}")

        summary = summarize_chat_history(session, chat.chat_id)

        assert isinstance(summary, str)
        assert "m0" in summary
        assert "m1" in summary
        assert "m2" not in summary
        assert "m9" not in summary
    finally:
        cleanup_chat(session, chat.chat_id)