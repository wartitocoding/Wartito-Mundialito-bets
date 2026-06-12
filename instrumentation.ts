// Hook de instrumentación de Next.js: register() corre una sola vez cuando
// arranca el servidor. Lo usamos para iniciar el scheduler de sincronización.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler');
    startScheduler();
  }
}
