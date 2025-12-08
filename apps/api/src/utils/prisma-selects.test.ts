/**
 * Prisma Selects Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  profileBasicSelect,
  profileExtendedSelect,
  colorMinimalSelect,
  colorBasicSelect,
  colorExtendedSelect,
  orderBasicSelect,
  orderSummarySelect,
  deliveryBasicSelect,
  profileColorSelect,
  windowBasicSelect,
} from './prisma-selects.js';

describe('Prisma Selects', () => {
  describe('profileBasicSelect', () => {
    it('should have id, number, and name fields', () => {
      expect(profileBasicSelect).toEqual({
        id: true,
        number: true,
        name: true,
      });
    });
  });

  describe('profileExtendedSelect', () => {
    it('should include description in addition to basic fields', () => {
      expect(profileExtendedSelect).toEqual({
        id: true,
        number: true,
        name: true,
        description: true,
      });
    });
  });

  describe('colorMinimalSelect', () => {
    it('should have only id and code fields', () => {
      expect(colorMinimalSelect).toEqual({
        id: true,
        code: true,
      });
    });
  });

  describe('colorBasicSelect', () => {
    it('should have id, code, and name fields', () => {
      expect(colorBasicSelect).toEqual({
        id: true,
        code: true,
        name: true,
      });
    });
  });

  describe('colorExtendedSelect', () => {
    it('should include type and hexColor', () => {
      expect(colorExtendedSelect).toEqual({
        id: true,
        code: true,
        name: true,
        type: true,
        hexColor: true,
      });
    });
  });

  describe('orderBasicSelect', () => {
    it('should have id and orderNumber', () => {
      expect(orderBasicSelect).toEqual({
        id: true,
        orderNumber: true,
      });
    });
  });

  describe('orderSummarySelect', () => {
    it('should include status and values', () => {
      expect(orderSummarySelect).toEqual({
        id: true,
        orderNumber: true,
        status: true,
        valuePln: true,
        valueEur: true,
      });
    });
  });

  describe('deliveryBasicSelect', () => {
    it('should have core delivery fields', () => {
      expect(deliveryBasicSelect).toEqual({
        id: true,
        deliveryDate: true,
        deliveryNumber: true,
        status: true,
      });
    });
  });

  describe('profileColorSelect', () => {
    it('should compose profile and color selects', () => {
      expect(profileColorSelect).toEqual({
        profile: {
          select: profileBasicSelect,
        },
        color: {
          select: colorBasicSelect,
        },
      });
    });
  });

  describe('windowBasicSelect', () => {
    it('should have dimension and quantity fields', () => {
      expect(windowBasicSelect).toEqual({
        id: true,
        widthMm: true,
        heightMm: true,
        quantity: true,
      });
    });
  });
});
