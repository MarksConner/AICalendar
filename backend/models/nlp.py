def extract_intent(user_message):
    # TEMPORARY RULES, replace with LLM model later
    if "schedule" in user_message.lower() or "add" in user_message.lower():
        return "add_event"
    if "remove" in user_message.lower() or "cancel" in user_message.lower():
        return "remove_event"
    if "traffic" in user_message.lower():
        return "traffic_info"
    return "chat"
