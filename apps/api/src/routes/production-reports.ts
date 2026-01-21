/**
 * Production Reports Routes
 * Raporty produkcyjne - miesięczne zestawienia zleceń z ilościami, RW i fakturami
 */

import type { FastifyPluginAsync } from 'fastify';
import { productionReportHandler } from '../handlers/productionReportHandler.js';
import { verifyAuth } from '../middleware/auth.js';

export const productionReportRoutes: FastifyPluginAsync = async (fastify) => {
  // UWAGA: Kolejność routes jest ważna!
  // Routes ze stałymi segmentami (np. /pdf, /summary) muszą być PRZED parametrycznymi

  // Eksport PDF raportu - wszyscy zalogowani (MUSI być przed /:year/:month)
  fastify.get<{
    Params: { year: string; month: string };
    Querystring: { eurRate?: string };
  }>('/:year/:month/pdf', {
    preHandler: verifyAuth,
  }, productionReportHandler.exportPdf);

  // Pobierz podsumowania (MUSI być przed /:year/:month)
  fastify.get<{
    Params: { year: string; month: string };
  }>('/:year/:month/summary', {
    preHandler: verifyAuth,
  }, productionReportHandler.getSummary);

  // Preview auto-fill FV - manager/admin/accountant (MUSI być przed /:year/:month)
  fastify.get<{
    Params: { year: string; month: string };
    Querystring: { sourceOrderId: string };
  }>('/:year/:month/invoice-auto-fill-preview', {
    preHandler: verifyAuth,
  }, productionReportHandler.getInvoiceAutoFillPreview);

  // Wykonaj auto-fill FV - manager/admin/accountant (MUSI być przed /:year/:month)
  fastify.post<{
    Params: { year: string; month: string };
    Body: { sourceOrderId: number; invoiceNumber: string; skipConflicts: boolean };
  }>('/:year/:month/invoice-auto-fill', {
    preHandler: verifyAuth,
  }, productionReportHandler.executeInvoiceAutoFill);

  // Pobierz raport dla miesiąca
  fastify.get<{
    Params: { year: string; month: string };
  }>('/:year/:month', {
    preHandler: verifyAuth,
  }, productionReportHandler.getReport);

  // Aktualizuj pozycję raportu (ilości, RW) - manager/admin
  fastify.put<{
    Params: { year: string; month: string; orderId: string };
  }>('/:year/:month/items/:orderId', {
    preHandler: verifyAuth,
  }, productionReportHandler.updateReportItem);

  // Aktualizuj dane FV - manager/admin/accountant
  fastify.put<{
    Params: { year: string; month: string; orderId: string };
  }>('/:year/:month/items/:orderId/invoice', {
    preHandler: verifyAuth,
  }, productionReportHandler.updateInvoice);

  // Aktualizuj nietypówki - manager/admin
  fastify.put<{
    Params: { year: string; month: string };
  }>('/:year/:month/atypical', {
    preHandler: verifyAuth,
  }, productionReportHandler.updateAtypical);

  // Zamknij miesiąc - manager/admin
  fastify.post<{
    Params: { year: string; month: string };
  }>('/:year/:month/close', {
    preHandler: verifyAuth,
  }, productionReportHandler.closeMonth);

  // Odblokuj miesiąc - manager/admin
  fastify.post<{
    Params: { year: string; month: string };
  }>('/:year/:month/reopen', {
    preHandler: verifyAuth,
  }, productionReportHandler.reopenMonth);
};
