import { supabase } from '@/lib/supabase';

import { toFriendlyAuthError, type LoginInput, type RegistrationInput } from '../validation';

export async function signIn({ email, password }: LoginInput): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(toFriendlyAuthError(error.message));
}

export interface SignUpResult {
  /** true si Supabase exige confirmar el correo antes de iniciar sesión. */
  needsEmailConfirmation: boolean;
}

/** Registro de clientes. Las cuentas de personal se crean desde el POS. */
export async function signUpCustomer(input: RegistrationInput): Promise<SignUpResult> {
  const name = input.name.trim();
  const phone = input.phone.trim() || null;

  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: { data: { name, phone, consent_habeas_data: true } },
  });
  if (error) throw new Error(toFriendlyAuthError(error.message));

  if (!data.session) {
    return { needsEmailConfirmation: true };
  }

  const { error: rpcError } = await supabase.rpc('upsert_my_customer', {
    p_name: name,
    p_phone: phone,
    p_consent_habeas_data: true,
  });
  if (rpcError) throw new Error(`Tu cuenta se creó, pero no tu ficha de cliente: ${rpcError.message}`);

  return { needsEmailConfirmation: false };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(`No se pudo cerrar sesión: ${error.message}`);
}
