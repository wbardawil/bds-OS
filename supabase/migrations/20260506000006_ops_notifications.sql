-- BDS OS: Ops notifications via Slack/Discord webhook
--
-- Fires a webhook POST when critical events happen, so the operator
-- (you, on phone) gets notified without polling Sentry / Supabase logs.
--
-- Triggers:
--   - alerts.severity = 'critical' insert
--   - score_change_requests.status changes to 'pending' (CEO needs to approve)
--   - feedback insert (beta customer left feedback)
--
-- Implementation: pg_net extension (HTTP from Postgres). Webhook URL stored
-- in vault.secrets as 'ops_webhook_url'.

-- ============================================================================
-- Extension: pg_net for HTTP from triggers
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================================================
-- Helper function: post to ops webhook (Slack or Discord-compatible JSON)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_ops_webhook(_text text)
RETURNS void AS $$
DECLARE
  _url text;
BEGIN
  -- Webhook URL stored as a Supabase Vault secret. Set it via:
  --   SELECT vault.create_secret('https://hooks.slack.com/services/...', 'ops_webhook_url');
  -- (Or via the Supabase dashboard → Vault → New secret.)
  SELECT decrypted_secret INTO _url
  FROM vault.decrypted_secrets
  WHERE name = 'ops_webhook_url'
  LIMIT 1;

  IF _url IS NULL THEN
    RAISE NOTICE 'ops_webhook_url not configured in vault; skipping webhook post.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('text', _text)
  );
EXCEPTION WHEN OTHERS THEN
  -- Never let webhook failures block the underlying transaction.
  RAISE NOTICE 'notify_ops_webhook failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Trigger: critical alerts
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_critical_alert()
RETURNS TRIGGER AS $$
DECLARE
  _company_name text;
BEGIN
  IF NEW.severity = 'critical' AND NEW.status = 'open' THEN
    SELECT name INTO _company_name FROM companies WHERE id = NEW.company_id;
    PERFORM notify_ops_webhook(
      format(':rotating_light: CRITICAL alert at %s: %s — %s',
             COALESCE(_company_name, NEW.company_id::text),
             NEW.title,
             COALESCE(NEW.detail, '(no detail)')
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER alerts_notify_critical
  AFTER INSERT ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_critical_alert();

-- ============================================================================
-- Trigger: feedback submissions
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_new_feedback()
RETURNS TRIGGER AS $$
DECLARE
  _company_name text;
BEGIN
  SELECT name INTO _company_name FROM companies WHERE id = NEW.company_id;
  PERFORM notify_ops_webhook(
    format(':speech_balloon: Beta feedback from %s on %s: %s',
           COALESCE(_company_name, 'unknown company'),
           COALESCE(NEW.screen, 'unknown screen'),
           CASE WHEN length(NEW.content) > 200 THEN substr(NEW.content, 1, 200) || '...' ELSE NEW.content END
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER feedback_notify
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_feedback();

-- ============================================================================
-- Trigger: score change requests entering 'pending' (CEO needs to approve)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_pending_score_change()
RETURNS TRIGGER AS $$
DECLARE
  _company_name text;
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM NEW.status)) THEN
    SELECT name INTO _company_name FROM companies WHERE id = NEW.organization_id;
    PERFORM notify_ops_webhook(
      format(':white_check_mark: Score change pending approval at %s for practice %s (current %s → proposed %s)',
             COALESCE(_company_name, NEW.organization_id::text),
             NEW.practice_id::text,
             NEW.current_level,
             NEW.proposed_level
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- score_change_requests is already created in earlier migration (20260221000005)
-- so we just attach the trigger.
CREATE TRIGGER score_change_requests_notify_pending
  AFTER INSERT OR UPDATE OF status ON score_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_pending_score_change();

-- ============================================================================
-- Setup instructions (operator runs once after applying this migration):
-- ============================================================================
-- 1. In Supabase dashboard → Settings → Vault → New secret:
--    name: ops_webhook_url
--    value: https://hooks.slack.com/services/T.../B.../xxx
--           (or https://discord.com/api/webhooks/.../...)
--
-- 2. Verify by inserting a test feedback row:
--    INSERT INTO feedback (company_id, content, screen)
--    VALUES (
--      (SELECT id FROM companies LIMIT 1),
--      'Test ops webhook from migration',
--      '/admin/test'
--    );
--
-- 3. You should see the message in your ops channel within a few seconds.
