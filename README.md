# Insta Cli DMs

Generador de flujos de DMs para Instagram con soporte multi-provider.

## Qué cambió

- Se eliminó la configuración basada en “proxy” para el usuario final.
- La app ahora permite elegir proveedor, API key, modelo y base URL desde la UI.
- Soporta `OpenRouter`, `Groq`, `OpenAI`, `Anthropic` y cualquier endpoint `OpenAI-compatible`.
- La configuración se guarda localmente en el navegador.

## Deploy en Netlify

1. Subí este repo a GitHub.
2. Conectá el repo en Netlify.
3. Netlify detecta `netlify.toml` automáticamente.
4. Si querés dejar un proveedor por defecto en el deploy, configurá variables de entorno:

```bash
AI_PROVIDER=openrouter
AI_MODEL=openai/gpt-4o-mini
AI_API_KEY=tu_api_key
```

También podés usar variables específicas:

```bash
OPENAI_API_KEY=tu_api_key
OPENROUTER_API_KEY=tu_api_key
GROQ_API_KEY=tu_api_key
ANTHROPIC_API_KEY=tu_api_key
AI_BASE_URL=https://tu-proveedor.com/v1
```

La UI puede sobreescribir proveedor, key, modelo y base URL con la rueda de configuración.

## Correr en local

Requisitos:
- Node.js 18+

Pasos:

```bash
npm install
cp .env.example .env
npm start
```

La app queda disponible en `http://localhost:3000`.

## Configuración de IA

Desde la app podés definir:

- `Proveedor`
- `API key`
- `Modelo`
- `Base URL` opcional para proveedores OpenAI-compatible

Si no cargás nada en la UI, la app usa la configuración del servidor.

## Variables de entorno

Variables generales:

```bash
AI_PROVIDER=openai|openrouter|groq|anthropic|custom
AI_MODEL=gpt-4o-mini
AI_API_KEY=tu_api_key
AI_BASE_URL=https://tu-proveedor.com/v1
PORT=3000
```

Variables por proveedor:

```bash
OPENAI_API_KEY=tu_api_key
OPENROUTER_API_KEY=tu_api_key
GROQ_API_KEY=tu_api_key
ANTHROPIC_API_KEY=tu_api_key
```

Nota: `GLOQ_API_KEY` sigue funcionando por compatibilidad con versiones anteriores del proyecto, pero el nombre correcto es `GROQ_API_KEY`.

## Estructura

```text
insta-cli-dms/
├── index.html
├── server.js
├── lib/
│   └── ai-provider.js
├── netlify/
│   └── functions/
│       └── generate.js
├── package.json
├── netlify.toml
└── .env.example
```

## GitHub

Si ya tenés permisos de push configurados en esta máquina:

```bash
git add .
git commit -m "Add multi-provider AI configuration"
git push origin main
```
