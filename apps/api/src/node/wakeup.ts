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
      deadline = undefined
      running = Promise.resolve().then(run).catch(() => {
        onError()
        schedule(60_000)
      }).finally(() => { running = undefined; arm() })
    }, Math.max(0, deadline - Date.now()))
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
