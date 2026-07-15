module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Método no permitido' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const recipient = body.recipient || 'contacto@liderdeseguros.com';
    const message = body.message || '';
    const subject = body.subject || 'Solicitud de cambio de aceite - Líder Seguros';
    const fromName = body.fromName || 'Solicitud de cambio de aceite';
    const cc = body.cc || '';

    const payload = new URLSearchParams({
      _subject: subject,
      _captcha: 'false',
      _template: 'table',
      _cc: cc,
      name: fromName,
      email: recipient,
      message
    });

    const upstreamResponse = await fetch('https://formsubmit.co/ajax/contacto@liderdeseguros.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Accept': 'application/json'
      },
      body: payload.toString()
    });

    const text = await upstreamResponse.text();
    res.status(upstreamResponse.ok ? 200 : upstreamResponse.status).json({
      ok: upstreamResponse.ok,
      status: upstreamResponse.status,
      message: text
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
};
