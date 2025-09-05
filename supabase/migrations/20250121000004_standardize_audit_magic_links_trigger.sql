-- Standardize audit trigger for magic_links to use unified audit_trigger_function
BEGIN;

-- Ensure only one canonical trigger exists
DROP TRIGGER IF EXISTS audit_magic_links_trigger ON public.magic_links;

-- Recreate trigger pointing to the central audit trigger function
CREATE TRIGGER audit_magic_links_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.magic_links
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Documentation
COMMENT ON TRIGGER audit_magic_links_trigger ON public.magic_links IS 
  'Security Trigger: Logs all authentication link operations via unified audit_trigger_function.';

COMMIT;