import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Rozpoczynam seedowanie bazy danych...');

  // ==================== UŻYTKOWNIK SYSTEMOWY ====================
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@akrobud.local' },
    update: {},
    create: {
      email: 'system@akrobud.local',
      passwordHash: 'system',
      name: 'System User',
      role: 'system',
    },
  });
  console.log('✅ Użytkownik systemowy utworzony (ID:', systemUser.id, ')');

  // ==================== PROFILE ====================
  // Profile z bazy dev - z aktualnymi flagami systemów profilowych
  const profiles = [
    { number: '8865', articleNumber: '18865170', name: 'Rama CT70', isCt70: true },
    { number: '8866', articleNumber: '18866730', name: 'Skrzydło CT70', isAkrobud: true, isBlok: true, isVlak: true, isCt70: true },
    { number: '8869', articleNumber: '18869050', name: '8869', isAkrobud: true, isVlak: true, isCt70: true },
    { number: '9015', articleNumber: '19015148', name: 'Oscieżnica 112/68 BG/CW' },
    { number: '9016', articleNumber: '19016000', name: '9016', isBlok: true },
    { number: '9181', articleNumber: '19181147', name: '9181' },
    { number: '9315', articleNumber: '19315000', name: '9315', isAkrobud: true, isBlok: true },
    { number: '9366', articleNumber: '19366452', name: '9366' },
    { number: '9367', articleNumber: '19367452', name: '9367' },
    { number: '9368', articleNumber: '19368452', name: '9368' },
    { number: '9411', articleNumber: '19411452', name: '9411', isLiving: true },
    { number: '9412', articleNumber: '19412730', name: '9412', isLiving: true },
    { number: '9431', articleNumber: '19431452', name: '9431', isLiving: true },
    { number: '9432', articleNumber: '19432452', name: '9432', isLiving: true },
    { number: '9465', articleNumber: '19465160', name: '9465', isLiving: true },
    { number: '9466', articleNumber: '19466452', name: '9466', isLiving: true },
    { number: '9468', articleNumber: '19468128', name: '9468' },
    { number: '9472', articleNumber: '19472452', name: '9472' },
    { number: '9491', articleNumber: '19491128', name: '9491' },
    { number: '9665', articleNumber: '19665050', name: '9665' },
    { number: '9671', articleNumber: '19671000', name: '9671', isAkrobud: true, isLiving: true, isBlok: true, isVlak: true, isCt70: true, isFocusing: true },
    { number: '9677', articleNumber: '19677452', name: '9677', isAkrobud: true, isLiving: true, isBlok: true, isVlak: true, isCt70: true, isFocusing: true },
    { number: '9678', articleNumber: '19678680', name: '9678' },
    { number: '9679', articleNumber: '19679452', name: 'Listwa przy. 8/23 dg sw AGG' },
    { number: '9701', articleNumber: '19701000', name: '9701' },
    { number: '9721', articleNumber: '19721000', name: 'Profil dystansowy 22/28 w' },
    { number: '9756', articleNumber: '19756000', name: '9756' },
    { number: '9757', articleNumber: '19757000', name: '9757' },
    { number: '9758', articleNumber: '19758170', name: '9758' },
    { number: '9811', articleNumber: '19811452', name: '9811' },
    // Profile wariantowe (RAL, specjalne) - tworzone automatycznie przez import
    { number: '8866B', articleNumber: '18866BZIM', name: 'Skrzydło CT70' },
    { number: '8866RAL', articleNumber: '18866RAL 1x', name: '8866RAL' },
    { number: '8869RAL', articleNumber: '18869RAL 1x', name: '8869RAL' },
    { number: '9016RAL', articleNumber: '19016RAL 1x', name: '9016RAL' },
    { number: '9181RAL', articleNumber: '19181RAL 1x', name: '9181RAL' },
    { number: '9315CZ/S', articleNumber: '19315CZ/SZCZ', name: 'Ościeżnica blokowa 112/88 czarny/szary czarny' },
    { number: '9315RAL', articleNumber: '19315RAL 2x', name: '9315RAL' },
    { number: '9315S', articleNumber: '19315SZAW', name: 'Ościeżnica blokowa Acc 112/88 KAMT szary antracyt wew.' },
  ];

  for (const profile of profiles) {
    await prisma.profile.upsert({
      where: { number: profile.number },
      update: {
        articleNumber: profile.articleNumber,
        name: profile.name,
        isAkrobud: profile.isAkrobud ?? false,
        isLiving: profile.isLiving ?? false,
        isBlok: profile.isBlok ?? false,
        isVlak: profile.isVlak ?? false,
        isCt70: profile.isCt70 ?? false,
        isFocusing: profile.isFocusing ?? false,
      },
      create: {
        number: profile.number,
        articleNumber: profile.articleNumber,
        name: profile.name,
        isAkrobud: profile.isAkrobud ?? false,
        isLiving: profile.isLiving ?? false,
        isBlok: profile.isBlok ?? false,
        isVlak: profile.isVlak ?? false,
        isCt70: profile.isCt70 ?? false,
        isFocusing: profile.isFocusing ?? false,
      },
    });
  }
  console.log(`✅ Profile utworzone (${profiles.length})`);

  // ==================== KOLORY TYPOWE ====================
  const typicalColors = [
    { code: '000', name: 'Biały', hexColor: '#FFFFFF' },
    { code: '050', name: 'Kremowy', hexColor: '#F5F5DC' },
    { code: '128', name: 'Schwarzgrau', hexColor: '#2F2F2F' },
    { code: '145', name: 'Antracyt x1 (b.krem)', hexColor: '#404040' },
    { code: '146', name: 'Granat x1 (b.krem)', hexColor: '#1E3A5F' },
    { code: '147', name: 'Jodłowy x1 (b.krem)', hexColor: '#2E5A35' },
    { code: '148', name: 'Krem folia x1', hexColor: '#FFF8DC' },
    { code: '609', name: '609' },
    { code: '623', name: '623' },
    { code: '730', name: 'Antracyt x1', hexColor: '#383838' },
    { code: '750', name: 'Biała folia x1', hexColor: '#FAFAFA' },
    { code: '830', name: 'Granat x1', hexColor: '#1C3B6A' },
    { code: '864', name: 'Zielony monumentalny', hexColor: '#4A6741' },
    { code: '890', name: 'Jodłowy x1', hexColor: '#355E3B' },
  ];

  for (const color of typicalColors) {
    await prisma.color.upsert({
      where: { code: color.code },
      update: {},
      create: { ...color, type: 'typical' },
    });
  }
  console.log(`✅ Kolory typowe utworzone (${typicalColors.length})`);

  // ==================== KOLORY NIETYPOWE ====================
  // 209 kolorów nietypowych - pełna lista z katalogu kolorów Schüco
  const atypicalColors = [
    { code: '122', name: '1x Szary jasny 7035 gładki' },
    { code: '123', name: '1x Szary agatowy 7038 gładki cz.uszcz.' },
    { code: '124', name: '1x Szary sygnałowy 7004 gładki cz.uszcz.' },
    { code: '125', name: '1x Szary srebrny 7001' },
    { code: '126', name: '1x Szary bazaltowy 7012 gładki cz.uszcz.' },
    { code: '129', name: '1x Szary łupek 7015 gładki' },
    { code: '131', name: '2x Montana (korpus karmel)' },
    { code: '132', name: '2x Indian (korpus karmel)' },
    { code: '133', name: '2x Canadian (korpus karmel)' },
    { code: '134', name: '2x Oregon 4 (korpus karmel)' },
    { code: '135', name: '2x Sosna górska (korpus karmel)' },
    { code: '136', name: '2x Daglezja (korpus karmel)' },
    { code: '137', name: '2x Dąb naturalny (korpus karmel)' },
    { code: '138', name: '2x Winchester (korpus karmel)' },
    { code: '139', name: '2x Dąb jasny (korpus karmel)' },
    { code: '140', name: 'Krem barwiony w masie sz. uszczelka' },
    { code: '141', name: 'Krem folia x1 sz.uszczelka | BIAŁY' },
    { code: '142', name: 'Cremeweiss folia 2x sz.uszcz | KREM' },
    { code: '143', name: 'Mahagoni 1x | KREM' },
    { code: '149', name: 'Hellelfenbein (1015) 1x | KREM' },
    { code: '151', name: 'Weinrot 3005 1x | KREM' },
    { code: '153', name: 'Tannengraun 6009 zew./Cremeweiss folia wew.| KREM' },
    { code: '154', name: 'Antracyt x2', hexColor: '#363636' },
    { code: '155', name: 'Krem folia/biały (b.krem)', hexColor: '#FFFDD0' },
    { code: '156', name: '2x Antracyt 7016 (korpus bialy) gładki' },
    { code: '157', name: '1x Szary agatowy 7038 strukt. cz.uszcz.' },
    { code: '171', name: '1x Bordowy 3005' },
    { code: '172', name: '1x Dąb bagienny' },
    { code: '173', name: '2x Szary bazaltowy 7012 (korpus bialy) gładki' },
    { code: '176', name: '2x Zielony mech (korpus bialy)' },
    { code: '177', name: '2x Zielony jodłowy (korpus bialy)' },
    { code: '178', name: '2x Szary sygnałowy 7004 (korpus bialy)' },
    { code: '179', name: '2x Szary srebrny 7001 (korpus bialy) gładki' },
    { code: '181', name: 'Antracyt struk. Zew./Krem wew. | BIAŁY' },
    { code: '182', name: '2x Szary jasny 7035 (korpus bialy) gładki' },
    { code: '183', name: '2x Szary bazaltowy 7012 (korpus bialy) struk.' },
    { code: '184', name: '2x Czerwony (korpus bialy)' },
    { code: '185', name: '2x Granatowy stalowy (korpus bialy)' },
    { code: '187', name: '2x Niebieski brylantowy (korpus bialy)' },
    { code: '189', name: '2x Mahoń (korpus bialy)' },
    { code: '191', name: '1x Czerwony jasny 3002' },
    { code: '192', name: '1x Niebieski kobaltowy 5013' },
    { code: '193', name: '1x Brązowy czekoladowy' },
    { code: '194', name: '1x Zielony jasny 6001' },
    { code: '195', name: '1x WEW. Canadian' },
    { code: '196', name: '1x WEW. Indian' },
    { code: '197', name: '1x WEW. Montana' },
    { code: '198', name: '1x WEW. Szary srebrny' },
    { code: '199', name: '1x WEW. Oregon 4' },
    { code: '201', name: 'Biała folia/antracyt', hexColor: '#C0C0C0' },
    { code: '202', name: 'Granatowy stalowy zew./Krem folia wew. | BIAŁY' },
    { code: '203', name: 'Zielony jodłowy zew./Krem folia wew. | BIAŁY' },
    { code: '204', name: '1x WEW. Antracyt 7016 strukt.' },
    { code: '209', name: 'Zielony mech zew./Krem folia wew. | KREM' },
    { code: '237', name: '2x Turner Oak malt (korpus karmel)' },
    { code: '321', name: '2x Orzech (korpus karmelowy)' },
    { code: '323', name: '2x Alux Szary aluminowy (korpus szary)' },
    { code: '326', name: '2x Sheffield Oak concrete (korpus bialy)' },
    { code: '327', name: '2x Turner Oak malt (korpus bialy)' },
    { code: '328', name: '2x Turner Oak toffee (korpus bialy)' },
    { code: '351', name: '2x Mahoń (korpus szary)' },
    { code: '352', name: '2x Siena Rosso (korpus szary)' },
    { code: '353', name: '2x Siena Noce (korpus szary)' },
    { code: '355', name: '2x Dąb ciemny (korpus szary)' },
    { code: '356', name: '2x Brązowy dekoracyjny(korpus szary)' },
    { code: '357', name: '2x Szary srebrny 7001 (korpus szary) struk.' },
    { code: '359', name: '2x Szary bazaltowy 7012 (korpus szary) struk.' },
    { code: '372', name: '2x Szary cementowy 7023 (korpus szary)' },
    { code: '377', name: '2x Czerwony (korpus szary)' },
    { code: '379', name: '2x Niebieski kobaltowy 5013 (korpus szary)' },
    { code: '382', name: '2x Brązowy kasztanowy(korpus szary)' },
    { code: '384', name: '2x Zielony monumentowy (korpus szary)' },
    { code: '385', name: '2x Szary łupek struktura 7015 (korpus szary)' },
    { code: '386', name: '2x Brązowy czekoladowy (korpus szary)' },
    { code: '390', name: '1x Dąb naturalny' },
    { code: '391', name: '2x Ultramaryna 5002 (korpus szary)' },
    { code: '393', name: '2x Anteak(korpus szary)' },
    { code: '396', name: '2x Macore (korpus szary)' },
    { code: '400', name: '1x Dąb jasny' },
    { code: '409', name: '2x Brązowy platynowy (korpus szary)' },
    { code: '411', name: '2x Złoty Dąb (korpus szary)' },
    { code: '419', name: '2x Alux antracytowy (korpus szary)' },
    { code: '421', name: '2x Dąb sękaty (korpus karmel)' },
    { code: '422', name: '1x Dąb sękaty' },
    { code: '425', name: '2x Jet Black matt (korpus szary)' },
    { code: '426', name: '2x Sheffield Oak concrete (korpus szary)' },
    { code: '427', name: '2x Turner Oak malt (korpus szary)' },
    { code: '428', name: '2x Turner Oak toffee (korpus szary)' },
    { code: '440', name: '1x Macore' },
    { code: '444', name: '2x Sheffield Oak Light (korpus krem)' },
    { code: '445', name: '2x Czarny ulti-matowy (korpus krem)' },
    { code: '451', name: '2x Szary bazaltowy 7012 (korpus szary) gładki' },
    { code: '453', name: '2x Szary jasny 7035 (korpus szary) gładki' },
    { code: '454', name: '2x Szary agatowy 7038 (korpus szary)' },
    { code: '455', name: '2x Szary sygnałowy 7004 (korpus szary)' },
    { code: '456', name: '2x Szary srebrny 7001 (korpus szary) gładki' },
    { code: '458', name: '2x Szary kwarcytowy 7039 (korpus szary) gładki' },
    { code: '459', name: '2x Alux DB 703 (korpus szary)' },
    { code: '460', name: '1x Orzech' },
    { code: '461', name: '2x Szary łupek gładki 7015 (korpus szary)' },
    { code: '462', name: '2x Dąb bagienny (korpus szary)' },
    { code: '463', name: '2x Zielony jodłowy (korpus szary)' },
    { code: '464', name: '2x Zielony mech (korpus szary)' },
    { code: '470', name: '1x WEW. Złoty Dąb' },
    { code: '480', name: '1x WEW. Jasny dąb' },
    { code: '481', name: '2x Mattex Shine DB 703 (korpus szary)' },
    { code: '483', name: '2x Mattex Shine beige (korpus szary)' },
    { code: '484', name: '2x Mattex Shine deep bronze (korpus korpus)' },
    { code: '485', name: '2x Mattex Shine dark graphite (korpus szary)' },
    { code: '486', name: '2x Mattex Shine grey aluminium (korpus szary)' },
    { code: '487', name: '2x Mattex Shine white aluminium (korpus szary)' },
    { code: '488', name: '2x Mattex umbra grey (korpus szary)' },
    { code: '490', name: '1x WEW. Daglezja' },
    { code: '500', name: '1x WEW. Granatowy stalowy' },
    { code: '501', name: 'Silbergrau7001 1x | KREM' },
    { code: '502', name: 'Biała folia 9010 1x | KREM' },
    { code: '503', name: 'Siena noce 1x | KREM' },
    { code: '504', name: 'Siena rosso1x | KREM' },
    { code: '505', name: 'Moosgrun 6005 1x | KREM' },
    { code: '507', name: 'Cremeweiss folia 1x sz.uszcz | KREM' },
    { code: '510', name: '1x WEW. Zielony jodłowy' },
    { code: '511', name: '1x WEW. Sosna górska' },
    { code: '512', name: '1x WEW. Siena Noce' },
    { code: '513', name: '1x WEW. Siena Rosso' },
    { code: '514', name: '2x Kość słoniowa (korpus bialy)' },
    { code: '516', name: '2x Achatgrau 7038 (korpus bialy)' },
    { code: '517', name: '2x Aluminium szczotkowane (korpus bialy)' },
    { code: '518', name: '2x Sosna górska (korpus bialy)' },
    { code: '519', name: '2x Brązowy dekoracyjny (korpus bialy)' },
    { code: '521', name: '2x Canadian (korpus bialy)' },
    { code: '528', name: '2x Srebrny metalizowany' },
    { code: '533', name: 'Szary czarny x2', hexColor: '#2B2B2B' },
    { code: '537', name: 'Quartgrau x1', hexColor: '#6B6B6B' },
    { code: '538', name: '2x Szary kwarcytowy 7039 (korpus bialy) struk.' },
    { code: '540', name: '1x WEW. Brązowy dekoracyjny' },
    { code: '541', name: '1x Szary kwarcytowy 7039 gładki' },
    { code: '542', name: '1x Szary cementowy' },
    { code: '543', name: '1x Irchowo-szary struk.' },
    { code: '544', name: '1x WEW. Macore' },
    { code: '549', name: '2x Szary cementowy 7023 (bialy)' },
    { code: '550', name: '1x WEW. Ciemny dąb' },
    { code: '560', name: '1x WEW. Mahoń' },
    { code: '570', name: '1x Dąb ciemny' },
    { code: '580', name: '1x Mahoń' },
    { code: '581', name: '2x Mattex Shine DB 703 (korpus bialy)' },
    { code: '582', name: '2x Mattex Jet black (korpus bialy)' },
    { code: '583', name: '2x Mattex Shine beige (korpus bialy)' },
    { code: '584', name: '2x Mattex Shine deep bronze (korpus bialy)' },
    { code: '585', name: '2x Mattex Shine dark graphite (korpus bialy)' },
    { code: '586', name: '2x Mattex Shine grey aluminium (korpus bialy)' },
    { code: '587', name: '2x Mattex Shine white aluminium (korpus bialy)' },
    { code: '588', name: '2x Mattex umbra grey (korpus bialy)' },
    { code: '590', name: '1x Brązowy dekoracyjny' },
    { code: '600', name: '1x Daglezja' },
    { code: '615', name: '1x Sheffield Oak Light cz.uszczelka' },
    { code: '616', name: '1x Sheffield Oak Light sz.uszczelka' },
    { code: '620', name: '1x Oregon 4' },
    { code: '626', name: '1x Sheffield Oak concrete' },
    { code: '627', name: '1x Turner Oak malt' },
    { code: '628', name: '1x Turner Oak toffee' },
    { code: '630', name: '1x Sosna górska' },
    { code: '647', name: '1x Szary agatowy 7038 strukt. sz.uszcz.' },
    { code: '649', name: '1x Kość słoniowa 1015 sz.uszczelka' },
    { code: '651', name: '1x Szary srebrny gładki sz.uszcz.' },
    { code: '653', name: '1x Szary jasny gładki sz.uszcz.' },
    { code: '655', name: '1x Szary bazaltowy 7012 gładki sz.uszcz.' },
    { code: '656', name: '1x Szary sygnałowy 7004 gładki sz.uszcz.' },
    { code: '657', name: '2x Kość słoniowa' },
    { code: '661', name: '1x Szary agatowy 7038 gładki sz.uszcz.' },
    { code: '664', name: '1x Szary beżowy 7032 stru.' },
    { code: '666', name: '2x Szary beżowy (korpus bialy)' },
    { code: '670', name: '2x Szary srebrny 7001 (korpus bialy) struk.' },
    { code: '672', name: '1x Brązowy kasztanowy(korpus biały)' },
    { code: '673', name: '1x Niebieski monumentowy' },
    { code: '675', name: '1x Szary łupek 7015 struktura' },
    { code: '676', name: '1x Ultramaryna 5002' },
    { code: '677', name: '1x Anteak' },
    { code: '680', name: 'Biała folia x2', hexColor: '#F8F8F8' },
    { code: '681', name: '1x Mattex Shine DB 703' },
    { code: '682', name: '1x Mattex Jet black' },
    { code: '683', name: '1x Mattex Shine beige' },
    { code: '684', name: '1x Mattex Shine deep bronze' },
    { code: '685', name: '1x Mattex Shine dark graphite' },
    { code: '686', name: '1x Mattex Shine grey aluminium' },
    { code: '687', name: '1x Mattex Shine white aluminium' },
    { code: '688', name: '1x Mattex umbra grey' },
    { code: '700', name: '1x Szary srebrny 7001 strukt' },
    { code: '701', name: '1x Srebrny metalizowany' },
    { code: '702', name: '1x Aluminium szczotkowane' },
    { code: '704', name: '1x Alux DB 703' },
    { code: '706', name: '1x Alux szary aluminiowy' },
    { code: '708', name: '1x Alux biały aluminiowy' },
    { code: '709', name: '2x Alux biały aluminowy (korpus bialy)' },
    { code: '710', name: '1x Niebieski brylantowy 5007' },
    { code: '722', name: '1x Alux antracytowy' },
    { code: '740', name: '1x Zielony mech 6005' },
    { code: '741', name: '1x Szary czarny 7021 matowy (korpus biały)' },
    { code: '743', name: '1x Szary czarny 7021 matowy (korpus krem)' },
    { code: '760', name: '1x Montana' },
    { code: '770', name: '1x Indian' },
    { code: '771', name: '1x Szary jedwabisty 7044' },
    { code: '773', name: '2x Szary jedwabisty 7044 (korpus bialy)' },
    { code: '780', name: '1x Canadian' },
    { code: '831', name: '1x Szary kamienny 7030 struk.' },
    { code: '870', name: '1x Czerwony 3011 (korpus biały)' },
    { code: '900', name: '1x Siena Noce' },
    { code: '910', name: '1x Siena Rosso' },
    { code: 'RAL1x', name: 'RAL jednostronny' },
    { code: 'RAL2x', name: 'RAL dwustronny' },
  ];

  for (const color of atypicalColors) {
    await prisma.color.upsert({
      where: { code: color.code },
      update: {},
      create: { ...color, type: 'atypical' },
    });
  }
  console.log(`✅ Kolory nietypowe utworzone (${atypicalColors.length})`);

  // ==================== KOLORY AKROBUD (z importów) ====================
  // Kolory tworzone automatycznie przez import - seedujemy aby baza dev miała je od razu
  const akrobudColors = [
    // Usunięto ' 1x' i ' 2x' - to były duplikaty kolorów 'RAL1x'/'RAL2x' (atypical)
    { code: '127', name: '1x Antracyt 7016 gładki' },
    { code: '144', name: 'Golden oak 1x | KREM' },
    { code: '152', name: 'Cremeweiss folia 2x cz.uszcz | KREM' },
    { code: '158', name: '1x Szary bazaltowy 7012 strukt. cz.uszcz.' },
    { code: '160', name: 'Biały z szarą uszczelką' },
    { code: '170', name: 'Biały standard' },
    { code: '174', name: '1x Kość słoniowa 1015 cz.uszczelka' },
    { code: '175', name: '1x Szary jasny 7035 strukt' },
    { code: '206', name: 'Rot 3011 1x | KREM' },
    { code: '207', name: 'Antracyt strukt. Zew./Krem folia wew. | KREM' },
    { code: '354', name: '2x Orzech (korpus szary)' },
    { code: '358', name: '2x Antracyt 7016 (korpus szary) struk.' },
    { code: '361', name: '2x Szary kwarcytowy 7039 (korpus szary) struk.' },
    { code: '418', name: '2x Czarny ulti-matowy (korpus szary)' },
    { code: '420', name: '2x Złoty Dąb (korpus karmel)' },
    { code: '452', name: '2x Antracyt 7016 (korpus szary) gładki' },
    { code: '457', name: '2x Szary czarny 7021 (korpus szary) gładki' },
    { code: '482', name: '2x Mattex Jet black (korpus szary)' },
    { code: '545', name: '1x Szary kwarcytowy 7039 struk.| KREM' },
    { code: '551', name: '1x Czarny ulti-matowy' },
    { code: '552', name: '2x Czarny ulti-matowy (korpus bialy)' },
    { code: '610', name: '1x Złoty Dąb' },
    { code: '674', name: '1x Zielony monumentowy (korpus biały)' },
    { code: '703', name: '1x Winchester' },
    { code: '999', name: 'Nieznany (import)' },
  ];

  for (const color of akrobudColors) {
    await prisma.color.upsert({
      where: { code: color.code },
      update: {},
      create: { ...color, type: 'akrobud' },
    });
  }
  console.log(`✅ Kolory akrobud utworzone (${akrobudColors.length})`);

  // ==================== POWIĄZANIA PROFIL-KOLOR ====================
  // Tworzymy powiązania tylko dla profili oznaczonych jako isAkrobud
  // (te trafiają do magazynu) z kolorami typical/atypical
  const akrobudProfiles = await prisma.profile.findMany({ where: { isAkrobud: true } });
  const displayColors = await prisma.color.findMany({ where: { type: { in: ['typical', 'atypical'] } } });

  for (const profile of akrobudProfiles) {
    for (const color of displayColors) {
      await prisma.profileColor.upsert({
        where: {
          profileId_colorId: {
            profileId: profile.id,
            colorId: color.id,
          },
        },
        update: {},
        create: {
          profileId: profile.id,
          colorId: color.id,
          isVisible: true,
        },
      });
    }
  }
  console.log('✅ Powiązania profil-kolor utworzone');

  // ==================== TYPY PALET ====================
  const palletTypes = [
    {
      name: 'Paleta 4000',
      lengthMm: 6000,
      widthMm: 4000,
      heightMm: 2000,
      loadWidthMm: 960,
      loadDepthMm: 900,
    },
    {
      name: 'Paleta 3500',
      lengthMm: 6000,
      widthMm: 3500,
      heightMm: 2000,
      loadWidthMm: 960,
      loadDepthMm: 900,
    },
    {
      name: 'Paleta 3000',
      lengthMm: 6000,
      widthMm: 3000,
      heightMm: 2000,
      loadWidthMm: 960,
      loadDepthMm: 870,
    },
    {
      name: 'Mała paleta',
      lengthMm: 6000,
      widthMm: 2400,
      heightMm: 1500,
      loadWidthMm: 700,
      loadDepthMm: 6000,
    },
  ];

  for (const pallet of palletTypes) {
    const existing = await prisma.palletType.findFirst({
      where: { name: pallet.name },
    });
    if (!existing) {
      await prisma.palletType.create({ data: pallet });
    } else {
      // Zaktualizuj wartości jeśli się zmieniły
      await prisma.palletType.update({
        where: { id: existing.id },
        data: pallet,
      });
    }
  }
  console.log('✅ Typy palet utworzone');

  // ==================== GŁĘBOKOŚCI PROFILI ====================
  const profileDepths = [
    { profileType: 'VLAK', depthMm: 95, description: 'Profil VLAK - głębokość 95mm' },
    { profileType: 'BLOK', depthMm: 137, description: 'Profil BLOK - głębokość 137mm' },
    { profileType: 'szyba', depthMm: 50, description: 'Szyba - głębokość 50mm' },
    { profileType: 'VARIANT', depthMm: 120, description: 'Profil VARIANT - głębokość 120mm' },
  ];

  for (const depth of profileDepths) {
    await prisma.profileDepth.upsert({
      where: { profileType: depth.profileType },
      update: { depthMm: depth.depthMm, description: depth.description },
      create: depth,
    });
  }
  console.log('✅ Głębokości profili utworzone');

  // ==================== USTAWIENIA DOMYŚLNE ====================
  // Uwaga: gmail_* ustawienia NIE seedujemy - to credentials, ustawiane ręcznie
  const defaultSettings = [
    { key: 'eurToPlnRate', value: '4.35' },
    { key: 'watchFolderUzyteBele', value: './uzyte bele' },
    { key: 'watchFolderCeny', value: './ceny' },
    { key: 'autoArchiveCompletedOrders', value: 'false' },
    { key: 'lowStockThreshold', value: '10' },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ Ustawienia domyślne utworzone');

  // ==================== INICJALIZACJA STANÓW MAGAZYNOWYCH ====================
  // Stany magazynowe dla profili isAkrobud x kolory typical/atypical
  for (const profile of akrobudProfiles) {
    for (const color of displayColors) {
      await prisma.warehouseStock.upsert({
        where: {
          profileId_colorId: {
            profileId: profile.id,
            colorId: color.id,
          },
        },
        update: {},
        create: {
          profileId: profile.id,
          colorId: color.id,
          currentStockBeams: 0,
          updatedById: systemUser.id,
        },
      });
    }
  }
  console.log('✅ Stany magazynowe zainicjalizowane');

  console.log('🎉 Seedowanie zakończone!');
}

main()
  .catch((e) => {
    console.error('❌ Błąd seedowania:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
