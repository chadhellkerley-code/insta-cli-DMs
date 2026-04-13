const express = require('express');
const path = require('path');
const { buildRequest, normalizeResponse, resolveConfig } = require('./lib/ai-provider');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname)));

app.post('/api/generate', async (req, res) => {
  const body = req.body || {};
  const config = resolveConfig(body, process.env);
  const { apiKey } = config;

  if (!apiKey) {
    return res.status(500).json({
      error: {
        message: 'No se encontró una API key válida. Configurá una key en la app o en el servidor con AI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY o ANTHROPIC_API_KEY.',
      },
    });
  }

  const { url, headers, payload } = buildRequest(config, body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await readJson(response);
    const normalized = normalizeResponse(config.provider, data);
    res.status(response.status).json(normalized);
  } catch (err) {
    console.error('Error llamando a la API:', err);
    res.status(500).json({ error: { message: err.message } });
  }
});

// Cualquier otra ruta → index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor corriendo en http://localhost:${PORT}`));

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
