/**
 * Canonical user shape — mirrors the backend `Users` SQLAlchemy model exactly.
 * snake_case field names match the DB column names and JSON response keys.
 */
export interface User {
  user_id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  // Optional — only present on some responses (e.g. profile fetch, post-login payload)
  created_at?: string;
  email_verified?: boolean;
}
