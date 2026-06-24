// HB Bank — authentication helpers built on Supabase Auth.
import { supabase, isConfigured } from "./supabase.js";

export { supabase, isConfigured };

// Sign up. full_name / phone / preferred_language are passed as user metadata and
// consumed by the handle_new_user() trigger, which seeds the profile + accounts.
export async function signUp({ email, password, fullName, phone, lang }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || "",
        phone: phone || "",
        preferred_language: lang || "en",
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// Guard a protected page: bounce to login if there is no session.
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.replace("login.html");
    return null;
  }
  return session;
}

// For the login page: if already signed in, go straight to the dashboard.
export async function redirectIfAuthed() {
  const session = await getSession();
  if (session) window.location.replace("dashboard.html");
}
