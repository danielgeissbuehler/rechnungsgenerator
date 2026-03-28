// ── Supabase Configuration ──────────────────────────────────────────────────
// 1. Erstelle ein Supabase-Projekt unter https://supabase.com
// 2. Führe im SQL-Editor aus:
//
//    CREATE TABLE vorlagen (
//      id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//      name       TEXT UNIQUE NOT NULL,
//      data       JSONB NOT NULL,
//      created_at TIMESTAMPTZ DEFAULT NOW()
//    );
//    ALTER TABLE vorlagen ENABLE ROW LEVEL SECURITY;
//    CREATE POLICY "public_access" ON vorlagen FOR ALL USING (true) WITH CHECK (true);
//
// 3. Ersetze die Werte unten mit deinen Projekt-Credentials
//    (Settings → API → Project URL / anon public key)
// ──────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      ?? 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'YOUR_SUPABASE_ANON_KEY';

let supabase = null;

export function isConfigured() {
  return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

function getClient() {
  if (supabase) return supabase;
  if (!isConfigured()) return null;
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabase;
}

export async function fetchCloudTemplates() {
  const client = getClient();
  if (!client) return {};
  const { data, error } = await client
    .from('vorlagen')
    .select('name, data, created_at')
    .order('name');
  if (error) { console.error('Supabase fetch:', error.message); return {}; }
  return Object.fromEntries(data.map(r => [r.name, { ...r.data, _created_at: r.created_at }]));
}

export async function fetchCloudTemplateRows() {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client
    .from('vorlagen')
    .select('id, name, created_at')
    .order('name');
  if (error) { console.error('fetchCloudTemplateRows:', error.message); return []; }
  return data;
}

export async function saveCloudTemplate(name, templateState) {
  const client = getClient();
  if (!client) return false;
  const { data: { user } } = await client.auth.getUser();
  const { error } = await client
    .from('vorlagen')
    .upsert({ name, data: templateState, user_id: user.id }, { onConflict: 'name' });
  if (error) { console.error('Supabase save:', error.message); return false; }
  return true;
}

export async function deleteCloudTemplate(name) {
  const client = getClient();
  if (!client) return false;
  const { error } = await client.from('vorlagen').delete().eq('name', name);
  if (error) { console.error('Supabase delete:', error.message); return false; }
  return true;
}

export async function getSession() {
  const client = getClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session;
}

export async function signIn(email, password) {
  const client = getClient();
  if (!client) return { error: 'Supabase not configured' };
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { session: data.session };
}

export async function signOut() {
  const client = getClient();
  if (!client) return;
  await client.auth.signOut();
}

// ── Absender CRUD ────────────────────────────────────────────────────────────
export async function fetchAbsender() {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client
    .from('absender')
    .select('*')
    .order('name');
  if (error) { console.error('fetchAbsender:', error.message); return []; }
  return data;
}

export async function saveAbsenderRecord(record) {
  const client = getClient();
  if (!client) return { ok: false };
  if (record.id) {
    const { id, ...fields } = record;
    const { error } = await client.from('absender').update(fields).eq('id', id);
    if (error) { console.error('saveAbsender (update):', error.message); return { ok: false, duplicate: error.code === '23505' }; }
  } else {
    const { data: { user } } = await client.auth.getUser();
    const { error } = await client.from('absender').insert({ ...record, user_id: user.id });
    if (error) { console.error('saveAbsender (insert):', error.message); return { ok: false, duplicate: error.code === '23505' }; }
  }
  return { ok: true };
}

export async function deleteAbsenderRecord(id) {
  const client = getClient();
  if (!client) return false;
  const { error } = await client.from('absender').delete().eq('id', id);
  if (error) { console.error('deleteAbsender:', error.message); return false; }
  return true;
}

// ── Empfänger CRUD ───────────────────────────────────────────────────────────
export async function fetchEmpfaenger() {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client
    .from('empfaenger')
    .select('*')
    .order('name');
  if (error) { console.error('fetchEmpfaenger:', error.message); return []; }
  return data;
}

export async function saveEmpfaengerRecord(record) {
  const client = getClient();
  if (!client) return { ok: false };
  if (record.id) {
    const { id, ...fields } = record;
    const { error } = await client.from('empfaenger').update(fields).eq('id', id);
    if (error) { console.error('saveEmpfaenger (update):', error.message); return { ok: false, duplicate: error.code === '23505' }; }
  } else {
    const { data: { user } } = await client.auth.getUser();
    const { error } = await client.from('empfaenger').insert({ ...record, user_id: user.id });
    if (error) { console.error('saveEmpfaenger (insert):', error.message); return { ok: false, duplicate: error.code === '23505' }; }
  }
  return { ok: true };
}

export async function deleteEmpfaengerRecord(id) {
  const client = getClient();
  if (!client) return false;
  const { error } = await client.from('empfaenger').delete().eq('id', id);
  if (error) { console.error('deleteEmpfaenger:', error.message); return false; }
  return true;
}

// ── Rechnungsarchiv ──────────────────────────────────────────────────────────
export async function getNextInvoiceNumber(absenderName) {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.rpc('naechste_rechnungsnummer', { p_absender: absenderName });
  if (error) { console.error('getNextInvoiceNumber:', error.message); return null; }
  return data;
}

export async function saveRechnung(record) {
  const client = getClient();
  if (!client) return null;
  // If converting a draft (record.id provided), update the existing row
  if (record.id) {
    const { id, ...fields } = record;
    const { data, error } = await client
      .from('rechnungen')
      .update({ ...fields, status: 'offen' })
      .eq('id', id)
      .select('id')
      .single();
    if (error) { console.error('saveRechnung (update):', error.message); return null; }
    return data.id;
  }
  const { data: { user } } = await client.auth.getUser();
  const { data, error } = await client
    .from('rechnungen')
    .insert({ ...record, status: 'offen', user_id: user.id })
    .select('id')
    .single();
  if (error) { console.error('saveRechnung:', error.message); return null; }
  return data.id;
}

export async function fetchRechnungen() {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client
    .from('rechnungen')
    .select('id, nummer, absender_name, empfaenger_name, betrag, waehrung, status, created_at')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchRechnungen:', error.message); return []; }
  return data;
}

export async function fetchRechnungById(id) {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client
    .from('rechnungen')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('fetchRechnungById:', error.message); return null; }
  return data;
}

export async function deleteRechnung(id) {
  const client = getClient();
  if (!client) return false;
  const { error } = await client.from('rechnungen').delete().eq('id', id);
  if (error) { console.error('deleteRechnung:', error.message); return false; }
  return true;
}

// ── Entwürfe & Status ─────────────────────────────────────────────────────────

/**
 * Saves or updates a draft invoice.
 * Record shape: { id?, absender_name, empfaenger_name, betrag, waehrung, daten }
 * Always sets status = 'entwurf' and nummer = null.
 * Returns the UUID of the saved draft, or null on error.
 */
export async function saveEntwurf(record) {
  const client = getClient();
  if (!client) return null;
  try {
    const user_id = (await client.auth.getUser()).data.user?.id;
    const payload = {
      ...record,
      user_id,
      status: 'entwurf',
      nummer: null,
    };
    if (record.id) {
      // Upsert: aktualisiert wenn vorhanden, legt neu an falls zwischenzeitlich gelöscht
      const { data, error } = await client
        .from('rechnungen')
        .upsert(payload, { onConflict: 'id' })
        .select('id')
        .single();
      if (error) { console.error('saveEntwurf (upsert):', error.message); return null; }
      return data.id;
    }
    // Insert new draft
    const { data, error } = await client
      .from('rechnungen')
      .insert(payload)
      .select('id')
      .single();
    if (error) { console.error('saveEntwurf (insert):', error.message); return null; }
    return data.id;
  } catch (err) {
    console.error('saveEntwurf:', err.message);
    return null;
  }
}

/**
 * Updates only the status column for a given invoice UUID.
 * Valid values: 'entwurf' | 'offen' | 'versendet' | 'bezahlt' | 'storniert'
 * Returns true on success, false on error.
 */
export async function updateRechnungStatus(id, status) {
  const client = getClient();
  if (!client) return false;
  try {
    const { error } = await client
      .from('rechnungen')
      .update({ status })
      .eq('id', id);
    if (error) { console.error('updateRechnungStatus:', error.message); return false; }
    return true;
  } catch (err) {
    console.error('updateRechnungStatus:', err.message);
    return false;
  }
}
