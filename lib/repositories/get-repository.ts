import type { Repository } from "./types";
import { createLocalRepository } from "./local-repository";
import { createSupabaseRepository } from "./supabase-repository";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * The single switch point for the entire data layer. Every entity
 * service calls this once. If Supabase env vars are present, every
 * service is automatically backed by real Postgres tables — otherwise
 * everything falls back to the local mock store. No other file needs
 * to change when you connect Supabase.
 */
let warnedAboutMissingSupabaseInProduction = false;

function warnIfMisconfiguredForProduction(table: string) {
  // Vercel sets this env var in every build and runtime environment,
  // build or serverless. The local file-store writes to disk relative
  // to process.cwd(), which works for a local dev server but does NOT
  // reliably persist across serverless invocations — so without
  // Supabase configured, Admin writes on Vercel would appear to
  // succeed per-request and then silently vanish. This warning surfaces
  // that loudly in Vercel's function logs instead of failing silently.
  if (warnedAboutMissingSupabaseInProduction) return;
  if (process.env.VERCEL) {
    console.warn(
      `[nexora] Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL / ` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY) — "${table}" and every other module is falling back ` +
        `to local file storage, which does not persist reliably on Vercel. Set both env vars ` +
        `in your Vercel project settings; see supabase/migrations for schema setup.`
    );
    warnedAboutMissingSupabaseInProduction = true;
  }
}

export function getRepository<T extends { id: string }>(
  table: string,
  storageKey: string,
  seed: T[]
): Repository<T> {
  const client = getSupabaseClient();
  if (client) {
    return createSupabaseRepository<T>(client, table);
  }
  warnIfMisconfiguredForProduction(table);
  return createLocalRepository<T>(storageKey, seed);
}
