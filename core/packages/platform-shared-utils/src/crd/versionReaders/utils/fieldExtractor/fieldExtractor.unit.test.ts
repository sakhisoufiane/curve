import { FieldExtractor } from './fieldExtractor';

describe('FieldExtractor', () => {
  it('extracts consecutive substrings while advancing internal cursor', () => {
    // Arrange
    const extractor = new FieldExtractor('ABCDEF123456');
    // Act
    const first = extractor.extractString(3);
    const second = extractor.extractString(3);
    const third = extractor.extractString(6);
    // Assert
    expect(first).toBe('ABC');
    expect(second).toBe('DEF');
    expect(third).toBe('123456');
  });

  it('trims whitespace around extracted substrings', () => {
    // Arrange
    const extractor = new FieldExtractor('FOO    BAR   ');
    // Act
    const first = extractor.extractString(7);
    const second = extractor.extractString(6);
    // Assert
    expect(first).toBe('FOO');
    expect(second).toBe('BAR');
  });

  it('handles requests that exceed remaining length by returning the rest of the string', () => {
    // Arrange
    const extractor = new FieldExtractor('END');
    // Act
    const first = extractor.extractString(2);
    const second = extractor.extractString(10);
    // Assert
    expect(first).toBe('EN');
    expect(second).toBe('D');
  });
});
