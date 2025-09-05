-- Enhance log_audit_action to persist into public.audit_log with privacy-safe details
-- Date: 2025-01-21

-- Pre-req: public.audit_log table exists as defined in 20250121000001_fix_audit_log_structure.sql

CREATE OR REPLACE FUNCTION public.log_audit_action(
    p_action       VARCHAR(100) DEFAULT NULL,
    p_table_name   VARCHAR(50)  DEFAULT NULL,
    p_record_id    UUID         DEFAULT NULL,
    p_old_values   JSONB        DEFAULT NULL,
    p_new_values   JSONB        DEFAULT NULL,
    p_details      JSONB        DEFAULT NULL,
    p_ip_address   INET         DEFAULT NULL,
    p_user_agent   TEXT         DEFAULT NULL,
    -- Backward-compatible params (some callers may use these names)
    p_old_data     JSONB        DEFAULT NULL,
    p_new_data     JSONB        DEFAULT NULL,
    p_user_id      UUID         DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    audit_id      UUID;
    final_action  TEXT := COALESCE(p_action, 'UNKNOWN_ACTION');
    final_table   TEXT := COALESCE(p_table_name, 'unknown_table');
    final_old     JSONB := COALESCE(p_old_values, p_old_data);
    final_new     JSONB := COALESCE(p_new_values, p_new_data);
    final_user    UUID := COALESCE(p_user_id, auth.uid());

    masked_ip     TEXT;
    ua_short      TEXT;
    details_json  JSONB;
BEGIN
    -- Minimal, privacy-preserving IP masking
    IF p_ip_address IS NOT NULL THEN
        -- Try IPv4 mask (replace last octet), fallback to truncation for IPv6/others
        masked_ip := regexp_replace(p_ip_address::text, '^((\d+\.){2})\d+\.(\d+)$', '\1***.0');
        IF masked_ip = p_ip_address::text THEN
            masked_ip := substring(p_ip_address::text from 1 for 12) || '…';
        END IF;
    ELSE
        masked_ip := NULL;
    END IF;

    -- Truncate User-Agent to avoid storing excessive data
    ua_short := CASE WHEN p_user_agent IS NULL THEN NULL ELSE substring(p_user_agent from 1 for 160) END;

    -- Compose details JSON, merging provided details with metadata and optional old/new snapshots
    details_json := COALESCE(p_details, '{}'::jsonb)
        || jsonb_build_object(
            'ip', masked_ip,
            'user_agent', ua_short
        );

    IF final_old IS NOT NULL THEN
        details_json := details_json || jsonb_build_object('old_data', final_old);
    END IF;
    IF final_new IS NOT NULL THEN
        details_json := details_json || jsonb_build_object('new_data', final_new);
    END IF;

    details_json := jsonb_strip_nulls(details_json);

    BEGIN
        INSERT INTO public.audit_log (
            event_type,
            table_name,
            record_id,
            user_id,
            details,
            created_at
        ) VALUES (
            final_action,
            final_table,
            p_record_id,
            final_user,
            details_json,
            now()
        ) RETURNING id INTO audit_id;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback to NOTICE to avoid breaking callers
        RAISE NOTICE 'AUDIT (fallback): % on % (record=%) from % - details: %',
            final_action, final_table, p_record_id, masked_ip, details_json;
        audit_id := gen_random_uuid();
    END;

    RETURN audit_id;
END;
$$;

COMMENT ON FUNCTION public.log_audit_action IS 'Unified audit function writing to public.audit_log with masked IP and truncated User-Agent. Accepts old_values/new_values or old_data/new_data.';

GRANT EXECUTE ON FUNCTION public.log_audit_action TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_action TO anon;
GRANT EXECUTE ON FUNCTION public.log_audit_action TO service_role;

-- Log this migration (best-effort)
INSERT INTO public.audit_log (
    event_type,
    table_name,
    details,
    created_at
) VALUES (
    'MIGRATION',
    'audit_log',
    jsonb_build_object(
        'migration', '20250121000003_enhance_log_audit_action',
        'description', 'log_audit_action now persists into audit_log with privacy-safe details (IP masked, UA truncated).'
    ),
    now()
);