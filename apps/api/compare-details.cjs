const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Dane z pliku użytkownika (tylko zlecenia AKROBUD - te z "A" w kolumnie AKR)
const fileData = {
  '53472': { okna: 2, jedn: 5, skrz: 3, eur: 720 },
  '53473': { okna: 4, jedn: 10, skrz: 6, eur: 2363 },
  '53477/A': { okna: 1, jedn: 3, skrz: 2, eur: 654 },
  '53572/A': { okna: 4, jedn: 12, skrz: 7, eur: 2155 },
  '53570': { okna: 8, jedn: 19, skrz: 11, eur: 2837 },
  '53576': { okna: 3, jedn: 8, skrz: 5, eur: 1376 },
  '53601': { okna: 4, jedn: 8, skrz: 4, eur: 1316 },
  '52428': { okna: 4, jedn: 10, skrz: 6, eur: 1410 },
  '53631': { okna: 4, jedn: 10, skrz: 6, eur: 1180 },
  '53646': { okna: 2, jedn: 4, skrz: 3, eur: 568 },
  '53638': { okna: 4, jedn: 4, skrz: 4, eur: 424 },
  '53427': { okna: 2, jedn: 4, skrz: 2, eur: 858 },
  '53614': { okna: 3, jedn: 8, skrz: 5, eur: 1674 },
  '53655': { okna: 4, jedn: 10, skrz: 6, eur: 1262 },
  '53656': { okna: 8, jedn: 18, skrz: 12, eur: 2623 },
  '53657': { okna: 8, jedn: 22, skrz: 14, eur: 2694 },
  '53658': { okna: 7, jedn: 17, skrz: 11, eur: 2284 },
  '53659': { okna: 7, jedn: 20, skrz: 13, eur: 3015 },
  '53660': { okna: 6, jedn: 16, skrz: 9, eur: 2607 },
  '53661': { okna: 8, jedn: 18, skrz: 12, eur: 3183 },
  '53662': { okna: 1, jedn: 2, skrz: 2, eur: 325 },
  '53648': { okna: 0, jedn: 1, skrz: 1, eur: 75 },
  '53595': { okna: 11, jedn: 27, skrz: 16, eur: 4148 },
  '53596': { okna: 2, jedn: 4, skrz: 2, eur: 490 },
  '53641': { okna: 2, jedn: 5, skrz: 3, eur: 605 },
  '53647': { okna: 0, jedn: 2, skrz: 2, eur: 213 },
  '53669': { okna: 1, jedn: 1, skrz: 1, eur: 142 },
  '53563': { okna: 4, jedn: 8, skrz: 5, eur: 1619 },
  '53597': { okna: 2, jedn: 4, skrz: 2, eur: 730 },
  '53598': { okna: 2, jedn: 5, skrz: 3, eur: 736 },
  '53616': { okna: 2, jedn: 4, skrz: 2, eur: 676 },
  '53618': { okna: 2, jedn: 5, skrz: 3, eur: 787 },
  '53480': { okna: 2, jedn: 4, skrz: 2, eur: 521 },
  '53566': { okna: 1, jedn: 4, skrz: 2, eur: 500 },
  '53529': { okna: 5, jedn: 12, skrz: 7, eur: 1469 },
  '53525': { okna: 2, jedn: 3, skrz: 3, eur: 492 },
  '53487': { okna: 4, jedn: 7, skrz: 4, eur: 1378 },
  '53215': { okna: 2, jedn: 5, skrz: 3, eur: 694 },
  '53536': { okna: 2, jedn: 4, skrz: 2, eur: 475 },
  '53626': { okna: 8, jedn: 10, skrz: 8, eur: 1417 },
  '53627': { okna: 2, jedn: 5, skrz: 2, eur: 539 },
  '53628/A': { okna: 5, jedn: 11, skrz: 7, eur: 1878 },
  '53629': { okna: 6, jedn: 17, skrz: 10, eur: 1685 },
  '53633': { okna: 1, jedn: 2, skrz: 1, eur: 216 },
  '53634': { okna: 3, jedn: 8, skrz: 5, eur: 1098 },
  '53635': { okna: 8, jedn: 20, skrz: 11, eur: 3642 },
  '53636': { okna: 7, jedn: 18, skrz: 10, eur: 2619 },
  '53645': { okna: 0, jedn: 1, skrz: 1, eur: 88 },
  '53651': { okna: 2, jedn: 3, skrz: 2, eur: 335 },
  '53654': { okna: 8, jedn: 12, skrz: 6, eur: 1202 },
  '53692': { okna: 2, jedn: 4, skrz: 2, eur: 448 },
  '53710': { okna: 4, jedn: 8, skrz: 4, eur: 930 },
  '53711': { okna: 1, jedn: 3, skrz: 2, eur: 301 },
  '53513': { okna: 2, jedn: 6, skrz: 3, eur: 816 },
  '53514': { okna: 2, jedn: 4, skrz: 2, eur: 508 },
  '53399': { okna: 1, jedn: 4, skrz: 2, eur: 694 },
  '53463': { okna: 2, jedn: 5, skrz: 2, eur: 1255 },
  '53504': { okna: 2, jedn: 4, skrz: 2, eur: 986 },
  '53581': { okna: 1, jedn: 4, skrz: 2, eur: 887 },
  '53602': { okna: 6, jedn: 14, skrz: 8, eur: 1866 },
  '53603': { okna: 2, jedn: 4, skrz: 3, eur: 692 },
  '53604': { okna: 4, jedn: 10, skrz: 6, eur: 1484 },
  '53605': { okna: 6, jedn: 11, skrz: 5, eur: 1638 },
  '53630/A': { okna: 4, jedn: 8, skrz: 4, eur: 1270 },
  '53650': { okna: 2, jedn: 3, skrz: 2, eur: 387 },
  '53676': { okna: 3, jedn: 7, skrz: 4, eur: 954 },
  '53699': { okna: 0, jedn: 1, skrz: 1, eur: 80 },
  '53705': { okna: 2, jedn: 4, skrz: 2, eur: 426 },
  '53664': { okna: 3, jedn: 7, skrz: 4, eur: 1433 },
  '53665': { okna: 2, jedn: 5, skrz: 2, eur: 878 },
  '53666': { okna: 2, jedn: 5, skrz: 2, eur: 822 },
  '53667': { okna: 3, jedn: 10, skrz: 6, eur: 1717 },
  '53722': { okna: 2, jedn: 5, skrz: 3, eur: 780 },
  '53723': { okna: 2, jedn: 5, skrz: 3, eur: 669 },
  '53726': { okna: 1, jedn: 2, skrz: 1, eur: 272 },
  '53725': { okna: 1, jedn: 4, skrz: 2, eur: 606 },
  '53727': { okna: 10, jedn: 30, skrz: 18, eur: 4540 },
  '53728': { okna: 8, jedn: 20, skrz: 16, eur: 3004 },
  '53730': { okna: 5, jedn: 16, skrz: 9, eur: 2014 },
  '53729': { okna: 1, jedn: 2, skrz: 2, eur: 365 },
  '53757': { okna: 1, jedn: 1, skrz: 0, eur: 79 },
  '53330': { okna: 1, jedn: 3, skrz: 0, eur: 321 },
  '53672': { okna: 1, jedn: 3, skrz: 2, eur: 332 },
  '53673': { okna: 2, jedn: 6, skrz: 3, eur: 624 },
  '53691': { okna: 2, jedn: 5, skrz: 3, eur: 701 },
  '53644': { okna: 1, jedn: 3, skrz: 2, eur: 367 },
  '53677': { okna: 2, jedn: 5, skrz: 3, eur: 1004 },
  '53512': { okna: 1, jedn: 2, skrz: 1, eur: 390 },
  '53561': { okna: 1, jedn: 2, skrz: 2, eur: 579 },
  '53453': { okna: 1, jedn: 3, skrz: 0, eur: 554 },
  '53701': { okna: 1, jedn: 3, skrz: 2, eur: 483 },
  '53737': { okna: 2, jedn: 4, skrz: 2, eur: 692 },
  '53738/A': { okna: 2, jedn: 7, skrz: 4, eur: 1065 },
  '53591': { okna: 2, jedn: 4, skrz: 3, eur: 717 },
  '56682': { okna: 1, jedn: 3, skrz: 2, eur: 432 },
  '53683': { okna: 1, jedn: 4, skrz: 2, eur: 366 },
  '53685': { okna: 1, jedn: 2, skrz: 1, eur: 192 },
  '53686': { okna: 2, jedn: 4, skrz: 2, eur: 454 },
  '53687': { okna: 2, jedn: 4, skrz: 4, eur: 666 },
  '53688': { okna: 2, jedn: 4, skrz: 2, eur: 692 },
  '53690': { okna: 11, jedn: 17, skrz: 11, eur: 2229 },
  '53520': { okna: 1, jedn: 4, skrz: 3, eur: 421 },
  '53488/A': { okna: 0, jedn: 1, skrz: 1, eur: 189 },
  '53707': { okna: 1, jedn: 4, skrz: 2, eur: 479 },
  '53708': { okna: 3, jedn: 10, skrz: 4, eur: 1458 },
  '53709/A': { okna: 3, jedn: 7, skrz: 4, eur: 859 },
  '53752': { okna: 1, jedn: 3, skrz: 0, eur: 139 },
  '53511': { okna: 0, jedn: 1, skrz: 1, eur: 122 },
  '53621': { okna: 2, jedn: 4, skrz: 3, eur: 590 },
  '53781': { okna: 2, jedn: 4, skrz: 2, eur: 628 },
  '53782': { okna: 2, jedn: 4, skrz: 2, eur: 488 },
  '53786/A': { okna: 2, jedn: 5, skrz: 3, eur: 748 },
  '53787/A': { okna: 2, jedn: 5, skrz: 3, eur: 650 },
  '53535': { okna: 3, jedn: 9, skrz: 5, eur: 1918 },
  '53574': { okna: 2, jedn: 4, skrz: 3, eur: 629 },
  '53582': { okna: 2, jedn: 5, skrz: 2, eur: 770 },
  '53600': { okna: 1, jedn: 1, skrz: 1, eur: 181 },
  '53643': { okna: 3, jedn: 8, skrz: 5, eur: 1614 },
  '53702': { okna: 1, jedn: 3, skrz: 2, eur: 634 },
  '53703': { okna: 5, jedn: 13, skrz: 6, eur: 1903 },
  '53704': { okna: 7, jedn: 18, skrz: 16, eur: 2551 },
  '53706': { okna: 3, jedn: 9, skrz: 5, eur: 1096 },
  '53712': { okna: 2, jedn: 5, skrz: 3, eur: 633 },
  '53713': { okna: 2, jedn: 4, skrz: 3, eur: 551 },
  '53721': { okna: 2, jedn: 7, skrz: 4, eur: 900 },
  '53622/A': { okna: 0, jedn: 1, skrz: 1, eur: 132 },
  '53531': { okna: 0, jedn: 1, skrz: 1, eur: 136 },
  '53767': { okna: 2, jedn: 4, skrz: 2, eur: 620 },
  '53768': { okna: 2, jedn: 6, skrz: 3, eur: 1147 },
  '53578/A': { okna: 1, jedn: 2, skrz: 2, eur: 352 },
  '53549': { okna: 1, jedn: 3, skrz: 2, eur: 490 },
  '53550': { okna: 2, jedn: 4, skrz: 3, eur: 793 },
  '53554': { okna: 1, jedn: 4, skrz: 2, eur: 837 },
  '53777': { okna: 1, jedn: 3, skrz: 2, eur: 444 },
  '53778': { okna: 2, jedn: 5, skrz: 3, eur: 719 },
  '53724': { okna: 2, jedn: 4, skrz: 3, eur: 734 },
  '53795': { okna: 8, jedn: 20, skrz: 12, eur: 2972 },
  '53796': { okna: 8, jedn: 23, skrz: 14, eur: 3700 },
  '53797': { okna: 7, jedn: 24, skrz: 13, eur: 3046 },
  '53798': { okna: 5, jedn: 15, skrz: 9, eur: 2214 },
  '53717': { okna: 8, jedn: 17, skrz: 11, eur: 3292 },
  '53718': { okna: 2, jedn: 6, skrz: 4, eur: 785 },
  '53719': { okna: 3, jedn: 8, skrz: 5, eur: 1445 },
  '53720': { okna: 1, jedn: 3, skrz: 2, eur: 601 },
  '53740': { okna: 1, jedn: 3, skrz: 2, eur: 379 },
  '53736': { okna: 2, jedn: 5, skrz: 3, eur: 597 },
  '53739': { okna: 1, jedn: 3, skrz: 2, eur: 463 },
  '53741': { okna: 2, jedn: 5, skrz: 3, eur: 717 },
  '53758/A': { okna: 1, jedn: 4, skrz: 2, eur: 878 },
  '53791': { okna: 4, jedn: 10, skrz: 5, eur: 1652 },
  '52737': { okna: 1, jedn: 3, skrz: 3, eur: 577 },
  '53584': { okna: 2, jedn: 5, skrz: 3, eur: 757 },
  '53585': { okna: 2, jedn: 5, skrz: 3, eur: 533 },
  '53592': { okna: 2, jedn: 5, skrz: 3, eur: 983 },
  '53620': { okna: 3, jedn: 7, skrz: 4, eur: 950 },
  '53632': { okna: 6, jedn: 12, skrz: 8, eur: 2592 },
  '53639': { okna: 2, jedn: 4, skrz: 3, eur: 535 },
  '53675': { okna: 1, jedn: 3, skrz: 2, eur: 382 },
  '53716': { okna: 1, jedn: 3, skrz: 2, eur: 497 },
  '53742': { okna: 5, jedn: 13, skrz: 8, eur: 1625 },
  '53743': { okna: 2, jedn: 5, skrz: 2, eur: 629 },
  '53744': { okna: 3, jedn: 7, skrz: 5, eur: 1227 },
  '53745': { okna: 1, jedn: 3, skrz: 2, eur: 309 },
  '53784': { okna: 1, jedn: 3, skrz: 1, eur: 733 },
  '53788': { okna: 1, jedn: 4, skrz: 2, eur: 487 },
  '53831': { okna: 1, jedn: 3, skrz: 0, eur: 185 },
  '53832': { okna: 1, jedn: 2, skrz: 0, eur: 140 },
  '53615/A': { okna: 1, jedn: 1, skrz: 1, eur: 362 },
  '53642': { okna: 2, jedn: 4, skrz: 4, eur: 1164 },
  '53649': { okna: 2, jedn: 4, skrz: 2, eur: 698 },
  '53674': { okna: 2, jedn: 4, skrz: 2, eur: 800 },
  '53679': { okna: 2, jedn: 6, skrz: 4, eur: 1567 },
  '53680': { okna: 2, jedn: 6, skrz: 4, eur: 1446 },
  '53714': { okna: 2, jedn: 6, skrz: 4, eur: 972 },
  '53715': { okna: 2, jedn: 4, skrz: 2, eur: 542 },
  '53746': { okna: 1, jedn: 5, skrz: 3, eur: 948 },
  '53747': { okna: 2, jedn: 4, skrz: 3, eur: 622 },
  '53748': { okna: 3, jedn: 8, skrz: 5, eur: 1295 },
  '53749': { okna: 5, jedn: 13, skrz: 8, eur: 2106 },
  '53770': { okna: 8, jedn: 22, skrz: 12, eur: 3179 },
  '53771': { okna: 2, jedn: 5, skrz: 3, eur: 678 },
  '53772': { okna: 2, jedn: 4, skrz: 2, eur: 578 },
  '53873': { okna: 4, jedn: 4, skrz: 4, eur: 396 },
  '53607': { okna: 1, jedn: 4, skrz: 2, eur: 681 },
  '53663': { okna: 2, jedn: 4, skrz: 2, eur: 595 },
  '53762': { okna: 1, jedn: 3, skrz: 2, eur: 613 },
  '53668': { okna: 1, jedn: 3, skrz: 2, eur: 521 },
  '53606': { okna: 2, jedn: 8, skrz: 8, eur: 1559 },
  '53799/A': { okna: 3, jedn: 12, skrz: 6, eur: 2161 },
  '53852': { okna: 1, jedn: 4, skrz: 2, eur: 825 },
  '53853': { okna: 4, jedn: 12, skrz: 7, eur: 1431 },
  '53854': { okna: 1, jedn: 3, skrz: 2, eur: 575 },
  '53855': { okna: 6, jedn: 15, skrz: 9, eur: 2160 },
  '53856': { okna: 6, jedn: 19, skrz: 12, eur: 3202 },
  '53857': { okna: 5, jedn: 13, skrz: 8, eur: 2080 },
  '53860': { okna: 4, jedn: 9, skrz: 6, eur: 1242 },
  '53678': { okna: 2, jedn: 5, skrz: 3, eur: 677 },
  '53696': { okna: 2, jedn: 4, skrz: 2, eur: 1165 },
  '53753': { okna: 1, jedn: 3, skrz: 2, eur: 495 },
  '53755': { okna: 3, jedn: 6, skrz: 6, eur: 924 },
  '53769': { okna: 2, jedn: 5, skrz: 3, eur: 910 },
  '53775': { okna: 2, jedn: 6, skrz: 4, eur: 1153 },
  '53689': { okna: 1, jedn: 3, skrz: 2, eur: 1009 },
  '53652': { okna: 1, jedn: 4, skrz: 2, eur: 716 },
  '53809': { okna: 5, jedn: 14, skrz: 8, eur: 1974 },
  '53811': { okna: 2, jedn: 5, skrz: 3, eur: 896 },
  '53822': { okna: 3, jedn: 8, skrz: 5, eur: 1458 },
  '53874': { okna: 2, jedn: 4, skrz: 2, eur: 740 },
  '53812': { okna: 2, jedn: 5, skrz: 3, eur: 693 },
  '53815/A': { okna: 2, jedn: 5, skrz: 3, eur: 658 },
};

// Normalizuj numer zlecenia (usuń / i zamień na -)
function normalizeOrderNumber(num) {
  return num.replace(/\//g, '-').toLowerCase();
}

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      productionDate: {
        gte: new Date('2026-01-01'),
        lt: new Date('2026-02-01')
      },
      deletedAt: null
    },
    select: {
      orderNumber: true,
      client: true,
      totalWindows: true,
      totalGlasses: true,
      totalSashes: true,
      valuePln: true,
      valueEur: true
    },
    orderBy: { orderNumber: 'asc' }
  });

  const isAkrobud = (o) => o.client && o.client.toUpperCase().includes('AKROBUD');
  const akrOrders = orders.filter(isAkrobud);

  // Mapa numerów systemowych
  const systemMap = {};
  akrOrders.forEach(o => {
    systemMap[normalizeOrderNumber(o.orderNumber)] = {
      okna: o.totalWindows || 0,
      jedn: o.totalGlasses || 0,
      skrz: o.totalSashes || 0,
      eur: (o.valueEur || 0) / 100
    };
  });

  console.log('=== RÓŻNICE MIĘDZY PLIKIEM A SYSTEMEM ===\n');

  const differences = [];
  const missingInSystem = [];
  const missingInFile = [];

  // Sprawdź zlecenia z pliku
  for (const [num, fileValues] of Object.entries(fileData)) {
    const normNum = normalizeOrderNumber(num);
    const sysValues = systemMap[normNum];

    if (!sysValues) {
      missingInSystem.push(num);
      continue;
    }

    const diffs = [];
    if (fileValues.okna !== sysValues.okna) diffs.push(`okna: plik=${fileValues.okna} sys=${sysValues.okna}`);
    if (fileValues.jedn !== sysValues.jedn) diffs.push(`jedn: plik=${fileValues.jedn} sys=${sysValues.jedn}`);
    if (fileValues.skrz !== sysValues.skrz) diffs.push(`skrz: plik=${fileValues.skrz} sys=${sysValues.skrz}`);
    if (Math.abs(fileValues.eur - sysValues.eur) > 1) diffs.push(`EUR: plik=${fileValues.eur} sys=${sysValues.eur}`);

    if (diffs.length > 0) {
      differences.push({ num, diffs });
    }
  }

  // Sprawdź zlecenia w systemie których nie ma w pliku
  const fileNormalized = Object.keys(fileData).map(normalizeOrderNumber);
  for (const [normNum, sysValues] of Object.entries(systemMap)) {
    if (!fileNormalized.includes(normNum)) {
      const orig = akrOrders.find(o => normalizeOrderNumber(o.orderNumber) === normNum);
      missingInFile.push(orig.orderNumber);
    }
  }

  console.log('ZLECENIA Z RÓŻNICAMI:');
  if (differences.length === 0) {
    console.log('  Brak różnic w wartościach');
  } else {
    differences.forEach(d => {
      console.log(`  ${d.num}: ${d.diffs.join(', ')}`);
    });
  }

  console.log(`\nZLECENIA W PLIKU, KTÓRYCH BRAK W SYSTEMIE (${missingInSystem.length}):`);
  if (missingInSystem.length > 0) {
    console.log('  ' + missingInSystem.join(', '));
  }

  console.log(`\nZLECENIA W SYSTEMIE, KTÓRYCH BRAK W PLIKU (${missingInFile.length}):`);
  if (missingInFile.length > 0) {
    console.log('  ' + missingInFile.join(', '));
  }

  // Podsumowanie
  let fileSum = { okna: 0, jedn: 0, skrz: 0, eur: 0 };
  Object.values(fileData).forEach(v => {
    fileSum.okna += v.okna;
    fileSum.jedn += v.jedn;
    fileSum.skrz += v.skrz;
    fileSum.eur += v.eur;
  });

  let sysSum = { okna: 0, jedn: 0, skrz: 0, eur: 0 };
  Object.values(systemMap).forEach(v => {
    sysSum.okna += v.okna;
    sysSum.jedn += v.jedn;
    sysSum.skrz += v.skrz;
    sysSum.eur += v.eur;
  });

  console.log('\n=== PODSUMOWANIE SUM ===');
  console.log(`PLIK:   okna=${fileSum.okna} jedn=${fileSum.jedn} skrz=${fileSum.skrz} EUR=${fileSum.eur}`);
  console.log(`SYSTEM: okna=${sysSum.okna} jedn=${sysSum.jedn} skrz=${sysSum.skrz} EUR=${sysSum.eur.toFixed(0)}`);
  console.log(`RÓŻNICA: okna=${sysSum.okna - fileSum.okna} jedn=${sysSum.jedn - fileSum.jedn} skrz=${sysSum.skrz - fileSum.skrz} EUR=${(sysSum.eur - fileSum.eur).toFixed(0)}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
