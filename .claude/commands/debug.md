# Debug Plan Generator

Zanim zaczniesz losowe próby debugowania, stwórz plan.

## Instrukcje

1. **Opisz problem** - co dokładnie nie działa?
2. **Zbierz informacje:**
   - Komunikat błędu (pełny stack trace)
   - Gdzie występuje (plik, linia)
   - Kiedy występuje (jakie akcje prowadzą do błędu)
   - Co powinno się wydarzyć vs co się dzieje

3. **Stwórz hipotezy** - lista możliwych przyczyn (min. 3)

4. **Plan weryfikacji** - jak sprawdzić każdą hipotezę

5. **Wykonaj systematycznie** - jedna hipoteza na raz

## Template

```
### Problem
[Opis]

### Błąd
[Stack trace / komunikat]

### Hipotezy
1. [ ] ...
2. [ ] ...
3. [ ] ...

### Plan akcji
1. Sprawdź hipotezę 1: [jak]
2. Sprawdź hipotezę 2: [jak]
3. ...

### Wynik
[Co było przyczyną]
```

## Teraz

Opisz problem który debugujesz, a pomogę Ci stworzyć plan.
