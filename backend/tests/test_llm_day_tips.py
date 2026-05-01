from backend.llm_day_tips import (
    EventForSuggestion,
    SuggestionItem,
    filter_upcoming_travel_events,
    sanitize_suggestions_for_time,
)


def test_filter_upcoming_travel_events_excludes_past_events():
    events = [
        EventForSuggestion(
            event_name="Past Lunch",
            start="2026-05-01T11:00:00",
            full_address="123 Past St",
            travel_time_min=12,
        ),
        EventForSuggestion(
            event_name="Future Dinner",
            start="2026-05-01T18:00:00",
            full_address="456 Future Ave",
            travel_time_min=20,
        ),
    ]

    filtered = filter_upcoming_travel_events(
        events,
        {"user_current_minutes": 13 * 60},
    )

    assert [event.get_title() for event in filtered] == ["Future Dinner"]


def test_sanitize_travel_suggestion_removes_past_event_reference():
    events = [
        EventForSuggestion(
            event_name="Past Lunch",
            start="2026-05-01T11:00:00",
            full_address="123 Past St",
            travel_time_min=12,
        )
    ]
    suggestions = [
        SuggestionItem(
            id="1",
            title="Travel",
            description="Leave now for Past Lunch.",
            category="Travel",
            event_name="Past Lunch",
            distance_from_user="12 minutes",
        )
    ]

    sanitized = sanitize_suggestions_for_time(
        suggestions,
        events,
        {"user_current_minutes": 13 * 60},
    )

    assert sanitized[0].event_name is None
    assert sanitized[0].distance_from_user is None
    assert "No upcoming location-based travel reminders" in sanitized[0].description
