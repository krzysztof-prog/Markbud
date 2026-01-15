/**
 * useProductionSelection Hook Tests
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProductionSelection } from './useProductionSelection';
import type { Delivery } from '@/types';

describe('useProductionSelection', () => {
  describe('initial state', () => {
    it('should start with empty selections', () => {
      const { result } = renderHook(() => useProductionSelection());

      expect(result.current.selectedOrderIds.size).toBe(0);
      expect(result.current.selectedDeliveryIds.size).toBe(0);
      expect(result.current.totalSelected).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe('handleOrderToggle', () => {
    it('should add order to selection when checked', () => {
      const { result } = renderHook(() => useProductionSelection());

      act(() => {
        result.current.handleOrderToggle(1, true);
      });

      expect(result.current.selectedOrderIds.has(1)).toBe(true);
      expect(result.current.totalSelected).toBe(1);
      expect(result.current.hasSelection).toBe(true);
    });

    it('should remove order from selection when unchecked', () => {
      const { result } = renderHook(() => useProductionSelection());

      act(() => {
        result.current.handleOrderToggle(1, true);
        result.current.handleOrderToggle(1, false);
      });

      expect(result.current.selectedOrderIds.has(1)).toBe(false);
      expect(result.current.totalSelected).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });

    it('should handle multiple order selections', () => {
      const { result } = renderHook(() => useProductionSelection());

      act(() => {
        result.current.handleOrderToggle(1, true);
        result.current.handleOrderToggle(2, true);
        result.current.handleOrderToggle(3, true);
      });

      expect(result.current.selectedOrderIds.size).toBe(3);
      expect(result.current.selectedOrderIds.has(1)).toBe(true);
      expect(result.current.selectedOrderIds.has(2)).toBe(true);
      expect(result.current.selectedOrderIds.has(3)).toBe(true);
    });
  });

  describe('handleDeliveryToggle', () => {
    const mockDelivery: Delivery = {
      id: 1,
      deliveryNumber: 'D001',
      deliveryDate: '2026-01-15',
      notes: null,
      status: 'planned',
      deliveryOrders: [
        { order: { id: 10, orderNumber: 'ORD-10' } },
        { order: { id: 20, orderNumber: 'ORD-20' } },
        { order: { id: 30, orderNumber: 'ORD-30' } },
      ],
    };

    it('should add delivery to selection when checked', () => {
      const { result } = renderHook(() => useProductionSelection());

      act(() => {
        result.current.handleDeliveryToggle(1, true);
      });

      expect(result.current.selectedDeliveryIds.has(1)).toBe(true);
    });

    it('should also select all orders in delivery', () => {
      const { result } = renderHook(() => useProductionSelection());

      act(() => {
        result.current.handleDeliveryToggle(1, true, mockDelivery);
      });

      expect(result.current.selectedDeliveryIds.has(1)).toBe(true);
      expect(result.current.selectedOrderIds.has(10)).toBe(true);
      expect(result.current.selectedOrderIds.has(20)).toBe(true);
      expect(result.current.selectedOrderIds.has(30)).toBe(true);
    });

    it('should remove delivery and all its orders when unchecked', () => {
      const { result } = renderHook(() => useProductionSelection());

      act(() => {
        result.current.handleDeliveryToggle(1, true, mockDelivery);
        result.current.handleDeliveryToggle(1, false, mockDelivery);
      });

      expect(result.current.selectedDeliveryIds.has(1)).toBe(false);
      expect(result.current.selectedOrderIds.has(10)).toBe(false);
      expect(result.current.selectedOrderIds.has(20)).toBe(false);
      expect(result.current.selectedOrderIds.has(30)).toBe(false);
    });

    it('should handle delivery without delivery orders', () => {
      const { result } = renderHook(() => useProductionSelection());

      act(() => {
        result.current.handleDeliveryToggle(1, true);
      });

      expect(result.current.selectedDeliveryIds.has(1)).toBe(true);
      expect(result.current.selectedOrderIds.size).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() => useProductionSelection());

      act(() => {
        result.current.handleOrderToggle(1, true);
        result.current.handleOrderToggle(2, true);
        result.current.handleDeliveryToggle(10, true);
      });

      expect(result.current.hasSelection).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.selectedOrderIds.size).toBe(0);
      expect(result.current.selectedDeliveryIds.size).toBe(0);
      expect(result.current.totalSelected).toBe(0);
      expect(result.current.hasSelection).toBe(false);
    });
  });

  describe('totalSelected', () => {
    it('should count both orders and deliveries', () => {
      const { result } = renderHook(() => useProductionSelection());

      act(() => {
        result.current.handleOrderToggle(1, true);
        result.current.handleOrderToggle(2, true);
        result.current.handleDeliveryToggle(10, true);
      });

      // 2 orders + 1 delivery = 3
      expect(result.current.totalSelected).toBe(3);
    });
  });
});
