import { formatElapsed } from './utils';

describe('formatElapsed', () => {
  it('formats sub-minute durations as seconds only', () => {
    expect(formatElapsed(0)).toBe('0s');
    expect(formatElapsed(45)).toBe('45s');
  });

  it('formats sub-hour durations as minutes and seconds', () => {
    expect(formatElapsed(60)).toBe('1m 0s');
    expect(formatElapsed(90)).toBe('1m 30s');
    expect(formatElapsed(599)).toBe('9m 59s');
  });

  it('formats durations of an hour or more with hours, minutes and seconds', () => {
    expect(formatElapsed(3600)).toBe('1h 0m 0s');
    expect(formatElapsed(3661)).toBe('1h 1m 1s');
    expect(formatElapsed(7325)).toBe('2h 2m 5s');
  });
});
