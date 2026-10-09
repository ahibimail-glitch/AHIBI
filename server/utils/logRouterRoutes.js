/**
 * Startup helper: list registered HTTP methods and paths on an Express router.
 */
function logRouterRoutes(label, router, mountPath = '') {
  if (!router || !router.stack) {
    console.warn(`[routes] ${label}: router missing or has no stack`);
    return [];
  }

  const routes = [];
  router.stack.forEach((layer) => {
    if (!layer.route) return;
    const methods = Object.keys(layer.route.methods)
      .filter((m) => layer.route.methods[m])
      .map((m) => m.toUpperCase())
      .join(',');
    routes.push(`${methods} ${mountPath}${layer.route.path}`);
  });

  if (routes.length === 0) {
    console.warn(`[routes] ${label}: NO route handlers registered (middleware-only router)`);
  } else {
    console.log(`[routes] ${label} (${routes.length}): ${routes.join(', ')}`);
  }

  return routes;
}

module.exports = { logRouterRoutes };
