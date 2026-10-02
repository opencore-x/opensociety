// One process owns a wake-up timer, while the database owns the durable work.
// Deadlines coalesce, callbacks never overlap, and failures retry without
// turning an empty outbox into a database polling loop.
export function createWakeup(run: () => Promise<void>, onError: () => void) {
  let deadline: number | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<void> | undefined
  let stopped = false

  function arm() {
    if (stopped || running || deadline === undefined) return
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      // Node clamps delays above 2^31-1 ms to 1 ms. Monthly deadlines can
      // exceed that limit, so wake only to re-arm until the deadline is due.
      if (deadline !== undefined && deadline > Date.now()) { arm(); return }
      deadline = undefined
      running = Promise.resolve().then(run).catch(() => {
        onError()
        schedule(60_000)
      }).finally(() => { running = undefined; arm() })
    }, Math.min(2_147_483_647, Math.max(0, deadline - Date.now())))
  }
  function schedule(delayMs = 0) {
    if (stopped) return
    deadline = Math.min(deadline ?? Infinity, Date.now() + Math.max(0, delayMs))
    arm()
  }
  return {
    schedule,
    async stop() {
      stopped = true
      if (timer !== undefined) clearTimeout(timer)
      await running
    },
  }
}
