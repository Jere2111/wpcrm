-- ============================================================
-- 037_ai_google_provider.sql — Add Google (Gemini) as AI provider
--
-- Extends the CHECK constraint on ai_configs.provider to accept
-- 'google' alongside the existing 'openai' and 'anthropic'. This
-- lets accounts select Google AI (Gemini) from Settings → AI
-- Assistant.
--
-- Idempotent — safe to run multiple times.
-- ============================================================

-- Drop the existing CHECK constraint and replace it with one that
-- includes 'google'. The constraint name used by the original
-- CREATE TABLE may vary (pg auto-generates it), so we look it up
-- dynamically.
DO $$
DECLARE
  _constraint_name text;
BEGIN
  SELECT conname INTO _constraint_name
  FROM pg_constraint
  WHERE conrelid = 'ai_configs'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%provider%';

  IF _constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE ai_configs DROP CONSTRAINT %I', _constraint_name);
  END IF;
END $$;

ALTER TABLE ai_configs
  ADD CONSTRAINT ai_configs_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'google'));
