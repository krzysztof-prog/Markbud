/**
 * Monthly Reports Routes
 */

import type { FastifyPluginAsync } from 'fastify';
import { MonthlyReportService } from '../services/monthlyReportService.js';
import { MonthlyReportExportService } from '../services/monthlyReportExportService.js';

export const monthlyReportsRoutes: FastifyPluginAsync = async (fastify) => {
  const monthlyReportService = new MonthlyReportService(fastify.prisma);
  const exportService = new MonthlyReportExportService();
  // GET /api/monthly-reports - Get all monthly reports
  fastify.get<{
    Querystring: {
      limit?: string;
    };
  }>('/', {
    schema: {
      description: 'Get all monthly reports',
      tags: ['monthly-reports'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', description: 'Number of reports to return (default: 12)' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              year: { type: 'number' },
              month: { type: 'number' },
              reportDate: { type: 'string' },
              totalOrders: { type: 'number' },
              totalWindows: { type: 'number' },
              totalSashes: { type: 'number' },
              totalValuePln: { type: 'number' },
              totalValueEur: { type: 'number' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
              _count: {
                type: 'object',
                properties: {
                  reportItems: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    let limit = 12;
    if (request.query.limit) {
      const parsedLimit = parseInt(request.query.limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        return reply.status(400).send({ error: 'Invalid limit parameter' });
      }
      limit = parsedLimit;
    }

    const reports = await monthlyReportService.getAllReports(limit);
    return reports;
  });

  // GET /api/monthly-reports/:year/:month - Get specific monthly report
  fastify.get<{
    Params: {
      year: string;
      month: string;
    };
  }>('/:year/:month', {
    schema: {
      description: 'Get monthly report for specific year and month',
      tags: ['monthly-reports'],
      params: {
        type: 'object',
        required: ['year', 'month'],
        properties: {
          year: { type: 'string', description: 'Year (YYYY)' },
          month: { type: 'string', description: 'Month (1-12)' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            year: { type: 'number' },
            month: { type: 'number' },
            reportDate: { type: 'string' },
            totalOrders: { type: 'number' },
            totalWindows: { type: 'number' },
            totalSashes: { type: 'number' },
            totalValuePln: { type: 'number' },
            totalValueEur: { type: 'number' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
            reportItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  orderNumber: { type: 'string' },
                  invoiceNumber: { type: ['string', 'null'] },
                  windowsCount: { type: 'number' },
                  sashesCount: { type: 'number' },
                  unitsCount: { type: 'number' },
                  valuePln: { type: ['number', 'null'] },
                  valueEur: { type: ['number', 'null'] },
                },
              },
            },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    const month = parseInt(request.params.month, 10);

    if (isNaN(year) || isNaN(month)) {
      return reply.status(400).send({ error: 'Invalid year or month' });
    }

    if (month < 1 || month > 12) {
      return reply.status(400).send({ error: 'Month must be between 1 and 12' });
    }

    if (year < 2000 || year > 2100) {
      return reply.status(400).send({ error: 'Year must be between 2000 and 2100' });
    }

    const report = await monthlyReportService.getReport(year, month);

    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    return report;
  });

  // POST /api/monthly-reports/:year/:month/generate - Generate monthly report
  fastify.post<{
    Params: {
      year: string;
      month: string;
    };
  }>('/:year/:month/generate', {
    schema: {
      description: 'Generate monthly report for specific year and month',
      tags: ['monthly-reports'],
      params: {
        type: 'object',
        required: ['year', 'month'],
        properties: {
          year: { type: 'string', description: 'Year (YYYY)' },
          month: { type: 'string', description: 'Month (1-12)' },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            reportId: { type: 'number' },
            year: { type: 'number' },
            month: { type: 'number' },
            totalOrders: { type: 'number' },
            totalWindows: { type: 'number' },
            totalSashes: { type: 'number' },
            totalValuePln: { type: 'number' },
            totalValueEur: { type: 'number' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  orderId: { type: 'number' },
                  orderNumber: { type: 'string' },
                  invoiceNumber: { type: ['string', 'null'] },
                  windowsCount: { type: 'number' },
                  sashesCount: { type: 'number' },
                  unitsCount: { type: 'number' },
                  valuePln: { type: ['number', 'null'] },
                  valueEur: { type: ['number', 'null'] },
                },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    const month = parseInt(request.params.month, 10);

    if (month < 1 || month > 12) {
      return reply.status(400).send({ error: 'Month must be between 1 and 12' });
    }

    try {
      const result = await monthlyReportService.generateAndSaveReport(year, month);
      return reply.status(201).send(result);
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // GET /api/monthly-reports/:year/:month/export/excel - Export to Excel
  fastify.get<{
    Params: {
      year: string;
      month: string;
    };
  }>('/:year/:month/export/excel', {
    schema: {
      description: 'Export monthly report to Excel',
      tags: ['monthly-reports'],
      params: {
        type: 'object',
        required: ['year', 'month'],
        properties: {
          year: { type: 'string', description: 'Year (YYYY)' },
          month: { type: 'string', description: 'Month (1-12)' },
        },
      },
      response: {
        200: {
          type: 'string',
          format: 'binary',
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    const month = parseInt(request.params.month, 10);

    if (month < 1 || month > 12) {
      return reply.status(400).send({ error: 'Month must be between 1 and 12' });
    }

    // Get or generate report
    let report = await monthlyReportService.getReport(year, month);

    if (!report) {
      // Generate report automatically
      const result = await monthlyReportService.generateAndSaveReport(year, month);
      report = await monthlyReportService.getReport(year, month);
    }

    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    // Prepare data for export
    const reportData = {
      year: report.year,
      month: report.month,
      totalOrders: report.totalOrders,
      totalWindows: report.totalWindows,
      totalSashes: report.totalSashes,
      totalValuePln: report.totalValuePln,
      totalValueEur: report.totalValueEur,
      items: report.reportItems.map((item) => ({
        orderId: item.orderId,
        orderNumber: item.orderNumber,
        invoiceNumber: item.invoiceNumber,
        windowsCount: item.windowsCount,
        sashesCount: item.sashesCount,
        unitsCount: item.unitsCount,
        valuePln: item.valuePln,
        valueEur: item.valueEur,
      })),
    };

    const buffer = await exportService.exportToExcel(reportData);
    const filename = exportService.getFilename(year, month, 'xlsx');

    reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);

    return reply.send(buffer);
  });

  // GET /api/monthly-reports/:year/:month/export/pdf - Export to PDF
  fastify.get<{
    Params: {
      year: string;
      month: string;
    };
  }>('/:year/:month/export/pdf', {
    schema: {
      description: 'Export monthly report to PDF',
      tags: ['monthly-reports'],
      params: {
        type: 'object',
        required: ['year', 'month'],
        properties: {
          year: { type: 'string', description: 'Year (YYYY)' },
          month: { type: 'string', description: 'Month (1-12)' },
        },
      },
      response: {
        200: {
          type: 'string',
          format: 'binary',
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    const month = parseInt(request.params.month, 10);

    if (month < 1 || month > 12) {
      return reply.status(400).send({ error: 'Month must be between 1 and 12' });
    }

    // Get or generate report
    let report = await monthlyReportService.getReport(year, month);

    if (!report) {
      // Generate report automatically
      await monthlyReportService.generateAndSaveReport(year, month);
      report = await monthlyReportService.getReport(year, month);
    }

    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    // Prepare data for export
    const reportData = {
      year: report.year,
      month: report.month,
      totalOrders: report.totalOrders,
      totalWindows: report.totalWindows,
      totalSashes: report.totalSashes,
      totalValuePln: report.totalValuePln,
      totalValueEur: report.totalValueEur,
      items: report.reportItems.map((item) => ({
        orderId: item.orderId,
        orderNumber: item.orderNumber,
        invoiceNumber: item.invoiceNumber,
        windowsCount: item.windowsCount,
        sashesCount: item.sashesCount,
        unitsCount: item.unitsCount,
        valuePln: item.valuePln,
        valueEur: item.valueEur,
      })),
    };

    const buffer = await exportService.exportToPdf(reportData);
    const filename = exportService.getFilename(year, month, 'pdf');

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);

    return reply.send(buffer);
  });

  // DELETE /api/monthly-reports/:year/:month - Delete monthly report
  fastify.delete<{
    Params: {
      year: string;
      month: string;
    };
  }>('/:year/:month', {
    schema: {
      description: 'Delete monthly report',
      tags: ['monthly-reports'],
      params: {
        type: 'object',
        required: ['year', 'month'],
        properties: {
          year: { type: 'string', description: 'Year (YYYY)' },
          month: { type: 'string', description: 'Month (1-12)' },
        },
      },
      response: {
        204: {
          type: 'null',
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const year = parseInt(request.params.year, 10);
    const month = parseInt(request.params.month, 10);

    if (month < 1 || month > 12) {
      return reply.status(400).send({ error: 'Month must be between 1 and 12' });
    }

    try {
      await monthlyReportService.deleteReport(year, month);
      return reply.status(204).send();
    } catch (error: unknown) {
      return reply.status(500).send({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
};
