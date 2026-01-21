# Plan Naprawy i Monitorowanie

**Data utworzenia:** 2025-12-01
**Ostatnia aktualizacja:** 2026-01-20

---

## Plan Naprawy w Fazach

### FAZA 1: KRYTYCZNE (Natychmiast - dzisiaj/jutro)

| # | Problem | Status |
|---|---------|--------|
| 1 | Usunac hardcoded credentials | Do naprawy |
| 2 | Dodac autentykacje JWT do wszystkich endpoints | Do naprawy |
| 3 | Naprawic path traversal w imports | Do naprawy |
| 4 | Dodac walidacje plikow na backendzie | Do naprawy |
| 5 | Opakowac wszystkie krytyczne operacje w transakcje | Do naprawy |

### FAZA 2: WYSOKIE (Ten tydzien)

| # | Problem | Status |
|---|---------|--------|
| 6 | Dodac SQL injection protection | Do naprawy |
| 7 | Dodac paginacje do wszystkich list | Do naprawy |
| 8 | Naprawic memory leak w Puppeteer | Do naprawy |
| 9 | Dodac Zod validation do wszystkich endpoints | Do naprawy |
| 10 | Poprawic error handling | Do naprawy |
| 11 | Dodac indeksy w bazie | Do naprawy |
| 12 | Naprawic hardcoded selectors w scraperze | Do naprawy |
| 13 | Dodac rate limiting | Do naprawy |
| 14 | Dodac CSRF protection | Do naprawy |

### FAZA 3: SREDNIE (Ten miesiac)

| # | Problem | Status |
|---|---------|--------|
| 15 | Skonfigurowac connection pooling | Do naprawy |
| 16 | Dodac timeouts do fetch | Do naprawy |
| 17 | Dodac retry logic | Do naprawy |
| 18 | Implementowac cleanup starych plikow | Do naprawy |
| 19 | Poprawic kodowanie CSV | Do naprawy |
| 20 | Dodac security headers (Helmet) | Do naprawy |
| 21 | Dodac audit log | Do naprawy |
| 22 | Naprawic rate limiting w scraperze | Do naprawy |

### FAZA 4: DLUGOTERMINOWE (Q1 2026)

| # | Problem | Status |
|---|---------|--------|
| 23 | Zaplanowac migracje do PostgreSQL | Do zaplanowania |
| 24 | Implementowac WebSocket progress tracking | Do naprawy |
| 25 | Dodac chunked upload | Do naprawy |
| 26 | Implementowac CAPTCHA handling | Do naprawy |

---

## Monitorowanie i Utrzymanie

### Zalecane narzedzia

1. **Sentry** - Error tracking i monitoring
2. **PM2** - Process management w produkcji
3. **Winston/Pino** - Structured logging
4. **Prometheus + Grafana** - Metryki i dashboardy
5. **Snyk** - Security scanning dependencies
6. **ESLint + Prettier** - Code quality

### Code Review Checklist

Przed kazdym merge sprawdz:

- [ ] Wszystkie nowe endpointy maja autentykacje
- [ ] Wszystkie dane wejsciowe sa walidowane przez Zod
- [ ] Krytyczne operacje sa w transakcjach
- [ ] Nie ma hardcoded credentials
- [ ] Sa testy dla nowej funkcjonalnosci
- [ ] Error handling jest prawidlowy
- [ ] Nie ma SQL injection vectors
- [ ] Path traversal jest niemozliwy

---

## Security Testing Checklist

### Przed deployment

- [ ] Skanowanie zaleznosci (npm audit / Snyk)
- [ ] Testy penetracyjne na staging
- [ ] Przeglad kodu pod katem OWASP Top 10
- [ ] Weryfikacja konfiguracji produkcyjnej

### Po deployment

- [ ] Monitoring logow (bledy, podejrzane aktywnosci)
- [ ] Alerty na nieautoryzowany dostep
- [ ] Regularne skanowanie podatnosci
- [ ] Backup bazy danych

---

## Kontakt

W razie pytan lub watpliwosci dotyczacych ktorgokolwiek z problemow, prosze o kontakt przed rozpoczeciem naprawy.

---

## Historia zmian

| Data | Opis |
|------|------|
| 2025-12-01 | Utworzenie raportu |
| 2026-01-20 | Podzial na mniejsze dokumenty |

---

[Powrot do indeksu](./README.md) | [Poprzedni: Niskie problemy](./05-low-priority.md)
