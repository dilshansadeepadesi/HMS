import { describe, it, expect } from 'vitest';
import {
  validateSriLankanNIC,
  validateSriLankanPhone,
  formatLKR,
  formatSriLankanDate,
  SRI_LANKA_PROVINCES,
} from '../server/utils/srilanka';

describe('Sri Lankan Localization Utilities', () => {
  describe('validateSriLankanNIC', () => {
    it('should validate valid old 9-digit + V NIC format', () => {
      const res = validateSriLankanNIC('883412589V');
      expect(res.isValid).toBe(true);
      expect(res.format).toBe('OLD');
      expect(res.yearOfBirth).toBe(1988);
      expect(res.gender).toBe('MALE');
    });

    it('should identify female gender in old NIC format (days > 500)', () => {
      // 548 days indicates female born in 1991
      const res = validateSriLankanNIC('915482390V');
      expect(res.isValid).toBe(true);
      expect(res.gender).toBe('FEMALE');
      expect(res.yearOfBirth).toBe(1991);
    });

    it('should validate valid new 12-digit NIC format', () => {
      const res = validateSriLankanNIC('199550341100');
      expect(res.isValid).toBe(true);
      expect(res.format).toBe('NEW');
      expect(res.yearOfBirth).toBe(1995);
      expect(res.gender).toBe('FEMALE');
    });

    it('should reject invalid NIC format', () => {
      const res = validateSriLankanNIC('12345');
      expect(res.isValid).toBe(false);
      expect(res.message).toBeDefined();
    });
  });

  describe('validateSriLankanPhone', () => {
    it('should validate and normalize 0-prefixed mobile number', () => {
      const res = validateSriLankanPhone('0771234567');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+94 77 123 4567');
    });

    it('should validate and normalize +94 international format', () => {
      const res = validateSriLankanPhone('+94712345678');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+94 71 234 5678');
    });

    it('should validate Colombo landline', () => {
      const res = validateSriLankanPhone('0112345678');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('+94 11 234 5678');
    });

    it('should reject invalid phone numbers', () => {
      const res = validateSriLankanPhone('123');
      expect(res.isValid).toBe(false);
    });
  });

  describe('formatLKR Currency', () => {
    it('should format amounts correctly in LKR with commas and 2 decimals', () => {
      expect(formatLKR(2500)).toBe('LKR 2,500.00');
      expect(formatLKR(150000.5)).toBe('LKR 150,000.50');
      expect(formatLKR(0)).toBe('LKR 0.00');
      expect(formatLKR(null)).toBe('LKR 0.00');
    });
  });

  describe('Provinces and Districts', () => {
    it('should contain all 9 Sri Lankan provinces', () => {
      const provinces = Object.keys(SRI_LANKA_PROVINCES);
      expect(provinces.length).toBe(9);
      expect(provinces).toContain('Western');
      expect(provinces).toContain('Central');
      expect(provinces).toContain('Southern');
      expect(SRI_LANKA_PROVINCES['Western']).toEqual(['Colombo', 'Gampaha', 'Kalutara']);
    });
  });
});
