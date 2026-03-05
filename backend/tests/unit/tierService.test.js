const { determineTier, getNextTier, pointsToNextTier, progressPercentage } = require('../../src/services/tierService');

describe('determineTier', () => {
  test('0 points = Bronze', () => {
    expect(determineTier(0)).toBe('bronze');
  });

  test('9,999 points = Bronze', () => {
    expect(determineTier(9999)).toBe('bronze');
  });

  test('10,000 points = Silver', () => {
    expect(determineTier(10000)).toBe('silver');
  });

  test('24,999 points = Silver', () => {
    expect(determineTier(24999)).toBe('silver');
  });

  test('25,000 points = Gold', () => {
    expect(determineTier(25000)).toBe('gold');
  });

  test('50,000 points = Platinum', () => {
    expect(determineTier(50000)).toBe('platinum');
  });

  test('99,999 points = Platinum', () => {
    expect(determineTier(99999)).toBe('platinum');
  });

  test('100,000 points = Diamond', () => {
    expect(determineTier(100000)).toBe('diamond');
  });

  test('500,000 points = Diamond (stays at max)', () => {
    expect(determineTier(500000)).toBe('diamond');
  });
});

describe('getNextTier', () => {
  test('Bronze -> Silver', () => {
    expect(getNextTier('bronze')).toBe('silver');
  });

  test('Silver -> Gold', () => {
    expect(getNextTier('silver')).toBe('gold');
  });

  test('Diamond -> null (max tier)', () => {
    expect(getNextTier('diamond')).toBeNull();
  });
});

describe('pointsToNextTier', () => {
  test('Bronze at 3000 needs 7000 for Silver', () => {
    expect(pointsToNextTier('bronze', 3000)).toBe(7000);
  });

  test('Silver at 20000 needs 5000 for Gold', () => {
    expect(pointsToNextTier('silver', 20000)).toBe(5000);
  });

  test('Diamond returns 0', () => {
    expect(pointsToNextTier('diamond', 150000)).toBe(0);
  });
});

describe('progressPercentage', () => {
  test('Bronze at 0 = 0%', () => {
    expect(progressPercentage('bronze', 0)).toBe(0);
  });

  test('Bronze at 5000 = 50%', () => {
    expect(progressPercentage('bronze', 5000)).toBe(50);
  });

  test('Diamond = 100%', () => {
    expect(progressPercentage('diamond', 120000)).toBe(100);
  });
});
