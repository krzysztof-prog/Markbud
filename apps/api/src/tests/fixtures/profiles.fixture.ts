/**
 * Profile Test Fixtures
 *
 * Provides standard profile data for testing.
 * These profiles represent common aluminum window profiles.
 */

export const PROFILE_FIXTURES = [
  {
    id: 1,
    number: '9016', // Ościeżnica 70mm (4-cyfrowy format używany w CSV)
    name: 'Ościeżnica 70mm',
    description: 'Ościeżnica 70mm',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 2,
    number: '8866', // Skrzydło ramowe
    name: 'Skrzydło ramowe',
    description: 'Skrzydło ramowe',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 3,
    number: '9315', // Próg aluminiowy
    name: 'Próg aluminiowy',
    description: 'Próg aluminiowy',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 4,
    number: '9671', // Słupek konstrukcyjny
    name: 'Słupek konstrukcyjny',
    description: 'Słupek konstrukcyjny',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 5,
    number: '2026', // Belka nośna
    name: 'Belka nośna',
    description: 'Belka nośna',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
] as const;
