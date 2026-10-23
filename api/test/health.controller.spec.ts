import { HealthController } from '../src/health/health.controller.js';

describe('HealthController', () => {
  it('answers ok, with the uptime of the process', () => {
    const answer = new HealthController().check();

    expect(answer.status).toBe('ok');
    expect(answer.uptime).toBeGreaterThan(0);
  });
});
