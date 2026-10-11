export async function register() {
  if (process.env.NODE_ENV !== "development" || process.env.NEXT_RUNTIME !== "nodejs") return;

  const globalForScheduler = globalThis as typeof globalThis & {
    acsesElectionCloseTimer?: NodeJS.Timeout;
  };
  if (globalForScheduler.acsesElectionCloseTimer) return;

  const { closeExpiredElections } = await import("./src/lib/election-scheduler");
  const checkExpiredElections = async () => {
    try {
      await closeExpiredElections();
    } catch (error) {
      console.error("Could not automatically close expired elections.", error);
    }
  };

  void checkExpiredElections();
  globalForScheduler.acsesElectionCloseTimer = setInterval(checkExpiredElections, 15_000);
  globalForScheduler.acsesElectionCloseTimer.unref();
}
