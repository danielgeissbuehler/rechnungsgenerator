-- Migration: RLS-Policies auf user_id = auth.uid() einschränken
-- Vorher: auth.uid() IS NOT NULL  →  jeder authentifizierte User sah alle Zeilen
-- Nachher: user_id = auth.uid()   →  jeder User sieht nur seine eigenen Zeilen
--
-- Ausführen im Supabase SQL-Editor (einmalig auf der Live-Datenbank).

DROP POLICY IF EXISTS "vorlagen_auth"          ON vorlagen;
DROP POLICY IF EXISTS "absender_auth"          ON absender;
DROP POLICY IF EXISTS "empfaenger_auth"        ON empfaenger;
DROP POLICY IF EXISTS "rechnungs_counter_auth" ON rechnungs_counter;
DROP POLICY IF EXISTS "rechnungen_auth"        ON rechnungen;

CREATE POLICY "vorlagen_auth"          ON vorlagen          FOR ALL USING (user_id = auth.uid());
CREATE POLICY "absender_auth"          ON absender          FOR ALL USING (user_id = auth.uid());
CREATE POLICY "empfaenger_auth"        ON empfaenger        FOR ALL USING (user_id = auth.uid());
CREATE POLICY "rechnungs_counter_auth" ON rechnungs_counter FOR ALL USING (user_id = auth.uid());
CREATE POLICY "rechnungen_auth"        ON rechnungen        FOR ALL USING (user_id = auth.uid());
