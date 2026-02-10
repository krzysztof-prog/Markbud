// Porównanie listy wyprodukowanych zleceń w styczniu z bazą danych
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Lista ze zdjęcia - wyprodukowane w styczniu
const rawList = `53472
53473
53477/A
53572/A
53570
53576
53601
52428
53631
53646
53638
53427
53614
53655
53656
53657
53658
53659
53660
53661
53662
53648
53595
53596
53641
53647
53669
53563
53597
53598
53616
53618
53480
53566
53529
53525
53487
53215
53536
53626
53627
53628/A
53629
53633
53634
53635
53636
53645
53651
53654
53692
53710
53711
53513
53514
53399
53463
53504
53581
53602
53603
53604
53605
53630/A
53650
53676
53699
53705
53664
53665
53666
53667
53722
53723
53726
53725
53727
53728
53730
53729
53757
53330
53672
53673
53691
53698
53637
53444/A
53644
53677
53512
53561
53453
53701
53737
53738/A
53591
56682
53683
53685
53686
53687
53688
53690
53520
53488/A
53707
53708
53709/A
53752
53511
53621
53781
53782
53786/A
53787/A
53535
53574
53582
53600
53643
53702
53703
53704
53706
53712
53713
53721
53622/A
53531
53767
53768
53578/A
53549
53550
53554
53777
53778
53724
53795
53796
53797
53798
53717
53718
53719
53720
53740
53736
53739
53741
53758/A
53791
52737
53584
53585
53592
53620
53632
53639
53675
53716
53742
53743
53744
53745
53784
53788
53831
53832
53615/A
53642
53649
53674
53679
53680
53714
53715
53746
53747
53748
53749
53770
53771
53772
53873
53607
53663
53762
53668
53606
53799/A
53852
53853
53854
53855
53856
53857
53860
53678
53696
53753
53755
53769
53775
53689
53652
53809
53811
53822
53874
53812
53815/A`;

// Normalizuj numery zleceń z listy (format: 53477/A -> 53477-a)
function normalizeOrderNumber(num) {
  const trimmed = num.trim();
  // Zamień /A, /B na -a, -b (format w bazie)
  const normalized = trimmed.replace(/\/([A-Za-z])$/i, (match, letter) => '-' + letter.toLowerCase());
  return normalized;
}

async function main() {
  const listOrders = rawList.split('\n').map(s => s.trim()).filter(Boolean);
  const normalizedList = listOrders.map(normalizeOrderNumber);

  console.log('=== PORÓWNANIE LISTY PRODUKCJI STYCZEŃ 2026 ===\n');
  console.log(`Zleceń na liście: ${normalizedList.length}`);
  console.log(`Unikalne na liście: ${new Set(normalizedList).size}`);

  // Pobierz zlecenia z bazy z productionDate w styczniu
  const dbJanOrders = await prisma.order.findMany({
    where: {
      productionDate: {
        gte: new Date('2026-01-01'),
        lt: new Date('2026-02-01')
      },
      deletedAt: null
    },
    select: { orderNumber: true, productionDate: true, status: true },
    orderBy: { orderNumber: 'asc' }
  });

  console.log(`Zleceń w bazie z productionDate w styczniu: ${dbJanOrders.length}\n`);

  const dbOrderNumbers = new Set(dbJanOrders.map(o => o.orderNumber));
  const listOrderNumbers = new Set(normalizedList);

  // 1. Na liście ale NIE w bazie (brak productionDate w styczniu)
  const onListNotInDb = [...listOrderNumbers].filter(n => !dbOrderNumbers.has(n)).sort();

  // 2. W bazie ale NIE na liście
  const inDbNotOnList = [...dbOrderNumbers].filter(n => !listOrderNumbers.has(n)).sort();

  // 3. Na obu listach (zgodne)
  const matching = [...listOrderNumbers].filter(n => dbOrderNumbers.has(n));

  console.log(`\n=== WYNIKI ===`);
  console.log(`Zgodne (na liście I w bazie): ${matching.length}`);
  console.log(`Na liście, ale BEZ productionDate w styczniu w bazie: ${onListNotInDb.length}`);
  console.log(`W bazie (productionDate styczeń), ale NIE na liście: ${inDbNotOnList.length}`);

  if (onListNotInDb.length > 0) {
    console.log(`\n--- Na liście, ale BRAK w bazie ze styczniem ---`);
    // Sprawdź każde z nich w bazie
    for (const num of onListNotInDb) {
      const dbOrder = await prisma.order.findFirst({
        where: { orderNumber: num },
        select: { orderNumber: true, productionDate: true, status: true, manualStatus: true, deletedAt: true }
      });
      if (dbOrder) {
        const prodDate = dbOrder.productionDate ? dbOrder.productionDate.toISOString().slice(0, 10) : 'BRAK';
        const deleted = dbOrder.deletedAt ? ' [USUNIĘTE]' : '';
        const manual = dbOrder.manualStatus ? ` [${dbOrder.manualStatus}]` : '';
        console.log(`  ${num} -> w bazie: status=${dbOrder.status}, productionDate=${prodDate}${manual}${deleted}`);
      } else {
        console.log(`  ${num} -> NIE ISTNIEJE W BAZIE!`);
      }
    }
  }

  if (inDbNotOnList.length > 0) {
    console.log(`\n--- W bazie ze styczniem, ale NIE na liście ---`);
    for (const num of inDbNotOnList) {
      const dbOrder = dbJanOrders.find(o => o.orderNumber === num);
      const prodDate = dbOrder.productionDate ? dbOrder.productionDate.toISOString().slice(0, 10) : 'BRAK';
      console.log(`  ${num} -> productionDate=${prodDate}, status=${dbOrder.status}`);
    }
  }

  // Duplikaty na liście
  const duplicates = normalizedList.filter((item, index) => normalizedList.indexOf(item) !== index);
  if (duplicates.length > 0) {
    console.log(`\n--- Duplikaty na liście ---`);
    duplicates.forEach(d => console.log(`  ${d}`));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error(e); prisma.$disconnect(); });
