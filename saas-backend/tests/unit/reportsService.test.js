'use strict';

jest.mock('../../src/api/v1/repositories/reports.repository', () => ({
  create: jest.fn(),
}));
jest.mock('../../src/api/v1/repositories/valuations.repository', () => ({
  findById: jest.fn(),
}));
jest.mock('../../src/api/v1/repositories/properties.repository', () => ({
  findById: jest.fn(),
}));

const reportRepo = require('../../src/api/v1/repositories/reports.repository');
const service = require('../../src/api/v1/services/reports.service');
const validator = require('../../src/api/v1/validators/reports.validator');

describe('report creation formats', () => {
  test('validator rejects unsupported PDF creation', () => {
    const result = validator.create.safeParse({
      valuationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      title: 'Appraisal',
      format: 'pdf',
    });
    expect(result.success).toBe(false);
  });

  test('service defensively rejects PDF without recording a report', async () => {
    await expect(service.create('tenant-1', {
      valuationId: 'valuation-1',
      title: 'Appraisal',
      format: 'pdf',
      createdBy: 'user-1',
    })).rejects.toMatchObject({ status: 400 });
    expect(reportRepo.create).not.toHaveBeenCalled();
  });
});
