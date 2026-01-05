/**
 * Color Test Fixtures
 *
 * Provides standard color data for testing.
 * These colors represent common RAL/custom colors for aluminum profiles.
 */

export const COLOR_FIXTURES = [
  {
    id: 1,
    code: '000', // Biały (3-cyfrowy format używany w CSV article numbers: RAL-9016 → 000)
    name: 'Biały',
    hexColor: '#F6F6F6',
    type: 'RAL' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 2,
    code: '016', // Antracyt (RAL-7016 → 016)
    name: 'Antracyt',
    hexColor: '#383E42',
    type: 'RAL' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 3,
    code: '017', // Brązowy (RAL-8017 → 017)
    name: 'Brązowy',
    hexColor: '#442F29',
    type: 'RAL' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 4,
    code: '006', // Srebrny (RAL-9006 → 006)
    name: 'Srebrny',
    hexColor: '#A1A1A0',
    type: 'RAL' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 5,
    code: '005', // Czarny (RAL-9005 → 005)
    name: 'Czarny',
    hexColor: '#0E0E10',
    type: 'RAL' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 6,
    code: '009', // Zielony (RAL-6009 → 009)
    name: 'Zielony',
    hexColor: '#27462C',
    type: 'RAL' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 7,
    code: 'C01', // Czerwony (RAL-3000 → C01 dla różnorodności)
    name: 'Czerwony',
    hexColor: '#A72920',
    type: 'RAL' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 8,
    code: 'C02', // Niebieski (RAL-5010 → C02)
    name: 'Niebieski',
    hexColor: '#004F7C',
    type: 'RAL' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 9,
    code: 'ZLO', // Złoty metalik (CUSTOM-01 → ZLO)
    name: 'Złoty metalik',
    hexColor: '#D4AF37',
    type: 'custom' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 10,
    code: 'GRA', // Grafit (CUSTOM-02 → GRA)
    name: 'Grafit',
    hexColor: '#4A4A4A',
    type: 'custom' as const,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
] as const;
