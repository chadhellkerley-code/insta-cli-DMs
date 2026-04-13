# 🤖 Insta Cli DMs

Generador de flujos de DMs para Instagram potenciado por IA (Claude de Anthropic).

Genera 3 variantes de pitch + seguimientos + pre-agenda en segundos.

---

## 🚀 Deploy en Netlify (recomendado)

1. **Subí este repo a GitHub**
2. **Conectá el repo en [netlify.com](https://netlify.com)**
3. Netlify detecta automáticamente el `netlify.toml`
4. Ir a **Site settings → Environment variables** y agregar:
   ```
   AI_API_KEY = <tu_api_key>
   AI_PROVIDER = openai
   ```
   o usa la key específica:
   ```
   OPENAI_API_KEY = <tu_api_key>
   OPENROUTER_API_KEY = <tu_api_key>
   GLOQ_API_KEY = <tu_api_key>
   ANTHROPIC_API_KEY = <tu_api_key>
   ```
5. ¡Listo! El sitio quedará vivo en `https://tu-sitio.netlify.app`

---

## 💻 Correr en local

### Requisitos
- Node.js 18+

### Pasos

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo .env con tu API key
cp .env.example .env
# Editá .env y pegá tu API key en AI_API_KEY.
#+ Opcional: `AI_PROVIDER=openai|anthropic|openrouter|gloq`

# 3. Iniciar el servidor
npm start
# → Abre http://localhost:3000
```

---

## 🔑 Cómo usar cualquier API key

La app ahora puede funcionar con cualquier de estas keys:

- `AI_API_KEY` (recomendado)
- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `GLOQ_API_KEY`
- `ANTHROPIC_API_KEY`

Si la variable `AI_PROVIDER` no está configurada, el backend intenta detectar el proveedor por el formato de la key.

1. Copiá tu key de OpenAI, OpenRouter, Gloq o Anthropic.
2. Pégala en `.env` como `AI_API_KEY`.
3. Si quieres forzar el proveedor, agrega `AI_PROVIDER=openai|anthropic|openrouter|gloq`.

---

## 📁 Estructura del proyecto

```
insta-cli-dms/
├── index.html              # Frontend completo (UI)
├── server.js               # Servidor Node.js para correr en local
├── package.json
├── netlify.toml            # Configuración de deploy en Netlify
├── netlify/
│   └── functions/
│       └── generate.js     # Proxy serverless para Netlify
├── .env.example
└── .gitignore
```

---

## ⚙️ ¿Por qué hay un servidor proxy?

La API key de Anthropic **nunca debe estar en el frontend** (cualquiera podría verla y usarla).

El servidor (`server.js` para local, `generate.js` para Netlify) actúa como intermediario:
- El browser llama a `/api/generate` en tu propio servidor
- El servidor agrega la API key de forma segura y llama a Anthropic
- La key jamás es visible en el browser

---

## 📄 Licencia

MIT
