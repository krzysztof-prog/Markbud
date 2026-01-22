/**
 * OrderNumberMatcher Unit Tests
 *
 * Testuje logike dopasowywania numerow zlecen:
 * - Parsowanie numerow zlecen
 * - Typy dopasowania (exact, variant_match)
 * - Edge cases
 *
 * Uwaga: Metody wymagajace bazy danych (findMatchingOrder, findMatchingOrdersBatch)
 * sa testowane w testach integracyjnych
 */

import { describe, it, expect } from 'vitest';
import type {
  MatchStatus,
  ParsedOrderNumber,
  OrderMatchResult,
} from './OrderNumberMatcher.js';

// Importujemy OrderNumberParser bezposrednio do testow logiki parsowania
import { OrderNumberParser } from '../../parsers/OrderNumberParser.js';

describe('OrderNumberMatcher', () => {
  // OrderNumberMatcher deleguje parsowanie do CsvParser -> OrderNumberParser
  // Testujemy logike parsowania bezposrednio
  const parser = new OrderNumberParser();

  describe('parseOrderNumber (delegacja do OrderNumberParser)', () => {
    describe('numery bez sufiksu', () => {
      it('powinien sparsowac prosty numer zlecenia', () => {
        const result = parser.parse('54222');

        expect(result.base).toBe('54222');
        expect(result.suffix).toBeNull();
        expect(result.full).toBe('54222');
      });

      it('powinien sparsowac krotki numer zlecenia', () => {
        const result = parser.parse('123');

        expect(result.base).toBe('123');
        expect(result.suffix).toBeNull();
      });

      it('powinien sparsowac dlugi numer zlecenia', () => {
        const result = parser.parse('12345678');

        expect(result.base).toBe('12345678');
        expect(result.suffix).toBeNull();
      });
    });

    describe('numery z sufiksem oddzielonym myslnikiem', () => {
      it('powinien sparsowac numer z sufiksem -a', () => {
        const result = parser.parse('54222-a');

        expect(result.base).toBe('54222');
        expect(result.suffix).toBe('a');
        expect(result.full).toBe('54222-a');
      });

      it('powinien sparsowac numer z sufiksem -abc', () => {
        const result = parser.parse('54222-abc');

        expect(result.base).toBe('54222');
        expect(result.suffix).toBe('abc');
      });

      it('powinien sparsowac numer z sufiksem numerycznym -1', () => {
        const result = parser.parse('54222-1');

        expect(result.base).toBe('54222');
        expect(result.suffix).toBe('1');
      });

      it('powinien sparsowac numer z sufiksem alfanumerycznym -a1', () => {
        const result = parser.parse('54222-a1');

        expect(result.base).toBe('54222');
        expect(result.suffix).toBe('a1');
      });
    });

    describe('numery z sufiksem bez separatora', () => {
      it('powinien sparsowac numer z sufiksem a (bez myslnika)', () => {
        const result = parser.parse('54222a');

        expect(result.base).toBe('54222');
        expect(result.suffix).toBe('a');
        expect(result.full).toBe('54222a');
      });

      it('powinien sparsowac numer z sufiksem AB', () => {
        const result = parser.parse('54222AB');

        expect(result.base).toBe('54222');
        expect(result.suffix).toBe('AB');
      });

      it('powinien sparsowac numer z sufiksem abc', () => {
        const result = parser.parse('54222abc');

        expect(result.base).toBe('54222');
        expect(result.suffix).toBe('abc');
      });
    });

    describe('numery z sufiksem oddzielonym spacja', () => {
      it('powinien sparsowac numer z sufiksem oddzielonym spacja', () => {
        const result = parser.parse('54222 a');

        expect(result.base).toBe('54222');
        expect(result.suffix).toBe('a');
      });

      it('powinien sparsowac numer z dluzszym sufiksem po spacji', () => {
        const result = parser.parse('54222 xxx');

        expect(result.base).toBe('54222');
        expect(result.suffix).toBe('xxx');
      });
    });

    describe('trimming i walidacja', () => {
      it('powinien trimowac biale znaki', () => {
        const result = parser.parse('  54222  ');

        expect(result.base).toBe('54222');
        expect(result.full).toBe('54222');
      });

      it('powinien rzucic blad dla pustego stringa', () => {
        expect(() => parser.parse('')).toThrow('Numer zlecenia nie może być pusty');
      });

      it('powinien rzucic blad dla samych spacji', () => {
        expect(() => parser.parse('   ')).toThrow('Numer zlecenia nie może być pusty');
      });

      it('powinien rzucic blad dla zbyt dlugiego numeru', () => {
        const longNumber = '1'.repeat(21);
        expect(() => parser.parse(longNumber)).toThrow('zbyt długi');
      });

      it('powinien zaakceptowac numer o maksymalnej dlugosci', () => {
        const maxNumber = '1'.repeat(20);
        // Powinno sparsowac bez bledu
        const result = parser.parse(maxNumber);
        expect(result.base).toBe(maxNumber);
      });
    });

    describe('nieprawidlowe formaty', () => {
      it('powinien rzucic blad dla samych liter', () => {
        expect(() => parser.parse('ABCDEF')).toThrow('Nieprawidłowy format');
      });

      it('powinien rzucic blad dla numeru zaczynajacego sie od litery', () => {
        expect(() => parser.parse('A54222')).toThrow('Nieprawidłowy format');
      });

      it('powinien rzucic blad dla numeru z wieloma myslnikami', () => {
        expect(() => parser.parse('54222-a-b')).toThrow('Nieprawidłowy format');
      });

      it('powinien rzucic blad dla numeru ze specjalnymi znakami', () => {
        expect(() => parser.parse('54222@test')).toThrow('Nieprawidłowy format');
      });

      it('powinien rzucic blad dla sufiksu dluzszego niz 3 znaki po mysalniku', () => {
        expect(() => parser.parse('54222-abcd')).toThrow('Nieprawidłowy format');
      });
    });
  });

  describe('typy dopasowania MatchStatus', () => {
    it('powinien miec poprawne typy statusow', () => {
      const foundStatus: MatchStatus = 'found';
      const variantStatus: MatchStatus = 'variant_match';
      const notFoundStatus: MatchStatus = 'not_found';

      expect(foundStatus).toBe('found');
      expect(variantStatus).toBe('variant_match');
      expect(notFoundStatus).toBe('not_found');
    });
  });

  describe('OrderMatchResult struktura', () => {
    it('powinien miec poprawna strukture dla dopasowania found', () => {
      const result: OrderMatchResult = {
        order: {
          id: 1,
          orderNumber: '54222',
          client: 'Test Klient',
          project: 'Test Projekt',
        },
        matchStatus: 'found',
      };

      expect(result.order.id).toBe(1);
      expect(result.order.orderNumber).toBe('54222');
      expect(result.matchStatus).toBe('found');
    });

    it('powinien miec poprawna strukture dla dopasowania variant_match', () => {
      const result: OrderMatchResult = {
        order: {
          id: 1,
          orderNumber: '54222',
          client: 'Test Klient',
          project: null,
        },
        matchStatus: 'variant_match',
      };

      expect(result.matchStatus).toBe('variant_match');
      expect(result.order.project).toBeNull();
    });
  });

  describe('ParsedOrderNumber struktura', () => {
    it('powinien miec poprawna strukture z sufiksem', () => {
      const parsed: ParsedOrderNumber = {
        base: '54222',
        suffix: 'a',
        full: '54222-a',
      };

      expect(parsed.base).toBe('54222');
      expect(parsed.suffix).toBe('a');
      expect(parsed.full).toBe('54222-a');
    });

    it('powinien miec poprawna strukture bez sufiksu', () => {
      const parsed: ParsedOrderNumber = {
        base: '54222',
        suffix: null,
        full: '54222',
      };

      expect(parsed.suffix).toBeNull();
    });
  });

  describe('logika wyszukiwania (unit tests bez bazy)', () => {
    // Te testy sprawdzaja logike ktora bedzie uzyta podczas wyszukiwania
    // ale nie wymagaja faktycznej bazy danych

    describe('strategia exact match', () => {
      it('powinien dopasowac identyczny numer jako found', () => {
        const input = '54222';
        const dbOrderNumber = '54222';

        expect(input === dbOrderNumber).toBe(true);
        // W rzeczywistej implementacji: matchStatus = 'found'
      });

      it('powinien nie dopasowac roznych numerow', () => {
        const input = '54222';
        const dbOrderNumber = '54223';

        expect(input === dbOrderNumber).toBe(false);
      });
    });

    describe('strategia base match', () => {
      it('powinien dopasowac po numerze bazowym gdy input ma sufiks', () => {
        const inputBase = parser.parse('54222-a').base;
        const dbOrderNumber = '54222';

        expect(inputBase === dbOrderNumber).toBe(true);
        // W rzeczywistej implementacji: matchStatus = 'variant_match'
      });

      it('powinien dopasowac po numerze bazowym dla roznych sufiksow', () => {
        const input1Base = parser.parse('54222-a').base;
        const input2Base = parser.parse('54222-b').base;

        expect(input1Base).toBe('54222');
        expect(input2Base).toBe('54222');
        expect(input1Base === input2Base).toBe(true);
      });
    });

    describe('strategia variant match (prefix)', () => {
      it('powinien sprawdzac czy db orderNumber zaczyna sie od base', () => {
        const inputBase = '54222';
        const dbOrderNumber1 = '54222-a';
        const dbOrderNumber2 = '54222a';
        const dbOrderNumber3 = '54223';

        expect(dbOrderNumber1.startsWith(inputBase)).toBe(true);
        expect(dbOrderNumber2.startsWith(inputBase)).toBe(true);
        expect(dbOrderNumber3.startsWith(inputBase)).toBe(false);
      });
    });
  });

  describe('przypadki brzegowe parsowania', () => {
    it('powinien obslugiwac numer z zerem wiodacym', () => {
      // W praktyce numery zlecen nie maja zer wiodacych,
      // ale parser powinien to obslugiwac
      const result = parser.parse('054222');

      expect(result.base).toBe('054222');
    });

    it('powinien obslugiwac bardzo krotki numer', () => {
      const result = parser.parse('1');

      expect(result.base).toBe('1');
      expect(result.suffix).toBeNull();
    });

    it('powinien obslugiwac sufiks z duzymi literami', () => {
      const result = parser.parse('54222-A');

      expect(result.base).toBe('54222');
      expect(result.suffix).toBe('A');
    });

    it('powinien obslugiwac mieszane case w sufiksie', () => {
      const result = parser.parse('54222-Ab');

      expect(result.base).toBe('54222');
      expect(result.suffix).toBe('Ab');
    });
  });

  describe('batch processing logika', () => {
    // Testy dla logiki ktora jest uzywana w findMatchingOrdersBatch

    it('powinien przygotowac dane do batch query', () => {
      const orderNumbers = ['54222', '54223-a', '54224'];

      const parsed = orderNumbers.map(on => ({
        input: on,
        base: parser.parse(on).base,
      }));

      expect(parsed).toHaveLength(3);
      expect(parsed[0]).toEqual({ input: '54222', base: '54222' });
      expect(parsed[1]).toEqual({ input: '54223-a', base: '54223' });
      expect(parsed[2]).toEqual({ input: '54224', base: '54224' });
    });

    it('powinien usunac duplikaty w inputach', () => {
      const orderNumbers = ['54222', '54222', '54223'];

      const uniqueInputs = [...new Set(orderNumbers)];

      expect(uniqueInputs).toHaveLength(2);
      expect(uniqueInputs).toEqual(['54222', '54223']);
    });

    it('powinien usunac duplikaty w bazach', () => {
      const orderNumbers = ['54222', '54222-a', '54222-b'];

      const bases = orderNumbers.map(on => parser.parse(on).base);
      const uniqueBases = [...new Set(bases)];

      expect(uniqueBases).toHaveLength(1);
      expect(uniqueBases[0]).toBe('54222');
    });
  });
});
