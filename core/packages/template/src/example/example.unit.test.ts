import { calculateRoyaltyRate } from './example';

describe('calculateRoyaltyRate', () => {
  it('should return the correct royalty rate', () => {
    // Act
    const result = calculateRoyaltyRate(1000, 10);
    // Assert
    expect(result).toBe(100);
  });
});
