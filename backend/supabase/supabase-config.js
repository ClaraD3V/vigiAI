(function () {
  "use strict";

  const settings = globalThis.VIGIAI_SUPABASE || {};
  const url = settings.url || "";
  const anonKey = settings.anonKey || "";

  globalThis.vigiAISupabase = {
    configured: Boolean(url && anonKey),
    client: url && anonKey && globalThis.supabase
      ? globalThis.supabase.createClient(url, anonKey)
      : null
  };
}());
