/**
 * Profile Test Fixtures
 *
 * Provides standard profile data for testing.
 * These profiles represent common aluminum window profiles.
 */

export const PROFILE_FIXTURES = [
  {
    id: 1,
    number: 'ART-123',
    name: 'Ościeżnica 70mm',
    description: 'Ościeżnica 70mm',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 2,
    number: 'ART-456',
    name: 'Skrzydło ramowe',
    description: 'Skrzydło ramowe',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 3,
    number: 'ART-789',
    name: 'Próg aluminiowy',
    description: 'Próg aluminiowy',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 4,
    number: 'ART-101',
    name: 'Słupek konstrukcyjny',
    description: 'Słupek konstrukcyjny',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 5,
    number: 'ART-102',
    name: 'Belka nośna',
    description: 'Belka nośna',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
] as const;
