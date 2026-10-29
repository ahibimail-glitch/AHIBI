function createGracefulShutdown({
  server,
  socketServer,
  stopBackgroundJobs,
  disconnectDatabase,
  logger = console,
}) {
  let draining = false;
  let shutdownPromise;

  function shutdown(signal) {
    if (shutdownPromise) return shutdownPromise;

    draining = true;
    logger.log(`[Shutdown] ${signal} received; draining requests and background work.`);

    const serverClosed = server?.listening
      ? new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
      : Promise.resolve();

    try {
      socketServer?.disconnectSockets?.(true);
    } catch (error) {
      logger.error('[Shutdown] Could not close Socket.IO clients:', error.message);
    }

    const backgroundWorkStopped = Promise.resolve().then(() => stopBackgroundJobs?.());
    shutdownPromise = Promise.all([serverClosed, backgroundWorkStopped])
      .then(() => disconnectDatabase?.())
      .then(() => logger.log('[Shutdown] HTTP server, background work, and database are closed.'));

    return shutdownPromise;
  }

  return {
    isDraining: () => draining,
    shutdown,
  };
}

module.exports = { createGracefulShutdown };
