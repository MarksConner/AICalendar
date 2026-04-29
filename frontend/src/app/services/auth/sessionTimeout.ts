const SESSION_TIMEOUT_MESSAGE_KEY = "session_timeout_message";
const SESSION_TIMEOUT_MESSAGE = "Session timed out";

export function storeSessionTimeoutMessage() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_TIMEOUT_MESSAGE_KEY, SESSION_TIMEOUT_MESSAGE);
}

export function consumeSessionTimeoutMessage(): string | null {
  if (typeof window === "undefined") return null;
  const message = window.sessionStorage.getItem(SESSION_TIMEOUT_MESSAGE_KEY);
  if (!message) return null;
  window.sessionStorage.removeItem(SESSION_TIMEOUT_MESSAGE_KEY);
  return message;
}

export function clearAuthStorage() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem("access_token");
  window.localStorage.removeItem("authToken");
  window.localStorage.removeItem("refresh_token");
  window.localStorage.removeItem("user_id");
  window.localStorage.removeItem("token_type");
  window.localStorage.removeItem("calendar_id");
  window.localStorage.removeItem("chat_id");
  window.localStorage.removeItem("chat_messages");
}

export function handleSessionTimeout() {
  if (typeof window === "undefined") return;

  clearAuthStorage();
  storeSessionTimeoutMessage();
  window.location.href = "/login";
}
