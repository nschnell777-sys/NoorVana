const { calculatePoints } = require('../../src/services/pointsService');

describe('calculatePoints', () => {
  test('Bronze tier: 1.0x multiplier', () => {
    expect(calculatePoints(2000, 'bronze')).toBe(2000);
  });

  test('Silver tier: 1.5x multiplier', () => {
    expect(calculatePoints(2000, 'silver')).toBe(3000);
  });

  test('Gold tier: 2.0x multiplier', () => {
    expect(calculatePoints(2000, 'gold')).toBe(4000);
  });

  test('Platinum tier: 2.5x multiplier', () => {
    expect(calculatePoints(2000, 'platinum')).toBe(5000);
  });

  test('Diamond tier: 3.0x multiplier', () => {
    expect(calculatePoints(2000, 'diamond')).toBe(6000);
  });

  test('floors fractional points', () => {
    expect(calculatePoints(33.33, 'silver')).toBe(49); // 33.33 * 1.5 = 49.995
  });

  test('handles small amounts', () => {
    expect(calculatePoints(1, 'bronze')).toBe(1);
  });

  test('handles large amounts', () => {
    expect(calculatePoints(100000, 'diamond')).toBe(300000);
  });
});
