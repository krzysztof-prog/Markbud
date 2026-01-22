import { describe, it, expect } from 'vitest';
import {
  plnToGrosze,
  groszeToPln,
  eurToCenty,
  centyToEur,
  convertEurToPlnGrosze,
  convertPlnToEurCenty,
  formatGrosze,
  formatCenty,
  validateMonetaryValue,
  sumMonetary,
  Grosze,
  Centy,
} from './money';

// =============================================================================
// plnToGrosze - Konwersja PLN na grosze
// =============================================================================
describe('plnToGrosze', () => {
  describe('happy path', () => {
    it('konwertuje 123.45 PLN na 12345 groszy', () => {
      expect(plnToGrosze(123.45)).toBe(12345);
    });

    it('konwertuje 0 PLN na 0 groszy', () => {
      expect(plnToGrosze(0)).toBe(0);
    });

    it('konwertuje 1 PLN na 100 groszy', () => {
      expect(plnToGrosze(1)).toBe(100);
    });

    it('konwertuje 0.01 PLN na 1 grosz', () => {
      expect(plnToGrosze(0.01)).toBe(1);
    });

    it('konwertuje 0.99 PLN na 99 groszy', () => {
      expect(plnToGrosze(0.99)).toBe(99);
    });

    it('konwertuje dużą kwotę 999999.99 PLN', () => {
      expect(plnToGrosze(999999.99)).toBe(99999999);
    });

    it('konwertuje całkowitą kwotę bez groszy', () => {
      expect(plnToGrosze(100)).toBe(10000);
    });
  });

  describe('edge cases - błędy', () => {
    it('rzuca błąd dla wartości z więcej niż 2 miejscami po przecinku', () => {
      expect(() => plnToGrosze(123.456)).toThrow(/too much precision/);
    });

    it('rzuca błąd dla wartości 0.001', () => {
      expect(() => plnToGrosze(0.001)).toThrow(/too much precision/);
    });

    it('rzuca błąd dla Infinity', () => {
      expect(() => plnToGrosze(Infinity)).toThrow(/finite number/);
    });

    it('rzuca błąd dla -Infinity', () => {
      expect(() => plnToGrosze(-Infinity)).toThrow(/finite number/);
    });

    it('rzuca błąd dla NaN', () => {
      expect(() => plnToGrosze(NaN)).toThrow(/finite number/);
    });
  });

  describe('wartości ujemne', () => {
    // Funkcja obecnie nie blokuje ujemnych wartości
    it('konwertuje -10.50 PLN na -1050 groszy', () => {
      expect(plnToGrosze(-10.5)).toBe(-1050);
    });
  });
});

// =============================================================================
// groszeToPln - Konwersja groszy na PLN
// =============================================================================
describe('groszeToPln', () => {
  describe('happy path', () => {
    it('konwertuje 12345 groszy na 123.45 PLN', () => {
      expect(groszeToPln(12345 as Grosze)).toBe(123.45);
    });

    it('konwertuje 0 groszy na 0 PLN', () => {
      expect(groszeToPln(0 as Grosze)).toBe(0);
    });

    it('konwertuje 1 grosz na 0.01 PLN', () => {
      expect(groszeToPln(1 as Grosze)).toBe(0.01);
    });

    it('konwertuje 100 groszy na 1 PLN', () => {
      expect(groszeToPln(100 as Grosze)).toBe(1);
    });

    it('konwertuje 99999999 groszy na 999999.99 PLN', () => {
      expect(groszeToPln(99999999 as Grosze)).toBe(999999.99);
    });
  });

  describe('edge cases - błędy', () => {
    it('rzuca błąd dla niecałkowitej liczby groszy', () => {
      expect(() => groszeToPln(123.5 as Grosze)).toThrow(/integer/);
    });

    it('rzuca błąd dla 0.1 grosza', () => {
      expect(() => groszeToPln(0.1 as Grosze)).toThrow(/integer/);
    });

    it('rzuca błąd dla Infinity', () => {
      expect(() => groszeToPln(Infinity as Grosze)).toThrow(/finite number/);
    });

    it('rzuca błąd dla NaN', () => {
      expect(() => groszeToPln(NaN as Grosze)).toThrow(/finite number/);
    });
  });

  describe('wartości ujemne', () => {
    it('konwertuje -1050 groszy na -10.50 PLN', () => {
      expect(groszeToPln(-1050 as Grosze)).toBe(-10.5);
    });
  });
});

// =============================================================================
// eurToCenty - Konwersja EUR na centy
// =============================================================================
describe('eurToCenty', () => {
  describe('happy path', () => {
    it('konwertuje 123.45 EUR na 12345 centów', () => {
      expect(eurToCenty(123.45)).toBe(12345);
    });

    it('konwertuje 0 EUR na 0 centów', () => {
      expect(eurToCenty(0)).toBe(0);
    });

    it('konwertuje 1 EUR na 100 centów', () => {
      expect(eurToCenty(1)).toBe(100);
    });

    it('konwertuje 0.01 EUR na 1 cent', () => {
      expect(eurToCenty(0.01)).toBe(1);
    });
  });

  describe('edge cases - błędy', () => {
    it('rzuca błąd dla wartości z więcej niż 2 miejscami po przecinku', () => {
      expect(() => eurToCenty(123.456)).toThrow(/too much precision/);
    });

    it('rzuca błąd dla Infinity', () => {
      expect(() => eurToCenty(Infinity)).toThrow(/finite number/);
    });

    it('rzuca błąd dla NaN', () => {
      expect(() => eurToCenty(NaN)).toThrow(/finite number/);
    });
  });
});

// =============================================================================
// centyToEur - Konwersja centów na EUR
// =============================================================================
describe('centyToEur', () => {
  describe('happy path', () => {
    it('konwertuje 12345 centów na 123.45 EUR', () => {
      expect(centyToEur(12345 as Centy)).toBe(123.45);
    });

    it('konwertuje 0 centów na 0 EUR', () => {
      expect(centyToEur(0 as Centy)).toBe(0);
    });

    it('konwertuje 1 cent na 0.01 EUR', () => {
      expect(centyToEur(1 as Centy)).toBe(0.01);
    });

    it('konwertuje 100 centów na 1 EUR', () => {
      expect(centyToEur(100 as Centy)).toBe(1);
    });
  });

  describe('edge cases - błędy', () => {
    it('rzuca błąd dla niecałkowitej liczby centów', () => {
      expect(() => centyToEur(123.5 as Centy)).toThrow(/integer/);
    });

    it('rzuca błąd dla Infinity', () => {
      expect(() => centyToEur(Infinity as Centy)).toThrow(/finite number/);
    });

    it('rzuca błąd dla NaN', () => {
      expect(() => centyToEur(NaN as Centy)).toThrow(/finite number/);
    });
  });
});

// =============================================================================
// convertEurToPlnGrosze - Wymiana walut EUR -> PLN
// =============================================================================
describe('convertEurToPlnGrosze', () => {
  describe('happy path', () => {
    // Kurs 4.50 PLN/EUR = 450 groszy za 100 centów
    it('przelicza 100 EUR (10000 centów) przy kursie 4.50', () => {
      // 10000 centów * 450 / 100 = 45000 groszy = 450 PLN
      expect(convertEurToPlnGrosze(10000 as Centy, 450)).toBe(45000);
    });

    it('przelicza 1 EUR (100 centów) przy kursie 4.50', () => {
      // 100 centów * 450 / 100 = 450 groszy = 4.50 PLN
      expect(convertEurToPlnGrosze(100 as Centy, 450)).toBe(450);
    });

    it('przelicza 0 EUR na 0 PLN', () => {
      expect(convertEurToPlnGrosze(0 as Centy, 450)).toBe(0);
    });

    it('przelicza przy kursie 1:1 (100 groszy)', () => {
      expect(convertEurToPlnGrosze(100 as Centy, 100)).toBe(100);
    });

    it('prawidłowo zaokrągla wynik', () => {
      // 33 centy * 450 / 100 = 148.5 → zaokrąglone do 149
      expect(convertEurToPlnGrosze(33 as Centy, 450)).toBe(149);
    });
  });

  describe('edge cases - błędy', () => {
    it('rzuca błąd dla niecałkowitej liczby centów', () => {
      expect(() => convertEurToPlnGrosze(100.5 as Centy, 450)).toThrow(/integers/);
    });

    it('rzuca błąd dla niecałkowitego kursu', () => {
      expect(() => convertEurToPlnGrosze(100 as Centy, 450.5)).toThrow(/integers/);
    });
  });
});

// =============================================================================
// convertPlnToEurCenty - Wymiana walut PLN -> EUR
// =============================================================================
describe('convertPlnToEurCenty', () => {
  describe('happy path', () => {
    // Kurs 4.50 PLN/EUR = 450 groszy za 100 centów
    it('przelicza 450 PLN (45000 groszy) przy kursie 4.50 na 100 EUR', () => {
      // 45000 groszy * 100 / 450 = 10000 centów = 100 EUR
      expect(convertPlnToEurCenty(45000 as Grosze, 450)).toBe(10000);
    });

    it('przelicza 4.50 PLN (450 groszy) przy kursie 4.50 na 1 EUR', () => {
      // 450 groszy * 100 / 450 = 100 centów = 1 EUR
      expect(convertPlnToEurCenty(450 as Grosze, 450)).toBe(100);
    });

    it('przelicza 0 PLN na 0 EUR', () => {
      expect(convertPlnToEurCenty(0 as Grosze, 450)).toBe(0);
    });

    it('prawidłowo zaokrągla wynik', () => {
      // 100 groszy * 100 / 450 = 22.22... → zaokrąglone do 22
      expect(convertPlnToEurCenty(100 as Grosze, 450)).toBe(22);
    });
  });

  describe('edge cases - błędy', () => {
    it('rzuca błąd dla kursu 0', () => {
      expect(() => convertPlnToEurCenty(100 as Grosze, 0)).toThrow(/cannot be zero/);
    });

    it('rzuca błąd dla niecałkowitej liczby groszy', () => {
      expect(() => convertPlnToEurCenty(100.5 as Grosze, 450)).toThrow(/integers/);
    });

    it('rzuca błąd dla niecałkowitego kursu', () => {
      expect(() => convertPlnToEurCenty(100 as Grosze, 450.5)).toThrow(/integers/);
    });
  });
});

// =============================================================================
// formatGrosze - Formatowanie wyświetlania PLN
// =============================================================================
describe('formatGrosze', () => {
  it('formatuje 12345 groszy jako "123,45 zł"', () => {
    const result = formatGrosze(12345 as Grosze);
    // Może być "123,45 zł" lub "123,45\u00a0zł" (z non-breaking space)
    expect(result).toMatch(/123,45.*zł/);
  });

  it('formatuje 0 groszy jako "0,00 zł"', () => {
    const result = formatGrosze(0 as Grosze);
    expect(result).toMatch(/0,00.*zł/);
  });

  it('formatuje 1 grosz jako "0,01 zł"', () => {
    const result = formatGrosze(1 as Grosze);
    expect(result).toMatch(/0,01.*zł/);
  });

  it('formatuje dużą kwotę z separatorami tysięcy', () => {
    const result = formatGrosze(123456789 as Grosze);
    // 1 234 567,89 zł
    expect(result).toMatch(/1.*234.*567,89.*zł/);
  });

  it('respektuje locale en-US', () => {
    const result = formatGrosze(12345 as Grosze, 'en-US');
    // W en-US może być "PLN 123.45" lub "zł123.45"
    expect(result).toContain('123.45');
  });
});

// =============================================================================
// formatCenty - Formatowanie wyświetlania EUR
// =============================================================================
describe('formatCenty', () => {
  it('formatuje 12345 centów jako "123,45 €"', () => {
    const result = formatCenty(12345 as Centy);
    expect(result).toMatch(/123,45.*€/);
  });

  it('formatuje 0 centów jako "0,00 €"', () => {
    const result = formatCenty(0 as Centy);
    expect(result).toMatch(/0,00.*€/);
  });

  it('formatuje 1 cent jako "0,01 €"', () => {
    const result = formatCenty(1 as Centy);
    expect(result).toMatch(/0,01.*€/);
  });
});

// =============================================================================
// validateMonetaryValue - Walidacja wartości
// =============================================================================
describe('validateMonetaryValue', () => {
  describe('prawidłowe wartości', () => {
    it('akceptuje 0', () => {
      expect(validateMonetaryValue(0)).toBe(true);
    });

    it('akceptuje dodatnią liczbę całkowitą', () => {
      expect(validateMonetaryValue(12345)).toBe(true);
    });

    it('akceptuje wartość równą max', () => {
      expect(validateMonetaryValue(1000, 1000)).toBe(true);
    });
  });

  describe('błędy walidacji', () => {
    it('rzuca błąd dla niecałkowitej wartości', () => {
      expect(() => validateMonetaryValue(123.45)).toThrow(/integer/);
    });

    it('rzuca błąd dla wartości ujemnej', () => {
      expect(() => validateMonetaryValue(-100)).toThrow(/negative/);
    });

    it('rzuca błąd dla wartości większej niż max', () => {
      expect(() => validateMonetaryValue(1001, 1000)).toThrow(/exceeds maximum/);
    });

    it('rzuca błąd dla Infinity', () => {
      expect(() => validateMonetaryValue(Infinity)).toThrow(/finite number/);
    });

    it('rzuca błąd dla NaN', () => {
      expect(() => validateMonetaryValue(NaN)).toThrow(/finite number/);
    });
  });
});

// =============================================================================
// sumMonetary - Bezpieczne sumowanie
// =============================================================================
describe('sumMonetary', () => {
  describe('happy path', () => {
    it('sumuje puste argumenty do 0', () => {
      expect(sumMonetary()).toBe(0);
    });

    it('sumuje pojedynczą wartość', () => {
      expect(sumMonetary(100)).toBe(100);
    });

    it('sumuje wiele wartości', () => {
      expect(sumMonetary(100, 200, 300)).toBe(600);
    });

    it('sumuje z zerami', () => {
      expect(sumMonetary(100, 0, 200, 0)).toBe(300);
    });

    it('sumuje wartości ujemne', () => {
      expect(sumMonetary(100, -50, 200)).toBe(250);
    });
  });

  describe('błędy', () => {
    it('rzuca błąd dla niecałkowitej wartości', () => {
      expect(() => sumMonetary(100, 200.5, 300)).toThrow(/not an integer/);
    });
  });
});

// =============================================================================
// Testy integracyjne - pełny flow
// =============================================================================
describe('integracja: pełny flow konwersji', () => {
  it('PLN -> grosze -> PLN zachowuje wartość', () => {
    const original = 123.45;
    const grosze = plnToGrosze(original);
    const result = groszeToPln(grosze);
    expect(result).toBe(original);
  });

  it('EUR -> centy -> EUR zachowuje wartość', () => {
    const original = 99.99;
    const centy = eurToCenty(original);
    const result = centyToEur(centy);
    expect(result).toBe(original);
  });

  it('EUR -> PLN -> EUR zachowuje wartość (przy stałym kursie)', () => {
    const eurCenty = 1000 as Centy; // 10 EUR
    const kurs = 450; // 4.50 PLN/EUR

    const plnGrosze = convertEurToPlnGrosze(eurCenty, kurs);
    const backToEur = convertPlnToEurCenty(plnGrosze, kurs);

    expect(backToEur).toBe(eurCenty);
  });

  it('sumowanie wielu kwot i formatowanie', () => {
    const kwoty = [
      plnToGrosze(100),
      plnToGrosze(50.5),
      plnToGrosze(25.25),
    ];

    const suma = sumMonetary(...kwoty);
    const formatted = formatGrosze(suma as Grosze);

    expect(suma).toBe(17575); // 175.75 PLN
    expect(formatted).toMatch(/175,75.*zł/);
  });
});

// =============================================================================
// Testy precyzji - floating point issues
// =============================================================================
describe('precyzja: unikanie błędów floating point', () => {
  it('0.1 + 0.2 w groszach = 30 (nie 0.30000000000000004)', () => {
    const a = plnToGrosze(0.1);
    const b = plnToGrosze(0.2);
    const sum = sumMonetary(a, b);
    expect(sum).toBe(30);
    expect(groszeToPln(sum as Grosze)).toBe(0.3);
  });

  it('duże wartości nie tracą precyzji', () => {
    const duza = plnToGrosze(9999999.99);
    expect(duza).toBe(999999999);
    expect(groszeToPln(duza)).toBe(9999999.99);
  });

  it('bardzo małe różnice są poprawnie obsługiwane', () => {
    const a = plnToGrosze(0.01);
    const b = plnToGrosze(0.01);
    expect(sumMonetary(a, b)).toBe(2);
  });
});
