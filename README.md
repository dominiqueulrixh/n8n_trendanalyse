# Instagram Content Generator

Einfache Next.js-Webseite mit TypeScript und Tailwind CSS, die serverseitig einen n8n Webhook aufruft und die JSON-Antwort darstellt.

## Setup

1. `.env.example` nach `.env` kopieren oder direkt eine `.env` im Projektroot anlegen.
2. `N8N_WEBHOOK_URL` auf deine n8n Webhook-URL setzen.
3. Optional `N8N_WEBHOOK_SECRET` setzen, wenn dein Workflow den Header `x-api-key` erwartet.
4. Abhängigkeiten installieren:

```bash
npm install
```

5. Projekt starten:

```bash
npm run dev
```

Die App läuft dann lokal unter `http://localhost:3000`.

## API Route

Das Frontend sendet nur an `POST /api/generate`. Diese Route leitet den Request serverseitig an n8n weiter.

## Hinweis

Der Secret Token und die n8n-URL bleiben im Backend. Nichts davon wird im Frontend-Code verwendet.
