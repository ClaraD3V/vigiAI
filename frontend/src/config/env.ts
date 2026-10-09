export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "https://seu-projeto.supabase.co",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJ...",
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3001",
} as const;
