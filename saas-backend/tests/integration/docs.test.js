'use strict';

const express = require('express');
const request = require('supertest');
const docsRouter = require('../../src/api/v1/routes/docs.routes');

describe('API documentation', () => {
  const app = express().use('/api/v1/docs', docsRouter);

  test('Swagger UI loads its spec from the correct relative URL', async () => {
    const response = await request(app).get('/api/v1/docs/');
    expect(response.status).toBe(200);
    expect(response.text).toContain("url: './openapi.json'");
  });

  test('OpenAPI documents implemented user and OAuth routes honestly', async () => {
    const response = await request(app).get('/api/v1/docs/openapi.json');
    expect(response.status).toBe(200);
    expect(response.body.paths['/users/{id}'].get).toBeDefined();
    expect(response.body.paths['/users/{id}'].patch).toBeDefined();
    expect(response.body.paths['/auth/oauth/google'].get).toBeDefined();
    expect(response.body.paths['/auth/oauth/google/callback'].get.responses['501']).toBeDefined();
    expect(
      response.body.paths['/reports'].post.requestBody.content['application/json']
        .schema.properties.format.enum,
    ).toEqual(['json', 'markdown']);
  });
});
