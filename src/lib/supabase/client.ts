// Supabase Client Helper with graceful offline/unconfigured fallback

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  // If libraries are installed and configured, we can instantiate Supabase
  return {
    url,
    anonKey,
    isConfigured: true,
  };
}

