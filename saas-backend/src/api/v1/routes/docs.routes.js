'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Router } = require('express');

const router = Router();

let spec;
try {
  spec = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'openapi.json'), 'utf8'));
} catch (e) {
  spec = { openapi: '3.1.0', info: { title: 'PropIntel API', version: '1.0.0' }, paths: {} };
}

router.get('/openapi.json', (req, res) => {
  res.json(spec);
});

const SWAGGER_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>PropIntel API — Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>body{margin:0}</style>
</head>
<body>
  <div id="ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: 'docs/openapi.json',
        dom_id: '#ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>`;

router.get('/', (req, res) => {
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.send(SWAGGER_HTML);
});

module.exports = router;
