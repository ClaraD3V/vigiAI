"use strict";

const { createClient } = require("@supabase/supabase-js");
const config = require("../config");

let client = null;

function isConfigured() {
  return Boolean(config.supabase.url && config.supabase.serviceRoleKey);
}

/**
 * Client server-side (service role) — nunca deve ser usado/exposto no front.
 * `null` quando não configurado; os chamadores tratam isso como "sem banco".
 */
function getClient() {
  if (!isConfigured()) return null;
  if (!client) client = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  return client;
}

module.exports = { getClient, isConfigured };
