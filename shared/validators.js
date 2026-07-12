/**
 * Pure input-validation rules shared by the frontend forms (for immediate
 * inline feedback) and the backend routes (the actual enforcement — a
 * client-side check alone is never trusted, since the API is a public HTTP
 * endpoint that can be hit directly).
 */

const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]{1,59}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_.]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+91[\s-]?\d{5}[\s-]?\d{5}$/;

export function isValidName(value) {
  return typeof value === "string" && NAME_PATTERN.test(value.trim());
}

export function isValidUsername(value) {
  return typeof value === "string" && USERNAME_PATTERN.test(value.trim());
}

export function isValidEmail(value) {
  return typeof value === "string" && EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value) {
  return typeof value === "string" && PHONE_PATTERN.test(value.trim());
}

/**
 * Validates a new-RM submission. Returns { valid, errors } where errors is
 * keyed by field name, so a caller can show inline per-field messages.
 * @param {{name: string, username: string, password: string, email: string, phone: string}} input
 */
export function validateRmInput({ name, username, password, email, phone }) {
  const errors = {};

  if (!name || !name.trim()) {
    errors.name = "Full name is required.";
  } else if (!isValidName(name)) {
    errors.name = "Name can only contain letters, spaces, and ' . - characters — no numbers or symbols.";
  }

  if (!username || !username.trim()) {
    errors.username = "Username is required.";
  } else if (!isValidUsername(username)) {
    errors.username = "Username must be 3-20 characters: letters, numbers, underscore, or period only.";
  }

  if (!password || password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  if (!email || !email.trim()) {
    errors.email = "Email address is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!phone || !phone.trim()) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPhone(phone)) {
    errors.phone = "Enter a valid Indian phone number, e.g. +91 98765 43210.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
