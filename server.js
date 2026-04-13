const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname)));

// Proxy seguro — la API key nunca se expone al cliente
app.post('/api/generate', async (req, res) => {
  const env = process.env;
  const provider = (env.AI_PROVIDER || env.PROVIDER || '').toLowerCase();
  const keys = {
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    openrouter: env.OPENROUTER_API_KEY,
    gloq: env.GLOQ_API_KEY,
    ai: env.AI_API_KEY,
  };

  const apiKey = keys[provider] || keys.ai || keys.openai || keys.openrouter || keys.gloq || keys.anthropic;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'No se encontró una API key válida en el servidor. Configurá AI_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY, GLOQ_API_KEY o ANTHROPIC_API_KEY.' } });
  }

  const resolvedProvider = provider || guessProvider(apiKey);
  const model = env.AI_MODEL || env.MODEL || (resolvedProvider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o-mini');
  const { url, headers, payload } = buildRequest(resolvedProvider, apiKey, model, req.body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    const normalized = normalizeResponse(resolvedProvider, data);
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

function guessProvider(apiKey) {
  if (!apiKey) return 'openai';
  if (apiKey.startsWith('sk-ant-') || apiKey.startsWith('anthropic-')) return 'anthropic';
  if (apiKey.startsWith('or-')) return 'openrouter';
  if (apiKey.startsWith('gloq-') || apiKey.startsWith('glq-')) return 'gloq';
  return 'openai';
}

function buildRequest(provider, apiKey, model, body) {
  const messages = body.messages || [];
  if (provider === 'anthropic') {
    return {
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      payload: {
        model,
        max_tokens: 4000,
        messages,
      },
    };
  }

  const openaiCompatible = {
    model,
    messages,
    temperature: body.temperature ?? 0.2,
  };

  const url = provider === 'openrouter'
    ? 'https://api.openrouter.ai/v1/chat/completions'
    : provider === 'gloq'
      ? 'https://api.gloq.ai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  return {
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    payload: openaiCompatible,
  };
}

function normalizeResponse(provider, data) {
  if (!data) return { content: [{ text: '' }] };

  if (provider === 'anthropic') {
    if (Array.isArray(data.content) && data.content.length) {
      return { content: data.content };
    }
    if (typeof data.completion === 'string') {
      return { content: [{ text: data.completion }] };
    }
    if (typeof data.response === 'string') {
      return { content: [{ text: data.response }] };
    }
  }

  if (Array.isArray(data.choices)) {
    const content = data.choices.flatMap(choice => {
      if (choice.message && typeof choice.message.content === 'string') {
        return [{ text: choice.message.content }];
      }
      if (typeof choice.text === 'string') {
        return [{ text: choice.text }];
      }
      if (choice.delta && typeof choice.delta.content === 'string') {
        return [{ text: choice.delta.content }];
      }
      return [];
    });
    if (content.length) return { content };
  }

  return data;
}
