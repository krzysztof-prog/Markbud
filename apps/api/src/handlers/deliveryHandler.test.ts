/**
 * DeliveryHandler Unit Tests
 * Testing getProtocolPdf method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeliveryHandler } from './deliveryHandler.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

interface MockDeliveryService {
  getProtocolData: ReturnType<typeof vi.fn>;
}

interface MockDeliveryProtocolService {
  generatePdf: ReturnType<typeof vi.fn>;
  generateFilename: ReturnType<typeof vi.fn>;
}

describe('DeliveryHandler', () => {
  let handler: DeliveryHandler;
  let mockService: MockDeliveryService;
  let mockProtocolService: MockDeliveryProtocolService;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    // Mock DeliveryService
    mockService = {
      getProtocolData: vi.fn(),
    };

    // Mock DeliveryProtocolService
    mockProtocolService = {
      generatePdf: vi.fn(),
      generateFilename: vi.fn(),
    };

    // Mock Fastify Request
    mockRequest = {
      params: { id: '1' },
    };

    // Mock Fastify Reply
    const replyHeaders: Record<string, string> = {};
    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      header: vi.fn((key: string, value: string) => {
        replyHeaders[key] = value;
        return mockReply;
      }),
    } as Partial<FastifyReply>;

    handler = new DeliveryHandler(mockService, mockProtocolService);
  });

  describe('getProtocolPdf', () => {
    it('should return PDF with correct headers', async () => {
      const mockProtocolData = {
        deliveryId: 1,
        deliveryDate: new Date('2024-01-15'),
        deliveryNumber: 'D-2024-001',
        orders: [],
        totalWindows: 10,
        totalSashes: 20,
        totalGlasses: 30,
        totalPallets: 2,
        totalValue: 5000,
        generatedAt: new Date(),
      };
      const mockPdfBuffer = Buffer.from('mock-pdf-content');

      mockService.getProtocolData.mockResolvedValue(mockProtocolData);
      mockProtocolService.generatePdf.mockResolvedValue(mockPdfBuffer);
      mockProtocolService.generateFilename.mockReturnValue('protokol_dostawy_1_2024-01-15.pdf');

      await handler.getProtocolPdf(
        mockRequest as FastifyRequest<{ Params: { id: string } }>,
        mockReply as FastifyReply
      );

      // Verify service calls
      expect(mockService.getProtocolData).toHaveBeenCalledWith(1);
      expect(mockProtocolService.generatePdf).toHaveBeenCalledWith(mockProtocolData);
      expect(mockProtocolService.generateFilename).toHaveBeenCalledWith(1);

      // Verify headers
      expect(mockReply.header).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="protokol_dostawy_1_2024-01-15.pdf"'
      );

      // Verify response
      expect(mockReply.send).toHaveBeenCalledWith(mockPdfBuffer);
    });

    it('should throw ZodError for non-numeric delivery ID', async () => {
      mockRequest.params = { id: 'abc' }; // Non-numeric - fails Zod regex

      await expect(
        handler.getProtocolPdf(
          mockRequest as FastifyRequest<{ Params: { id: string } }>,
          mockReply as FastifyReply
        )
      ).rejects.toThrow(); // Zod throws error for invalid format

      expect(mockService.getProtocolData).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      mockService.getProtocolData.mockRejectedValue(new Error('Database error'));

      await expect(
        handler.getProtocolPdf(
          mockRequest as FastifyRequest<{ Params: { id: string } }>,
          mockReply as FastifyReply
        )
      ).rejects.toThrow('Database error');
    });

    it('should handle PDF generation errors', async () => {
      const mockProtocolData = {
        deliveryId: 1,
        deliveryDate: new Date(),
        deliveryNumber: 'D-2024-001',
        orders: [],
        totalWindows: 0,
        totalSashes: 0,
        totalGlasses: 0,
        totalPallets: 0,
        totalValue: 0,
        generatedAt: new Date(),
      };

      mockService.getProtocolData.mockResolvedValue(mockProtocolData);
      mockProtocolService.generatePdf.mockRejectedValue(new Error('PDF generation failed'));

      await expect(
        handler.getProtocolPdf(
          mockRequest as FastifyRequest<{ Params: { id: string } }>,
          mockReply as FastifyReply
        )
      ).rejects.toThrow('PDF generation failed');
    });
  });
});
