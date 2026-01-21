# Documentation Standards

Wytyczne dotyczace dokumentacji w projekcie AKROBUD.

---

## Zasada glowna

**Dokumentacja = czesc feature**

- Nowa funkcja = update docs
- Bug fix = update docs (jesli applicable)
- API changes = update API docs

---

## Gdzie dokumentowac?

| Lokalizacja | Zawartosc |
|-------------|-----------|
| **README.md** | Quick start, high-level overview, links do szczegolowej docs |
| **docs/features/** | Szczegolowa dokumentacja modulow, workflow diagramy, API integration |
| **docs/guides/** | Development guides, best practices, troubleshooting |
| **docs/contributing/** | Proces kontrybuowania (ten katalog) |
| **Code comments** | Complex logic (dlaczego, nie co) |

---

## Struktura katalogu docs/

```
docs/
  architecture/       # Architektura systemu
  contributing/       # Proces kontrybuowania
  deployment/         # Instrukcje deployment
  features/           # Dokumentacja modulow
  guides/             # Przewodniki developerskie
  reviews/            # Audyty i raporty
  templates/          # Szablony dokumentow
  user-guides/        # Dla uzytkownikow koncowych
```

---

## Code Comments

### Kiedy komentowac

- Tylko dla complex logic
- Nie comment "co" robi kod (to widac)
- Comment "dlaczego" (business logic)

### Przyklady

```typescript
// ZLE - oczywiste co robi
// Increment counter
counter++;

// DOBRE - wyjasnia dlaczego
// Reset counter after 100 to prevent overflow in legacy systems
if (counter >= 100) counter = 0;
```

```typescript
// ZLE - powtarza kod
// Check if order is completed
if (order.status === 'completed') { ... }

// DOBRE - wyjasnia business logic
// Completed orders cannot be modified per legal requirements
if (order.status === 'completed') {
  throw new ValidationError('Cannot modify completed order');
}
```

---

## Markdown Style Guide

### Headings

- Uzywaj headings hierarchicznie (h1 -> h2 -> h3)
- Jeden h1 na dokument (tytul)

```markdown
# Tytul dokumentu (h1)

## Sekcja (h2)

### Podsekcja (h3)
```

### Code blocks

- Zawsze z syntax highlighting

```markdown
```typescript
const example = 'code';
```
```

### Linki

- Uzywaj linkow wzglednych (nie absolutnych)

```markdown
// DOBRE
[Zobacz guide](./guide.md)
[Wiecej w docs](../docs/feature.md)

// ZLE
[Link](https://github.com/user/repo/blob/main/docs/feature.md)
```

### Screenshots

- Zapisuj w `/docs/images/`
- Uzywaj opisowych nazw plikow

```markdown
![Opis obrazka](./images/delivery-form-screenshot.png)
```

---

## Checklista dokumentacji

Przed merge sprawdz:

- [ ] README zaktualizowany (jesli potrzebne)
- [ ] docs/features/ zaktualizowane dla nowego modulu
- [ ] API endpoints udokumentowane
- [ ] Code comments dla complex logic
- [ ] Links dzialaja (wzgledne sciezki)

---

**Powrot do:** [CONTRIBUTING](../../CONTRIBUTING.md)
