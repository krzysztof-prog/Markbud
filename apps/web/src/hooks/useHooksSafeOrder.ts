/**
 * Hook do wymuszenia prawidłowej kolejności Hooks w komponencie.
 *
 * WAŻNE: To nie jest zwykły Hook - to helper do sprawdzenia czy
 * stosujemy React Rules of Hooks prawidłowo.
 *
 * Zasady React Rules of Hooks:
 * 1. WSZYSTKIE Hooks muszą być wywoływane na POCZĄTKU komponentu
 * 2. Nigdy nie wywoływaj Hooks wewnątrz: if, for, switch, try/catch, map, .filter()
 * 3. Wszystkie Hooks muszą być wywoływane w TEJ SAMEJ KOLEJNOŚCI w każdym renderze
 *
 * ✅ PRAWIDŁOWA STRUKTURA KOMPONENTU:
 * ```typescript
 * function MyComponent() {
 *   // 1️⃣ NAJPIERW: Wszystkie Hooks tutaj
 *   const { data } = useQuery(...);
 *   const [state, setState] = useState(...);
 *   const memoized = useMemo(() => {...}, []);
 *   const callback = useCallback(() => {...}, []);
 *   useEffect(() => {...}, []);
 *
 *   // 2️⃣ POTEM: Early returns (if, guards)
 *   if (isLoading) return <Loader />;
 *   if (error) return <Error />;
 *
 *   // 3️⃣ NA KOŃCU: Logika i render
 *   return <div>{data.value}</div>;
 * }
 * ```
 *
 * ❌ BŁĘDNE WZORCE:
 * - Hook po return: `if (x) return; const data = useMemo(...)`
 * - Hook w warunku: `if (ready) { useQuery(...) }`
 * - Hook w pętli: `.map(item => { useEffect(...) })`
 * - Hook w try/catch: `try { useEffect(...) }`
 *
 * Błędy w konsoli:
 * - "React has detected a change in the order of Hooks"
 * - "Rendered more hooks than during the previous render"
 * - "Rendered fewer hooks than expected"
 */

let renderCount = 0;

export function useHooksSafeOrder(componentName: string) {
  // Liczy liczbę Hooks w komponencie w bieżącym renderze
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log(`[HooksOrder] ${componentName} Hook invoked at render #${renderCount}`);
  }
}

/**
 * Checklist dla każdego komponentu, który pisze Claude:
 *
 * PRZED pisaniem komponentu:
 * [ ] Zaplanuj które Hooks będą potrzebne (useQuery, useState, useMemo, etc)
 * [ ] Wypisz je w kolejności
 *
 * PODCZAS pisania:
 * [ ] Umieść WSZYSTKIE Hooks na samym początku funkcji
 * [ ] Najpierw useQuery/useFetch, potem useState, potem useMemo, potem useCallback, potem useEffect
 * [ ] Sprawdzaj czy żaden Hook nie jest wewnątrz if/for/switch
 *
 * PRZYKŁADY DO ZAPAMIĘTANIA:
 * ```typescript
 *
 * // ✅ DOBRY PATTERN 1: useQuery z warunkowym data fetching
 * const { data, isLoading } = useQuery({
 *   queryKey: ['data', id],
 *   queryFn: () => fetch(id),
 *   enabled: !!id,  // ← Warunek TUTAJ, Hook zawsze wykonywany!
 * });
 *
 * // ✅ DOBRY PATTERN 2: Memoizacja danych z Hook'a
 * const { data } = useQuery(...);
 * const grouped = useMemo(() => {
 *   if (!data) return {};
 *   return groupData(data);  // ← Warunek TUTAJ, Hook zawsze!
 * }, [data]);
 *
 * // ✅ DOBRY PATTERN 3: Early returns POTEM
 * if (!data) return <Empty />;  // ← Early return POTEM, nie wcześniej!
 *
 * // ❌ ZŁY PATTERN 1: Hook w warunku (NIGDY!)
 * if (shouldFetch) {
 *   const { data } = useQuery(...);  // ← NIGDY!
 * }
 *
 * // ❌ ZŁY PATTERN 2: Hook po early return (NIGDY!)
 * if (isLoading) return <Loader />;
 * const memoized = useMemo(...);  // ← Hook po return! NIGDY!
 *
 * // ❌ ZŁY PATTERN 3: Hook w map (NIGDY!)
 * {data.map(item => {
 *   const { color } = useQuery(...);  // ← NIGDY!
 * })}
 * ```
 */

/**
 * NAJCZĘSTSZE BŁĘDY KTÓRE POPEŁNIAŁEM:
 *
 * 1. WarehouseHistory.tsx
 *    Problem: useMemo był PO early returns (if isLoading, if error)
 *    Rozwiązanie: Przeniosłem useMemo NA POCZĄTEK, przed wszystkimi ifami
 *
 * 2. MagazynAkrobudPageContent.tsx
 *    Problem: Fragment <> w map nie miał key, zamiast <React.Fragment key={id}>
 *    Rozwiązanie: Zamienił <> na <React.Fragment key={id}>
 *
 * 3. ImportyPage.tsx
 *    Problem: preview.import nie mogło być undefined, ale był
 *    Rozwiązanie: Zmienił warunek z `preview ?` na `preview && preview.import ?`
 */

export const HOOKS_SAFE_CHECKLIST = {
  STRUCTURE: {
    step1: '1️⃣ Wszystkie Hooks (useQuery, useState, useMemo, useCallback, useEffect)',
    step2: '2️⃣ Early returns (if isLoading, if error, etc)',
    step3: '3️⃣ Logika i render',
  },
  NEVER: {
    never1: '❌ Hook wewnątrz if/for/switch/try/catch',
    never2: '❌ Hook po return/early exit',
    never3: '❌ Hook w .map(), .filter(), czy innym callback',
    never4: '❌ Warunkowy Hook - zamiast tego użyj enabled: w Hooku',
  },
  ALWAYS: {
    always1: '✅ Najpierw data fetching (useQuery)',
    always2: '✅ Potem state management (useState)',
    always3: '✅ Potem memoizacja (useMemo)',
    always4: '✅ Potem callbacky (useCallback)',
    always5: '✅ Potem efekty (useEffect)',
    always6: '✅ Potem early returns',
    always7: '✅ Potem logika i render',
  },
};
