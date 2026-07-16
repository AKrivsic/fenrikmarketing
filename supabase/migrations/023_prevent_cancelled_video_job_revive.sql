-- Prevent late Video Worker "completed" callbacks from reviving jobs that the
-- operator already cancelled (status=failed, error_message='Zastaveno operátorem.').
-- Application code also guards this; the trigger is defense-in-depth for workers
-- that have not yet been redeployed with cooperative cancellation.

CREATE OR REPLACE FUNCTION public.prevent_operator_cancel_video_job_revive()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'failed'
     AND OLD.error_message = 'Zastaveno operátorem.'
     AND NEW.status = 'completed' THEN
    NEW.status := OLD.status;
    NEW.error_message := OLD.error_message;
    NEW.completed_at := OLD.completed_at;
    NEW.output := OLD.output;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_operator_cancel_video_job_revive ON public.video_jobs;
CREATE TRIGGER trg_prevent_operator_cancel_video_job_revive
BEFORE UPDATE ON public.video_jobs
FOR EACH ROW
EXECUTE FUNCTION public.prevent_operator_cancel_video_job_revive();
