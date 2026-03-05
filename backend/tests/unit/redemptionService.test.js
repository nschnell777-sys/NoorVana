const { generateVoucherCode } = require('../../src/services/redemptionService');

describe('generateVoucherCode', () => {
  test('generates code in NV-XXXXXX format', async () => {
    const code = await generateVoucherCode();
    expect(code).toMatch(/^NV-[A-Z0-9]{6}$/);
  });

  test('generates unique codes', async () => {
    const codes = new Set();
    for (let i = 0; i < 20; i++) {
      codes.add(await generateVoucherCode());
    }
    expect(codes.size).toBe(20);
  });
});
