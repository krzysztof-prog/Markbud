/**
 * Profile Validators Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  createProfileSchema,
  updateProfileSchema,
  profileParamsSchema,
  updateProfileOrderSchema,
} from './profile.js';

describe('Profile Validators', () => {
  describe('createProfileSchema', () => {
    it('should validate correct create profile input', () => {
      const input = {
        number: 'P001',
        name: 'Test Profile',
        description: 'A test profile',
        articleNumber: 'ART123',
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it('should validate with minimal required fields', () => {
      const input = {
        number: 'P001',
        name: 'Test Profile',
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.number).toBe('P001');
        expect(result.data.name).toBe('Test Profile');
      }
    });

    it('should require profile number', () => {
      const input = {
        name: 'Test Profile',
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('number');
      }
    });

    it('should reject empty profile number', () => {
      const input = {
        number: '',
        name: 'Test Profile',
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should require profile name', () => {
      const input = {
        number: 'P001',
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should reject empty profile name', () => {
      const input = {
        number: 'P001',
        name: '',
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should enforce max length on number field (50)', () => {
      const input = {
        number: 'P'.repeat(51),
        name: 'Test Profile',
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should enforce max length on name field (255)', () => {
      const input = {
        number: 'P001',
        name: 'Test'.repeat(70), // Much longer than 255
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should enforce max length on articleNumber field (100)', () => {
      const input = {
        number: 'P001',
        name: 'Test Profile',
        articleNumber: 'ART'.repeat(40), // Much longer than 100
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should allow null description', () => {
      const input = {
        number: 'P001',
        name: 'Test Profile',
        description: null,
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow null articleNumber', () => {
      const input = {
        number: 'P001',
        name: 'Test Profile',
        articleNumber: null,
      };

      const result = createProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('updateProfileSchema', () => {
    it('should validate all optional fields', () => {
      const input = {
        name: 'Updated Name',
        description: 'Updated description',
        articleNumber: 'ART456',
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it('should validate partial update with only name', () => {
      const input = {
        name: 'Updated Name',
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated Name');
      }
    });

    it('should validate empty object', () => {
      const input = {};

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should enforce max length on name field (255)', () => {
      const input = {
        name: 'Test'.repeat(70),
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should allow null description', () => {
      const input = {
        description: null,
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow null articleNumber', () => {
      const input = {
        articleNumber: null,
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should enforce max length on articleNumber field (100)', () => {
      const input = {
        articleNumber: 'ART'.repeat(40),
      };

      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('profileParamsSchema', () => {
    it('should validate valid profile ID', () => {
      const input = {
        id: '123',
      };

      const result = profileParamsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('123');
      }
    });

    it('should keep ID as string', () => {
      const input = {
        id: '456',
      };

      const result = profileParamsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.id).toBe('string');
        expect(result.data.id).toBe('456');
      }
    });

    it('should reject missing ID', () => {
      const input = {};

      const result = profileParamsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric ID', () => {
      const input = {
        id: 'abc',
      };

      const result = profileParamsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative ID (with minus sign)', () => {
      const input = {
        id: '-1',
      };

      const result = profileParamsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept zero ID (as it passes regex)', () => {
      const input = {
        id: '0',
      };

      const result = profileParamsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('0');
      }
    });
  });

  describe('updateProfileOrderSchema', () => {
    it('should validate profile orders array', () => {
      const input = {
        profileOrders: [
          { id: 1, sortOrder: 1 },
          { id: 2, sortOrder: 2 },
          { id: 3, sortOrder: 3 },
        ],
      };

      const result = updateProfileOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.profileOrders).toHaveLength(3);
      }
    });

    it('should validate empty profile orders array', () => {
      const input = {
        profileOrders: [],
      };

      const result = updateProfileOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require profileOrders field', () => {
      const input = {};

      const result = updateProfileOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should require id and sortOrder in each order', () => {
      const input = {
        profileOrders: [{ id: 1 }],
      };

      const result = updateProfileOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should enforce numeric id and sortOrder', () => {
      const input = {
        profileOrders: [
          { id: 'one', sortOrder: 'first' },
        ],
      };

      const result = updateProfileOrderSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should handle single profile order', () => {
      const input = {
        profileOrders: [
          { id: 1, sortOrder: 1 },
        ],
      };

      const result = updateProfileOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.profileOrders).toHaveLength(1);
        expect(result.data.profileOrders[0].id).toBe(1);
        expect(result.data.profileOrders[0].sortOrder).toBe(1);
      }
    });

    it('should allow negative and zero sortOrder values', () => {
      const input = {
        profileOrders: [
          { id: 1, sortOrder: 0 },
          { id: 2, sortOrder: -1 },
        ],
      };

      const result = updateProfileOrderSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
