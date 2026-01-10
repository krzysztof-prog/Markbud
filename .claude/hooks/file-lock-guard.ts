/**
 * File Lock Guard - Chroni "gotowe" moduły przed przypadkową modyfikacją
 *
 * Blokuje zapis do plików oznaczonych jako "protected" w settings.local.json
 * lub posiadających komentarz @protected na górze pliku.
 */

export const name = 'file-lock-guard';
export const description = 'Blokuje modyfikację gotowych modułów';

export const config = {
  alwaysRun: false,
  triggerOn: {
    hooks: ['PreToolUse'],
  },
};

interface Settings {
  protectedFiles?: string[];
}

export async function execute(
  context: any,
  prevResult?: string
): Promise<string> {
  const { toolInput, projectRoot, fs } = context;

  // Tylko dla operacji zapisu
  if (!['Write', 'Edit', 'MultiEdit'].includes(context.toolName)) {
    return prevResult || '';
  }

  // Wczytaj protected-files.json
  const protectedFilesPath = `${projectRoot}/.claude/protected-files.json`;
  let protectedFiles: string[] = [];

  try {
    const protectedFilesContent = await fs.readFile(protectedFilesPath, 'utf-8');
    const config: Settings = JSON.parse(protectedFilesContent);
    protectedFiles = config.protectedFiles || [];
  } catch (error) {
    // Brak pliku konfiguracji - OK, brak protected files
  }

  // Normalizuj ścieżki (usuń projectRoot prefix jeśli jest)
  const normalizeFilePath = (path: string): string => {
    return path.replace(projectRoot, '').replace(/^[\/\\]/, '');
  };

  // Pobierz ścieżkę pliku który ma być modyfikowany
  let targetFile: string | undefined;

  if (context.toolName === 'Write' || context.toolName === 'Edit') {
    targetFile = toolInput?.file_path;
  } else if (context.toolName === 'MultiEdit') {
    // MultiEdit - sprawdź wszystkie pliki
    const files = toolInput?.files || [];
    for (const file of files) {
      const filePath = normalizeFilePath(file.file_path);
      if (protectedFiles.some(pf => filePath.includes(pf))) {
        targetFile = file.file_path;
        break;
      }
    }
  }

  if (!targetFile) {
    return prevResult || '';
  }

  const normalizedTarget = normalizeFilePath(targetFile);

  // Sprawdź czy plik jest na liście protected
  const isProtected = protectedFiles.some(pf => normalizedTarget.includes(pf));

  if (!isProtected) {
    return prevResult || '';
  }

  // BLOKADA!
  const warningMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 FILE LOCK GUARD - PROTECTED MODULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛔ PRÓBA MODYFIKACJI CHRONIONEGO PLIKU:
${targetFile}

Ten moduł jest oznaczony jako "gotowy i przetestowany".
Modyfikacja może wprowadzić nowe bugi.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPCJE:

1. ❌ ANULUJ - Nie modyfikuj tego pliku
   → Znajdź inne rozwiązanie (nowy plik, inny moduł)

2. ⚠️ OVERRIDE - Modyfikuj mimo ostrzeżenia
   → Użytkownik musi potwierdzić w odpowiedzi
   → Dodaj komentarz DLACZEGO było konieczne

3. 🔓 ODBLOKUJ - Usuń z listy protected
   → Edytuj .claude/protected-files.json
   → Usuń "${normalizedTarget}" z protectedFiles[]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Claude: Zapytaj użytkownika co ma zrobić.
NIE modyfikuj pliku dopóki nie dostaniesz wyraźnego potwierdzenia.
`;

  console.log(warningMessage);
  return warningMessage;
}
