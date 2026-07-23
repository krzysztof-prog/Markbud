/**
 * EmailService - Wysyłanie emaili przez Gmail SMTP
 *
 * Konfiguracja z tabeli Setting (te same dane co Gmail IMAP):
 * - gmail_email: adres nadawcy
 * - gmail_app_password: hasło aplikacji Google
 *
 * SMTP: smtp.gmail.com:465 (SSL)
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

// Te same klucze co w GmailFetcherService (IMAP)
const SMTP_SETTINGS_KEYS = {
  email: 'gmail_email',
  appPassword: 'gmail_app_password',
} as const;

interface SmtpConfig {
  email: string;
  appPassword: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private prisma: PrismaClient;
  private transporter: Transporter | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Pobierz konfigurację SMTP z tabeli Setting (te same dane co IMAP)
   */
  async getConfig(): Promise<SmtpConfig | null> {
    const settings = await this.prisma.setting.findMany({
      where: {
        key: { in: Object.values(SMTP_SETTINGS_KEYS) },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));
    const email = settingsMap.get(SMTP_SETTINGS_KEYS.email);
    const appPassword = settingsMap.get(SMTP_SETTINGS_KEYS.appPassword);

    if (!email || !appPassword) {
      return null;
    }

    return { email, appPassword };
  }

  /**
   * Utwórz lub reużyj transporter nodemailer
   */
  private async getTransporter(): Promise<Transporter | null> {
    if (this.transporter) {
      return this.transporter;
    }

    const config = await this.getConfig();
    if (!config) {
      logger.error('[EmailService] Brak konfiguracji SMTP (gmail_email / gmail_app_password)');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: config.email,
        pass: config.appPassword,
      },
    });

    return this.transporter;
  }

  /**
   * Resetuj transporter (np. gdy zmieniono dane logowania)
   */
  resetTransporter(): void {
    this.transporter = null;
  }

  /**
   * Wyślij email
   */
  async send(options: SendEmailOptions): Promise<SendResult> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      return { success: false, error: 'Brak konfiguracji SMTP (gmail_email/gmail_app_password)' };
    }

    const config = await this.getConfig();
    if (!config) {
      return { success: false, error: 'Brak konfiguracji SMTP' };
    }

    try {
      const info = await transporter.sendMail({
        from: `"MARKBUD System" <${config.email}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info(`[EmailService] Email wysłany: ${info.messageId} do ${options.to}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Nieznany błąd';
      logger.error('[EmailService] Błąd wysyłania emaila:', error);
      // Reset transportera przy błędzie (dane mogły się zmienić)
      this.transporter = null;
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Test połączenia SMTP
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      return { success: false, message: 'Brak konfiguracji SMTP' };
    }

    try {
      await transporter.verify();
      return { success: true, message: 'Połączenie SMTP OK' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Nieznany błąd';
      return { success: false, message: `Błąd połączenia SMTP: ${errorMsg}` };
    }
  }
}
