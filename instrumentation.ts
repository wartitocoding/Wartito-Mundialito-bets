// Hook de instrumentación de Next.js: register() corre una sola vez cuando
// arranca el servidor. Lo usamos para iniciar los schedulers internos:
// sincronización con ESPN y backups locales automáticos de la DB.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('./lib/scheduler');
    startScheduler();

    const { startBackupScheduler } = await import('./lib/backup');
    startBackupScheduler();
  }
}
