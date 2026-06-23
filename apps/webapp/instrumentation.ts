export async function register() {
  if (process.env.NODE_ENV !== 'development') return;
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { runFollowupCron } = await import('@/lib/cron/followup');

  const INTERVAL_MS = 60 * 1000; // every minute in dev

  setInterval(async () => {
    try {
      const result = await runFollowupCron();
      if (result.claimed > 0) {
        console.log('[dev/cron] followup:', result);
      }
    } catch (err) {
      console.error('[dev/cron] followup error:', err);
    }
  }, INTERVAL_MS);

  console.log('[dev/cron] followup scheduler started — polling every 60s');
}
