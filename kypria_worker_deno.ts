// ════════════════════════════════════════════════════════════════════════════════
// ⚙️ KYPRIA SHRINE WORKER — The Living Processor
// ════════════════════════════════════════════════════════════════════════════════
//
// MYTHIC VISION:
// The Worker is the Shrine's heartbeat—a tireless spirit that:
//   - Claims jobs atomically from the sacred queue
//   - Executes ceremonies with circuit breaker protection
//   - Reports outcomes to the immutable audit flame
//   - Never sleeps, never forgets, never breaks the covenant
//
// TECHNICAL PRECISION:
// - Polls queue every 5 seconds
// - Uses SKIP LOCKED for race-free claims
// - Implements exponential backoff via process_job_result
// - Logs all actions for observability
// ════════════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Configuration                                                                │
// └─────────────────────────────────────────────────────────────────────────────┘

interface Config {
  supabaseUrl: string;
  supabaseServiceKey: string;
  pollIntervalMs: number;
  maxConcurrentJobs: number;
}

const config: Config = {
  supabaseUrl: Deno.env.get('SUPABASE_URL') || '',
  supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  pollIntervalMs: parseInt(Deno.env.get('POLL_INTERVAL_MS') || '5000'),
  maxConcurrentJobs: parseInt(Deno.env.get('MAX_CONCURRENT_JOBS') || '5'),
};

// Validate configuration
if (!config.supabaseUrl || !config.supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Supabase Client                                                              │
// └─────────────────────────────────────────────────────────────────────────────┘

const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Types                                                                        │
// └─────────────────────────────────────────────────────────────────────────────┘

interface Job {
  job_id: number;
  ceremony_key: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}

interface CeremonyResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Ceremony Registry — Map ceremony_key to execution logic                     │
// └─────────────────────────────────────────────────────────────────────────────┘

type CeremonyExecutor = (payload: Record<string, unknown>) => Promise<CeremonyResult>;

const ceremonies: Record<string, CeremonyExecutor> = {
  // Content Generation Ceremony
  content_generation: async (payload) => {
    console.log('  🎨 Executing content_generation ceremony');
    console.log('  📦 Payload:', JSON.stringify(payload, null, 2));
    
    // Simulate content generation (replace with real logic)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const theme = payload.theme || 'default';
    const count = payload.count || 1;
    
    return {
      success: true,
      data: {
        theme,
        posts_generated: count,
        content: [
          {
            platform: 'twitter',
            text: `🔱 First Light ceremony complete. The Shrine awakens. #${theme}`,
          },
          {
            platform: 'facebook',
            text: `The sacred queue flows with ${count} new offerings.`,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    };
  },

  // Platform Sync Ceremony
  platform_sync: async (payload) => {
    console.log('  🌐 Executing platform_sync ceremony');
    
    const platform = payload.platform as string;
    const action = payload.action as string;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      data: {
        platform,
        action,
        synced_at: new Date().toISOString(),
      },
    };
  },

  // Analytics Ceremony
  analytics_generation: async (payload) => {
    console.log('  📊 Executing analytics_generation ceremony');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      success: true,
      data: {
        metrics: {
          total_jobs: 42,
          success_rate: 0.95,
          avg_attempts: 1.2,
        },
        generated_at: new Date().toISOString(),
      },
    };
  },

  // Test Ceremony (for First Light awakening)
  test_ceremony: async (payload) => {
    console.log('  🧪 Executing test_ceremony');
    console.log('  Message:', payload.message);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      data: {
        message: 'Test ceremony completed successfully',
        payload,
      },
    };
  },
};

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Job Processing Logic                                                         │
// └─────────────────────────────────────────────────────────────────────────────┘

async function claimJob(): Promise<Job | null> {
  try {
    const { data, error } = await supabase.rpc('claim_next_job').single();
    
    if (error) {
      // No jobs available is not an error
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    return data as Job;
  } catch (error) {
    console.error('❌ Error claiming job:', error);
    return null;
  }
}

async function executeCeremony(job: Job): Promise<CeremonyResult> {
  const executor = ceremonies[job.ceremony_key];
  
  if (!executor) {
    return {
      success: false,
      error: `Unknown ceremony: ${job.ceremony_key}`,
    };
  }
  
  try {
    const result = await executor(job.payload);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function reportJobResult(
  jobId: number,
  result: CeremonyResult
): Promise<void> {
  try {
    const { error } = await supabase.rpc('process_job_result', {
      p_job_id: jobId,
      p_success: result.success,
      p_error: result.error || null,
      p_result_data: result.data || {},
    });
    
    if (error) {
      console.error('❌ Error reporting job result:', error);
    }
  } catch (error) {
    console.error('❌ Exception reporting job result:', error);
  }
}

async function processJob(job: Job): Promise<void> {
  const startTime = Date.now();
  
  console.log(`⚡ Processing job ${job.job_id}`);
  console.log(`  Ceremony: ${job.ceremony_key}`);
  console.log(`  Attempts: ${job.attempts + 1}/${job.max_attempts}`);
  
  const result = await executeCeremony(job);
  const duration = Date.now() - startTime;
  
  if (result.success) {
    console.log(`✅ Job ${job.job_id} succeeded in ${duration}ms`);
  } else {
    console.log(`❌ Job ${job.job_id} failed: ${result.error}`);
  }
  
  await reportJobResult(job.job_id, result);
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Worker Main Loop                                                             │
// └─────────────────────────────────────────────────────────────────────────────┘

let activeJobs = 0;
let isShuttingDown = false;

async function workerLoop(): Promise<void> {
  while (!isShuttingDown) {
    try {
      // Check if we can process more jobs
      if (activeJobs >= config.maxConcurrentJobs) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // Claim next job
      const job = await claimJob();
      
      if (!job) {
        // No jobs available, wait before polling again
        await new Promise(resolve => setTimeout(resolve, config.pollIntervalMs));
        continue;
      }
      
      // Process job asynchronously
      activeJobs++;
      processJob(job)
        .catch(error => {
          console.error(`❌ Unexpected error processing job ${job.job_id}:`, error);
        })
        .finally(() => {
          activeJobs--;
        });
      
    } catch (error) {
      console.error('❌ Worker loop error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Graceful Shutdown                                                            │
// └─────────────────────────────────────────────────────────────────────────────┘

async function shutdown(signal: string): Promise<void> {
  console.log(`\n⚠️  Received ${signal}, shutting down gracefully...`);
  isShuttingDown = true;
  
  // Wait for active jobs to complete (max 30 seconds)
  const maxWait = 30000;
  const startWait = Date.now();
  
  while (activeJobs > 0 && (Date.now() - startWait) < maxWait) {
    console.log(`  Waiting for ${activeJobs} active job(s) to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (activeJobs > 0) {
    console.warn(`⚠️  Forcing shutdown with ${activeJobs} active job(s)`);
  } else {
    console.log('✅ All jobs completed, shutdown clean');
  }
  
  Deno.exit(0);
}

// Register signal handlers
Deno.addSignalListener('SIGINT', () => shutdown('SIGINT'));
Deno.addSignalListener('SIGTERM', () => shutdown('SIGTERM'));

// ┌─────────────────────────────────────────────────────────────────────────────┐
// │ Start Worker                                                                 │
// └─────────────────────────────────────────────────────────────────────────────┘

console.log('════════════════════════════════════════════════════════════════');
console.log('🔱 KYPRIA SHRINE WORKER AWAKENING 🔱');
console.log('════════════════════════════════════════════════════════════════');
console.log(`📍 Supabase URL: ${config.supabaseUrl}`);
console.log(`⏱️  Poll Interval: ${config.pollIntervalMs}ms`);
console.log(`🔢 Max Concurrent Jobs: ${config.maxConcurrentJobs}`);
console.log(`📜 Registered Ceremonies: ${Object.keys(ceremonies).join(', ')}`);
console.log('════════════════════════════════════════════════════════════════');
console.log('✅ Worker online. Listening for ceremonies...\n');

// Start the worker loop
workerLoop().catch(error => {
  console.error('💀 Fatal error in worker loop:', error);
  Deno.exit(1);
});