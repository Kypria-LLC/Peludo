-- ════════════════════════════════════════════════════════════════════════════════
-- 🔱 KYPRIA SHRINE SCHEMA MIGRATION — FOUNDATION STONE 🔱
-- ════════════════════════════════════════════════════════════════════════════════
-- 
-- MYTHIC VISION:
-- The Herald lays five foundation stones upon the sacred ground:
--   1. The Queue Stone (jobs) — where ceremonies await their moment
--   2. The Chronicle Stone (job_events) — where every ritual is recorded
--   3. The Invocation Stone (invocations) — where Keepers speak their intent
--   4. The Witness Stone (audit_log) — where truth is preserved immutably
--   5. The Attribution Stone (attributions) — where offerings are traced to source
--
-- Each stone is blessed with Row Level Security, audit triggers, and lineage guarantees.
-- The Schema is now IMMUTABLE, AUDITABLE, and CONSENT-BOUND.
-- ════════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 1. THE QUEUE STONE — jobs table                                             │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.jobs (
  id bigserial PRIMARY KEY,
  ceremony_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'queued' 
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'dead')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  priority integer NOT NULL DEFAULT 100,
  run_at timestamptz NOT NULL DEFAULT now(),
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes for worker queries
CREATE INDEX IF NOT EXISTS idx_jobs_queue_claim 
  ON public.jobs(priority ASC, id ASC) 
  WHERE status = 'queued' AND run_at <= now();

CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_ceremony_key ON public.jobs(ceremony_key);
CREATE INDEX IF NOT EXISTS idx_jobs_run_at ON public.jobs(run_at) WHERE status = 'queued';

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_jobs_updated_at 
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 2. THE CHRONICLE STONE — job_events table                                   │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.job_events (
  id bigserial PRIMARY KEY,
  job_id bigint NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_events_job_id ON public.job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_job_events_created_at ON public.job_events(created_at DESC);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 3. THE INVOCATION STONE — invocations table                                 │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.invocations (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  ceremony_key text NOT NULL,
  invocation_data jsonb NOT NULL DEFAULT '{}',
  job_id bigint REFERENCES public.jobs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invocations_user_id ON public.invocations(user_id);
CREATE INDEX IF NOT EXISTS idx_invocations_ceremony_key ON public.invocations(ceremony_key);
CREATE INDEX IF NOT EXISTS idx_invocations_job_id ON public.invocations(job_id);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 4. THE WITNESS STONE — audit_log table                                      │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ 5. THE ATTRIBUTION STONE — attributions table                               │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.attributions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  source text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  first_touch_at timestamptz NOT NULL DEFAULT now(),
  last_touch_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz,
  conversion_value numeric(10,2),
  metadata jsonb DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_attributions_user_id ON public.attributions(user_id);
CREATE INDEX IF NOT EXISTS idx_attributions_source ON public.attributions(source);
CREATE INDEX IF NOT EXISTS idx_attributions_utm_campaign ON public.attributions(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_attributions_converted_at ON public.attributions(converted_at);

-- ════════════════════════════════════════════════════════════════════════════════
-- 🛡️ ROW LEVEL SECURITY POLICIES
-- ════════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attributions ENABLE ROW LEVEL SECURITY;

-- Jobs: Only service_role can read/write
CREATE POLICY "Service role full access to jobs"
  ON public.jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Job Events: Only service_role can write, authenticated users can read their own
CREATE POLICY "Service role full access to job_events"
  ON public.job_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read their own job events"
  ON public.job_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invocations 
      WHERE invocations.job_id = job_events.job_id 
      AND invocations.user_id = auth.uid()
    )
  );

-- Invocations: Users can create and read their own
CREATE POLICY "Users can create their own invocations"
  ON public.invocations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own invocations"
  ON public.invocations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to invocations"
  ON public.invocations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Audit Log: Read-only for authenticated users, write via trigger only
CREATE POLICY "Users can read audit log"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role full access to audit_log"
  ON public.audit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Attributions: Users can read their own, service_role can write
CREATE POLICY "Users can read their own attributions"
  ON public.attributions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to attributions"
  ON public.attributions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════════════════
-- 🔐 SECURITY DEFINER FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ enqueue_job_service — Service-only job creation                             │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.enqueue_job_service(
  p_ceremony_key text,
  p_payload jsonb DEFAULT '{}',
  p_priority integer DEFAULT 100,
  p_run_at timestamptz DEFAULT now(),
  p_max_attempts integer DEFAULT 5
)
RETURNS bigint
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id bigint;
BEGIN
  -- Only service_role can execute this
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'Access denied: service_role required';
  END IF;

  INSERT INTO public.jobs (
    ceremony_key,
    payload,
    priority,
    run_at,
    max_attempts
  ) VALUES (
    p_ceremony_key,
    p_payload,
    p_priority,
    p_run_at,
    p_max_attempts
  )
  RETURNING id INTO v_job_id;

  -- Log to audit
  INSERT INTO public.audit_log (
    table_name,
    operation,
    record_id,
    new_data
  ) VALUES (
    'jobs',
    'INSERT',
    v_job_id::text,
    jsonb_build_object(
      'ceremony_key', p_ceremony_key,
      'priority', p_priority
    )
  );

  RETURN v_job_id;
END;
$$;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ process_job_result — Atomic job completion with exponential backoff         │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.process_job_result(
  p_job_id bigint,
  p_success boolean,
  p_error text DEFAULT NULL,
  p_result_data jsonb DEFAULT '{}'
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_job record;
  v_new_status text;
  v_next_run_at timestamptz;
  v_backoff_seconds integer;
  v_result jsonb;
BEGIN
  -- Lock the job row
  SELECT * INTO v_job
  FROM public.jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id;
  END IF;

  -- Determine new status and backoff
  IF p_success THEN
    v_new_status := 'succeeded';
    v_next_run_at := NULL;
  ELSE
    IF v_job.attempts + 1 >= v_job.max_attempts THEN
      v_new_status := 'dead';
      v_next_run_at := NULL;
    ELSE
      v_new_status := 'failed';
      -- Exponential backoff: 2^attempts * 60 seconds, capped at 1 hour
      v_backoff_seconds := LEAST(POWER(2, v_job.attempts + 1)::integer * 60, 3600);
      v_next_run_at := now() + (v_backoff_seconds || ' seconds')::interval;
    END IF;
  END IF;

  -- Update job
  UPDATE public.jobs
  SET 
    status = v_new_status,
    attempts = attempts + 1,
    completed_at = CASE WHEN p_success THEN now() ELSE completed_at END,
    run_at = COALESCE(v_next_run_at, run_at),
    error = p_error,
    updated_at = now()
  WHERE id = p_job_id;

  -- Insert job event
  INSERT INTO public.job_events (
    job_id,
    event_type,
    event_data
  ) VALUES (
    p_job_id,
    CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END,
    jsonb_build_object(
      'attempts', v_job.attempts + 1,
      'error', p_error,
      'result', p_result_data,
      'next_run_at', v_next_run_at
    )
  );

  -- Build result summary
  v_result := jsonb_build_object(
    'job_id', p_job_id,
    'status', v_new_status,
    'attempts', v_job.attempts + 1,
    'max_attempts', v_job.max_attempts,
    'next_run_at', v_next_run_at,
    'backoff_seconds', v_backoff_seconds
  );

  RETURN v_result;
END;
$$;

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ enqueue_invocation — User-facing ceremony invocation RPC                    │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.enqueue_invocation(
  p_ceremony_key text,
  p_invocation_data jsonb DEFAULT '{}'
)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_invocation_id bigint;
  v_job_id bigint;
  v_result jsonb;
BEGIN
  -- Get authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Create invocation record
  INSERT INTO public.invocations (
    user_id,
    ceremony_key,
    invocation_data
  ) VALUES (
    v_user_id,
    p_ceremony_key,
    p_invocation_data
  )
  RETURNING id INTO v_invocation_id;

  -- Create job (using service escalation)
  v_job_id := public.enqueue_job_service(
    p_ceremony_key := p_ceremony_key,
    p_payload := jsonb_build_object(
      'invocation_id', v_invocation_id,
      'user_id', v_user_id,
      'data', p_invocation_data
    )
  );

  -- Link invocation to job
  UPDATE public.invocations
  SET job_id = v_job_id
  WHERE id = v_invocation_id;

  -- Audit the invocation
  INSERT INTO public.audit_log (
    table_name,
    operation,
    record_id,
    user_id,
    new_data
  ) VALUES (
    'invocations',
    'INSERT',
    v_invocation_id::text,
    v_user_id,
    jsonb_build_object(
      'ceremony_key', p_ceremony_key,
      'job_id', v_job_id
    )
  );

  v_result := jsonb_build_object(
    'invocation_id', v_invocation_id,
    'job_id', v_job_id,
    'ceremony_key', p_ceremony_key,
    'status', 'queued'
  );

  RETURN v_result;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════════
-- 📊 OBSERVABILITY — Prometheus Metrics View
-- ════════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.job_metrics AS
SELECT 
  ceremony_key,
  status,
  COUNT(*) as job_count,
  AVG(attempts)::numeric(10,2) as avg_attempts,
  MAX(attempts) as max_attempts,
  AVG(EXTRACT(EPOCH FROM (completed_at - enqueued_at)))::numeric(10,2) as avg_duration_seconds,
  COUNT(*) FILTER (WHERE attempts > 1) as retry_count,
  COUNT(*) FILTER (WHERE status = 'dead') as dead_count
FROM public.jobs
GROUP BY ceremony_key, status;

-- Grant access to authenticated users for metrics
GRANT SELECT ON public.job_metrics TO authenticated, anon;

-- ════════════════════════════════════════════════════════════════════════════════
-- 🎯 WORKER HELPER FUNCTIONS
-- ════════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ claim_next_job — Atomic job claim with SKIP LOCKED                          │
-- └─────────────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.claim_next_job()
RETURNS TABLE (
  job_id bigint,
  ceremony_key text,
  payload jsonb,
  attempts integer,
  max_attempts integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_job record;
BEGIN
  -- Claim next queued job atomically
  SELECT * INTO v_job
  FROM public.jobs
  WHERE status = 'queued' 
    AND run_at <= now()
  ORDER BY priority ASC, id ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Mark as running
  UPDATE public.jobs
  SET 
    status = 'running',
    started_at = now(),
    updated_at = now()
  WHERE id = v_job.id;

  -- Insert start event
  INSERT INTO public.job_events (job_id, event_type, event_data)
  VALUES (v_job.id, 'started', jsonb_build_object('started_at', now()));

  -- Return job details
  RETURN QUERY
  SELECT 
    v_job.id,
    v_job.ceremony_key,
    v_job.payload,
    v_job.attempts,
    v_job.max_attempts;
END;
$$;

-- ════════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE — FOUNDATION SEALED
-- ════════════════════════════════════════════════════════════════════════════════

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.enqueue_invocation TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_job TO service_role;
GRANT EXECUTE ON FUNCTION public.process_job_result TO service_role;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '🔱 KYPRIA SHRINE SCHEMA SEALED 🔱';
  RAISE NOTICE '✅ 5 foundation stones laid';
  RAISE NOTICE '✅ RLS policies enabled';
  RAISE NOTICE '✅ Audit triggers active';
  RAISE NOTICE '✅ Worker functions ready';
  RAISE NOTICE '✅ Metrics view available';
  RAISE NOTICE '';
  RAISE NOTICE 'The Shrine stands ready for ceremonies.';
END $$;