const PROVIDER_ALIASES = {
  auto: '',
  gloq: 'groq',
};

const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  openrouter: 'openai/gpt-4o-mini',
  groq: 'llama-3.1-8b-instant',
  anthropic: 'claude-3-5-sonnet-latest',
  custom: 'gpt-4o-mini',
};

function normalizeProviderName(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return PROVIDER_ALIASES[normalized] ?? normalized;
}

function getDefaultModel(provider) {
  return DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;
}

function guessProvider(apiKey = '', baseUrl = '') {
  const normalizedBaseUrl = String(baseUrl || '').toLowerCase();
  if (normalizedBaseUrl.includes('anthropic.com')) return 'anthropic';
  if (normalizedBaseUrl.includes('openrouter.ai')) return 'openrouter';
  if (normalizedBaseUrl.includes('api.groq.com')) return 'groq';
  if (normalizedBaseUrl.includes('api.openai.com')) return 'openai';
  if (normalizedBaseUrl) return 'custom';

  if (!apiKey) return 'openai';
  if (apiKey.startsWith('sk-ant-') || apiKey.startsWith('anthropic-')) return 'anthropic';
  if (apiKey.startsWith('sk-or-') || apiKey.startsWith('or-')) return 'openrouter';
  if (apiKey.startsWith('gsk_') || apiKey.startsWith('groq-') || apiKey.startsWith('gloq-') || apiKey.startsWith('glq-')) {
    return 'groq';
  }
  return 'openai';
}

function resolveConfig(body = {}, env = {}) {
  const requestedProvider = normalizeProviderName(body.provider);
  const envProvider = normalizeProviderName(env.AI_PROVIDER || env.PROVIDER);
  const baseUrl = readFirst(body.baseUrl, env.AI_BASE_URL, env.OPENAI_BASE_URL);
  const keys = {
    anthropic: env.ANTHROPIC_API_KEY,
    openai: env.OPENAI_API_KEY,
    openrouter: env.OPENROUTER_API_KEY,
    groq: env.GROQ_API_KEY || env.GLOQ_API_KEY,
    custom: env.AI_API_KEY || env.OPENAI_API_KEY || env.OPENROUTER_API_KEY || env.GROQ_API_KEY || env.GLOQ_API_KEY,
    ai: env.AI_API_KEY,
  };

  const providerHint = requestedProvider || envProvider;
  const apiKey = readFirst(
    body.apiKey,
    keys[providerHint],
    keys.ai,
    keys.openai,
    keys.openrouter,
    keys.groq,
    keys.anthropic
  );

  const provider = providerHint || guessProvider(apiKey, baseUrl);
  const model = readFirst(body.model, env.AI_MODEL, env.MODEL) || getDefaultModel(provider);

  return {
    provider,
    apiKey,
    model,
    baseUrl,
  };
}

function buildRequest(config, body = {}) {
  const { provider, apiKey, model, baseUrl } = config;
  const messages = transformMessages(body.messages || [], provider);

  if (provider === 'anthropic') {
    return {
      url: resolveAnthropicUrl(baseUrl),
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

  return {
    url: resolveOpenAiCompatibleUrl(provider, baseUrl),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...getProviderHeaders(provider, body),
    },
    payload: {
      model,
      messages,
      temperature: body.temperature ?? 0.2,
    },
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
      if (Array.isArray(choice.message?.content)) {
        return choice.message.content
          .filter(block => block && typeof block.text === 'string')
          .map(block => ({ text: block.text }));
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

function transformMessages(messages, provider) {
  const list = Array.isArray(messages) ? messages : [];
  if (provider === 'anthropic') {
    return list.map(message => ({
      role: message.role,
      content: transformContentForAnthropic(message.content),
    }));
  }

  return list.map(message => ({
    role: message.role,
    content: transformContentForOpenAiCompatible(message.content),
  }));
}

function transformContentForAnthropic(content) {
  if (!Array.isArray(content)) return content;
  return content.map(block => {
    if (block?.type === 'image_url') {
      const url = block.image_url?.url || '';
      const match = url.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        return {
          type: 'image',
          source: {
            type: 'base64',
            media_type: match[1],
            data: match[2],
          },
        };
      }
    }
    if (block?.type === 'text') {
      return { type: 'text', text: block.text || '' };
    }
    return block;
  });
}

function transformContentForOpenAiCompatible(content) {
  if (!Array.isArray(content)) return content;
  return content.map(block => {
    if (block?.type === 'image') {
      const mediaType = block.source?.media_type || 'image/jpeg';
      const data = block.source?.data || '';
      return {
        type: 'image_url',
        image_url: {
          url: `data:${mediaType};base64,${data}`,
        },
      };
    }
    if (block?.type === 'text') {
      return { type: 'text', text: block.text || '' };
    }
    return block;
  });
}

function resolveAnthropicUrl(baseUrl) {
  return resolveUrl(baseUrl, 'https://api.anthropic.com/v1/messages', '/v1/messages');
}

function resolveOpenAiCompatibleUrl(provider, baseUrl) {
  const defaultUrl = provider === 'openrouter'
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  return resolveUrl(baseUrl, defaultUrl, '/v1/chat/completions');
}

function resolveUrl(baseUrl, defaultUrl, defaultPath) {
  const normalized = readFirst(baseUrl);
  if (!normalized) return defaultUrl;

  const trimmed = normalized.replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions') || trimmed.endsWith('/messages')) {
    return trimmed;
  }
  if (trimmed.endsWith('/v1') || trimmed.endsWith('/api/v1') || trimmed.endsWith('/openai/v1')) {
    return `${trimmed}${defaultPath.replace('/v1', '')}`;
  }
  return `${trimmed}${defaultPath}`;
}

function getProviderHeaders(provider, body = {}) {
  if (provider !== 'openrouter') return {};

  const headers = {};
  const referer = readFirst(body.appUrl, body.siteUrl);
  const title = readFirst(body.appName);

  if (referer) headers['HTTP-Referer'] = referer;
  if (title) headers['X-Title'] = title;

  return headers;
}

function readFirst(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

module.exports = {
  buildRequest,
  getDefaultModel,
  guessProvider,
  normalizeProviderName,
  normalizeResponse,
  resolveConfig,
};
