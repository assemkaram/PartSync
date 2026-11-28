

DO $$
DECLARE
    project_url text := current_setting('app.settings.supabase_url', true);
    secret_key text := current_setting('app.settings.supabase_secret_key', true);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
       OR NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        RAISE EXCEPTION '017 requires pg_cron and pg_net. Enable both extensions, then retry the migration.';
    END IF;

    IF COALESCE(project_url, '') = '' OR COALESCE(secret_key, '') = '' THEN
        RAISE EXCEPTION '017 requires app.settings.supabase_url and app.settings.supabase_secret_key. Set both protected database settings, then retry the migration.';
    END IF;

    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'retailer-sync-daily') THEN
        PERFORM cron.unschedule('retailer-sync-daily');
    END IF;

    PERFORM cron.schedule(
        'retailer-sync-daily',
        '0 1 * * *',
        $job$
        SELECT net.http_post(
            url := current_setting('app.settings.supabase_url', true) || '/functions/v1/retailer-sync',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'apikey', current_setting('app.settings.supabase_secret_key', true)
            ),
            body := '{"mode":"all"}'::jsonb,
            timeout_milliseconds := 300000
        );
        $job$
    );

    RAISE NOTICE '017: retailer-sync-daily now authenticates with the Supabase Secret API key.';
END
$$;
