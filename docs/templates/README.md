# Code Templates

Szablony dla szybszego tworzenia standardowych elementów kodu.

## Dostępne Szablony

- [component.md](component.md) - Szablon React component

## Planowane Szablony

- `api-endpoint.md` - Szablon backend endpoint (Route → Handler → Service → Repository)
- `feature.md` - Szablon nowego modułu feature (katalogi, pliki, struktura)
- `test.md` - Szablon testów (unit, integration, E2E)

## Używanie Szablonów

1. Skopiuj zawartość szablonu
2. Zastąp placeholders (`<ComponentName>`, `<FeatureName>`, etc.)
3. Dostosuj do swoich potrzeb
4. Follow [Coding Standards](../../CONTRIBUTING.md#coding-standards)

## VS Code Snippets

Rozważ dodanie custom snippets w VS Code dla szybszego workflow.

`.vscode/snippets.code-snippets`:
```json
{
  "React Function Component": {
    "prefix": "rfc",
    "body": [
      "interface ${1:ComponentName}Props {",
      "  $2",
      "}",
      "",
      "export function ${1:ComponentName}({ $3 }: ${1:ComponentName}Props) {",
      "  return (",
      "    <div>$0</div>",
      "  );",
      "}"
    ]
  }
}
```
