const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9 ]{7,20}$/;
const MIN_PASSWORD_LENGTH = 8;

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegistrationInput extends LoginInput {
  name: string;
  phone: string;
  hasConsent: boolean;
}

/** Devuelve el primer error en español, o null si los datos son válidos. */
export function validateLogin({ email, password }: LoginInput): string | null {
  if (!EMAIL_PATTERN.test(email.trim())) return 'Escribe un correo válido.';
  if (password.length === 0) return 'Escribe tu contraseña.';
  return null;
}

export function validateRegistration(input: RegistrationInput): string | null {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) return 'Escribe tu nombre (mínimo 2 letras).';
  if (!EMAIL_PATTERN.test(input.email.trim())) return 'Escribe un correo válido.';
  const phone = input.phone.trim();
  if (phone.length > 0 && !PHONE_PATTERN.test(phone)) return 'El teléfono solo puede tener números y espacios.';
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!input.hasConsent) return 'Debes autorizar el tratamiento de tus datos para crear la cuenta.';
  return null;
}

const AUTH_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos.',
  'Email not confirmed': 'Confirma tu correo antes de iniciar sesión.',
  'User already registered': 'Ya existe una cuenta con ese correo.',
};

export function toFriendlyAuthError(message: string): string {
  return AUTH_ERRORS[message] ?? message;
}
