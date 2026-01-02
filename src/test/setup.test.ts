/**
 * Basic test to verify test setup works
 */
import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true);
  });

  it('should handle basic math', () => {
    expect(2 + 2).toBe(4);
  });
});
