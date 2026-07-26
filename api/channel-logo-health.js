'use strict';

module.exports = async function handler(request, response) {
  const origin = `https://${request.headers.host}`;
  try {
    const check = await fetch(`${origin}/api/channel-logo-sprite.js?meta=1`, { cache: 'no-store' });
    const metadata = await check.json();
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.status(check.ok && metadata.integrityOk ? 200 : 503).json({
      healthy: Boolean(check.ok && metadata.integrityOk),
      metadata
    });
  } catch (error) {
    response.setHeader('Cache-Control', 'no-store');
    response.status(503).json({ healthy: false, error: 'No se pudo validar el sprite de logos.' });
  }
};
