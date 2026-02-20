/**
 * PM2 Ecosystem Config - AKROBUD PRODUKCJA
 *
 * Konfiguracja dla uruchomienia aplikacji na serwerze Windows
 * Zarządza procesami API (backend) i Web (frontend)
 *
 * Użycie:
 *   pm2 start ecosystem.config.js
 *   pm2 restart all
 *   pm2 stop all
 *   pm2 logs
 */

module.exports = {
  apps: [
    // ═══════════════════════════════════════════════════════════
    // 🔧 BACKEND API (Fastify)
    // ═══════════════════════════════════════════════════════════
    {
      name: 'markbud-api',

      // Ścieżka do aplikacji
      cwd: './apps/api',
      script: 'start.js',

      // Tryb uruchomienia
      instances: 1,
      exec_mode: 'fork',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Logi
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Restart delay
      restart_delay: 4000,

      // Max restarts w ciągu 1 minuty (jeśli crashuje)
      max_restarts: 10,
      min_uptime: '10s',
    },

    // ═══════════════════════════════════════════════════════════
    // 🌐 FRONTEND WEB (Next.js)
    // ═══════════════════════════════════════════════════════════
    {
      name: 'markbud-web',

      // Ścieżka do aplikacji
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 5001',

      // Tryb uruchomienia
      instances: 1,
      exec_mode: 'fork',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },

      // Logi
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Auto restart
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Restart delay
      restart_delay: 4000,

      // Max restarts w ciągu 1 minuty (jeśli crashuje)
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],

  /**
   * Deployment configuration (opcjonalne - jeśli używasz pm2 deploy)
   */
  deploy: {
    production: {
      // Przykład - możesz dostosować do swoich potrzeb
      // user: 'administrator',
      // host: '192.168.1.50',
      // ref: 'origin/main',
      // repo: 'git@github.com:user/akrobud.git',
      // path: 'C:\\Apps\\akrobud',
      // 'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production'
    },
  },
};
