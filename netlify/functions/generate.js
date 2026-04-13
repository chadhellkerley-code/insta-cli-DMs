const { buildRequest, normalizeResponse, resolveConfig } = require('../../lib/ai-provider');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const body = JSON.parse(event.body || '{}');
  const config = resolveConfig(body, process.env);
  const { apiKey } = config;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: {
          message: 'No se encontró una API key válida. Configurá una key en la app o en Netlify con AI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY o ANTHROPIC_API_KEY.',
        },
      }),
    };
  }

  try {
    const { url, headers, payload } = buildRequest(config, body);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await readJson(response);
    const normalized = normalizeResponse(config.provider, data);

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: { message: err.message } }),
    };
  }
};

async function readJson(response) {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {
      error: {
        message: raw.slice(0, 800),
      },
    };
  }
}
