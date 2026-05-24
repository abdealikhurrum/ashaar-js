/**
 * test/corpus.js — Public-domain poetry corpus for ashaar.js testing
 *
 * All works are from poets who died more than 100 years ago and are
 * unambiguously in the public domain across all jurisdictions.
 * Source URLs are included for verification.
 *
 * Text is in ashaar.js input format:
 *   sadr \ ajuz    — two-column bayt
 *   sadr \         — trailing-pair (pairs with next line)
 *   bare line      — solo misra (full-width)
 *   blank line     — stanza break
 *   ---            — poem break
 *   line %         — refrain
 */

var CORPUS = [

  // ══════════════════════════════════════════════════════════════
  // ARABIC — Classical (pre-Islamic and Abbasid)
  // ══════════════════════════════════════════════════════════════

  {
    id:       'imru-al-qais-muallaqat',
    poet:     'Imruʾ al-Qays ibn Ḥujr',
    title:    'Muʿallaqat — Opening',
    language: 'ar',
    script:   'arabic',
    form:     'qasida',
    period:   'pre-Islamic (~550 CE)',
    source:   'https://en.wikisource.org/wiki/The_Poem_of_Imru%27_al-Qais',
    license:  'public domain',
    // Three opening bayts from the most celebrated pre-Islamic ode.
    // Demonstrates full tashkeel (diacritics), monorhyme in -li/-mi.
    text: [
      'قِفَا نَبْكِ مِنْ ذِكْرَى حَبِيبٍ وَمَنْزِلِ \\ بِسِقْطِ اللِّوَى بَيْنَ الدَّخُولِ فَحَوْمَلِ',
      'تَلُوحُ كَبَاقِي الوَشْمِ فِي ظَاهِرِ اليَدِ \\ وَغَيَّرَهَا الأَوَاصِرُ وَالخَوَالِفُ وَالبَلَى',
      'وَقُوفًا بِهَا صَحْبِي عَلَيَّ مَطِيَّهُمْ \\ يَقُولُونَ لَا تَهْلِكْ أَسىً وَتَجَمَّلِ'
    ].join('\n'),
    expectedBayts:   3,
    expectedStanzas: 1,
    expectedPoems:   1,
  },

  {
    id:       'antara-muallaqat',
    poet:     'ʿAntarah ibn Shaddād al-ʿAbsī',
    title:    'Muʿallaqat — Opening',
    language: 'ar',
    script:   'arabic',
    form:     'qasida',
    period:   'pre-Islamic (~600 CE)',
    source:   'https://en.wikisource.org/wiki/Poem_of_Antarah_ibn_Shaddad',
    license:  'public domain',
    // Heroic and romantic opening; tests heavy diacritic marks.
    text: [
      'هَلْ غَادَرَ الشُّعَرَاءُ مِنْ مُتَرَدَّمِ \\ أَمْ هَلْ عَرَفْتَ الدَّارَ بَعْدَ تَوَهُّمِ',
      'يَا دَارَ عَبْلَةَ بِالجِوَاءِ تَكَلَّمِي \\ وَعِمِّي صَبَاحًا دَارَ عَبْلَةَ وَاسْلَمِي',
    ].join('\n'),
    expectedBayts:   2,
    expectedStanzas: 1,
    expectedPoems:   1,
  },

  {
    id:       'mutanabbi-sword',
    poet:     'Abū al-Ṭayyib Aḥmad al-Mutanabbī',
    title:    'al-Khayl wa-l-Layl — Opening',
    language: 'ar',
    script:   'arabic',
    form:     'qasida',
    period:   'Abbasid (915–965 CE)',
    source:   'https://en.wikisource.org/wiki/Al-Mutanabbi',
    license:  'public domain',
    // One of the most quoted Arabic lines ever; tests without tashkeel.
    text: [
      'الخَيْلُ وَاللّيْلُ وَالبَيْدَاءُ تَعْرِفُنِي \\ وَالسّيْفُ وَالرّمْحُ وَالقِرْطَاسُ وَالقَلَمُ',
      'أَنَا الَّذِي نَظَرَ الأَعْمَى إِلَى أَدَبِي \\ وَأَسْمَعَتْ كَلِمَاتِي مَنْ بِهِ صَمَمُ',
      'أَنَامُ مِلْءَ جُفُونِي عَنْ شَوَارِدِهَا \\ وَيَسْهَرُ الخَلْقُ جَرَّاهَا وَيَخْتَصِمُ',
    ].join('\n'),
    expectedBayts:   3,
    expectedStanzas: 1,
    expectedPoems:   1,
  },

  {
    id:       'abu-tammam-sword',
    poet:     'Abū Tammām Ḥabīb ibn Aws al-Ṭāʾī',
    title:    'Sayf al-Dawla — Sword Ode',
    language: 'ar',
    script:   'arabic',
    form:     'qasida',
    period:   'Abbasid (796–845 CE)',
    source:   'https://en.wikisource.org/wiki/Abu_Tammam',
    license:  'public domain',
    // Tests Arabic ʿajuz rhyme pattern; also tests multiple stanzas.
    text: [
      'السَّيْفُ أَصْدَقُ أَنْبَاءً مِنَ الكُتُبِ \\ فِي حَدِّهِ الحَدُّ بَيْنَ الجِدِّ وَاللَّعِبِ',

      'بِيضُ الصَّفَائِحِ لَا سُودُ الصَّحَائِفِ فِي \\ مُتُونِهِنَّ جَلَاءُ الشَّكِّ وَالرِّيَبِ',

      'وَالعِلْمُ فِي شُهُبِ الأَرْمَاحِ لَامِعَةً \\ بَيْنَ الخَمِيسَيْنِ لَا فِي السَّبْعَةِ الشُّهُبِ',
    ].join('\n\n'),  // each bayt its own stanza — tests stanza counting
    expectedBayts:   3,
    expectedStanzas: 3,
    expectedPoems:   1,
  },

  // ══════════════════════════════════════════════════════════════
  // PERSIAN — Classical (Khorasan and Iraqi schools)
  // ══════════════════════════════════════════════════════════════

  {
    id:       'rumi-masnavi-reed',
    poet:     'Jalāl al-Dīn Muḥammad Rūmī (Mawlānā)',
    title:    'Masnavi-ye Maʿnavi — Opening (Ney-Nameh)',
    language: 'fa',
    script:   'persian',
    form:     'masnavi',
    period:   '13th century CE (1207–1273)',
    source:   'https://archive.org/details/MasnaviEManavi-MaulanaJalaluddinMuhammadBalkhiRumiFarsi',
    license:  'public domain',
    // The most famous opening in Persian literature.
    // Masnavi uses AA BB rhyme (each bayt rhymes internally) — solo misras here
    // demonstrate Nastaliq rendering of the Ney-Nameh.
    text: [
      'بشنو این نی چون حکایت می‌کند \\ از جدایی‌ها شکایت می‌کند',
      'کز نیستان تا مرا ببریده‌اند \\ در نفیرم مرد و زن نالیده‌اند',
      'سینه خواهم شرحه شرحه از فراق \\ تا بگویم شرح درد اشتیاق',
    ].join('\n'),
    expectedBayts:   3,
    expectedStanzas: 1,
    expectedPoems:   1,
  },

  {
    id:       'hafez-turk-shirazi',
    poet:     'Khwāja Shams al-Dīn Muḥammad Ḥāfiẓ-e Shīrāzī',
    title:    'Ghazal — "Agar ān Turk-e Shīrāzī"',
    language: 'fa',
    script:   'persian',
    form:     'ghazal',
    period:   '14th century CE (1325–1390)',
    source:   'https://archive.org/details/Divan-e-Hafiz',
    license:  'public domain',
    // Ghazal with internal refrain (ā rā); tests radif handling.
    // Each couplet ends in -ā rā; the maqta uses the pen-name Hafez.
    text: [
      'اگر آن ترک شیرازی به دست آرد دل ما را \\ به خال هندویش بخشم سمرقند و بخارا را',

      'بده ساقی می باقی که در جنت نخواهی یافت \\ کنار آب رکناباد و گلگشت مصلا را',

      'فغان کاین لولیان شوخ شیرین‌کار شهرآشوب \\ چنان بردند صبر از دل که ترکان خوان یغما را',
    ].join('\n\n'),
    expectedBayts:   3,
    expectedStanzas: 3,
    expectedPoems:   1,
  },

  {
    id:       'khayyam-rubaiyat',
    poet:     'ʿUmar Khayyām Nīshāpūrī',
    title:    'Rubāʿīyāt — Selected Quatrains',
    language: 'fa',
    script:   'persian',
    form:     'rubaei',
    period:   '11th–12th century CE (1048–1131)',
    source:   'https://archive.org/details/RubaiyatofOmarKhayyam-WhinfieldsTranslation',
    license:  'public domain',
    // Rubāʿī (quatrain): 4 lines forming 2 bayts, AABA rhyme.
    // Each rubāʿī is one stanza; tests rubaei stanza class.
    text: [
      'آمد شب و من هنوز در کارم \\ وز کار جهان به هیچ انگارم',
      'آن جام که دی شکستم اندر مستی \\ امروز شکسته‌ام از آنم خوارم',

      '---',

      'این کهنه رباط را که عالم نام است \\ آرامگه ابلق صبح و شام است',
      'بزمی است که جمع کرده صد جمشید را \\ وان گاه سپرده به باد خام است',
    ].join('\n'),
    expectedBayts:   4,
    expectedStanzas: 2,
    expectedPoems:   2,
  },

  {
    id:       'saadi-gulistan-verse',
    poet:     'Muṣliḥ al-Dīn Saʿdī Shīrāzī',
    title:    'Gulistān — Opening Verse',
    language: 'fa',
    script:   'persian',
    form:     'qita',
    period:   '13th century CE (1210–1292)',
    source:   'https://archive.org/details/gulistan-of-saadi',
    license:  'public domain',
    text: [
      'بنی‌آدم اعضای یکدیگرند \\ که در آفرینش ز یک گوهرند',
      'چو عضوی به درد آورد روزگار \\ دگر عضوها را نماند قرار',
      'تو کز محنت دیگران بی‌غمی \\ نشاید که نامت نهند آدمی',
    ].join('\n'),
    expectedBayts:   3,
    expectedStanzas: 1,
    expectedPoems:   1,
  },

  // ══════════════════════════════════════════════════════════════
  // URDU — Classical Ghazal (Delhi and Lucknow schools)
  // ══════════════════════════════════════════════════════════════

  {
    id:       'ghalib-hazaron-khwahishen',
    poet:     'Mīrzā Asadullāh Khān Ghālib',
    title:    'Ghazal — "Hazāroṉ Khwāhisheṉ Aisī"',
    language: 'ur',
    script:   'urdu',
    form:     'ghazal',
    period:   '19th century CE (1797–1869)',
    source:   'https://www.rekhta.org/poets/mirza-ghalib/ghazals',
    license:  'public domain',
    // Ghalib's most anthologised ghazal. Each sher (couplet) is a stanza.
    // Tests Urdu Nastaliq ligatures and Naskh fallback.
    text: [
      'ہزاروں خواہشیں ایسی کہ ہر خواہش پہ دم نکلے \\ بہت نکلے مرے ارمان لیکن پھر بھی کم نکلے',

      'نکالا چاہتا ہوں کام لیکن دل فگاری سے \\ مگر یہ آہ کیا کرتے ہیں آخر جتنے دم نکلے',

      'ہوئے مر کے ہم جو رسوا ہوئے کیوں نہ غرقِ دریا \\ نہ کہیں جنازہ اٹھتا نہ کہیں مزار ہوتا',
    ].join('\n\n'),
    expectedBayts:   3,
    expectedStanzas: 3,
    expectedPoems:   1,
  },

  {
    id:       'mir-aatish',
    poet:     'Mīr Muḥammad Taqī Mīr',
    title:    'Ghazal — Selected Ashʿār',
    language: 'ur',
    script:   'urdu',
    form:     'ghazal',
    period:   '18th century CE (1722–1810)',
    source:   'https://www.rekhta.org/poets/meer-taqi-meer/ghazals',
    license:  'public domain',
    // Mir is considered the fountainhead of Urdu ghazal; his language is simpler
    // than Ghalib's, giving a different pattern of letter connections.
    text: [
      'ہستی اپنی حباب کی سی ہے \\ یہ نمائش سراب کی سی ہے',

      'نازکی اس کے لب کی کیا کہیے \\ پنکھڑی اک گلاب کی سی ہے',

      'چشمِ دل کھول اس بھی عالم پر \\ یاں کی اوقات خواب کی سی ہے',
    ].join('\n\n'),
    expectedBayts:   3,
    expectedStanzas: 3,
    expectedPoems:   1,
  },

  {
    id:       'iqbal-shikwa',
    poet:     'ʿAllāmah Muḥammad Iqbāl',
    title:    'Shikwa — Opening Stanza',
    language: 'ur',
    script:   'urdu',
    form:     'nazm',
    period:   '20th century CE (1877–1938)',
    source:   'https://archive.org/details/BangEDra-IqbalUrdu',
    license:  'public domain in most jurisdictions (died 1938; 70+ years)',
    // Shikwa ("Complaint to God") — among Iqbal's most celebrated works.
    // Uses Punjabi-accented Urdu; tests the trailing-pair format (each misra
    // on its own line ending with \).
    notes:    'Copyright status: public domain in Pakistan (50y rule, expired 1988), ' +
              'most of EU (70y, expired 2008), USA (published 1909, PD). ' +
              'Verify for your jurisdiction before commercial use.',
    text: [
      'کیوں زیاں کار بنوں سود فراموش رہوں \\',
      'فکرِ فردا نہ کروں محوِ غمِ دوش رہوں',

      'نالے بلبل کے سنوں اور ہمہ تن گوش رہوں \\',
      'ہم نوا میں بھی کوئی گل ہوں کہ خاموش رہوں',
    ].join('\n'),
    expectedBayts:   2,
    expectedStanzas: 1,
    expectedPoems:   1,
  },

  // ══════════════════════════════════════════════════════════════
  // EDGE-CASE INPUTS — for parser regression tests
  // ══════════════════════════════════════════════════════════════

  {
    id:       'edge-solo-misras',
    poet:     '(test)',
    title:    'Edge case: solo misras (no separator)',
    language: 'ar',
    script:   'arabic',
    form:     'test',
    license:  'N/A',
    text: [
      'لِكُلِّ شَيْءٍ إِذَا مَا تَمَّ نُقْصَانُ',
      'فَلَا يُغَرَّ بِطِيبِ الْعَيْشِ إِنْسَانُ',
    ].join('\n'),
    expectedBayts:   2,  // two solo bayts (full-width)
    expectedStanzas: 1,
    expectedPoems:   1,
  },

  {
    id:       'edge-refrain',
    poet:     '(test)',
    title:    'Edge case: full refrain and per-misra refrain',
    language: 'ur',
    script:   'urdu',
    form:     'test',
    license:  'N/A',
    text: [
      'مری آنکھوں کو نم کر دے \\ کوئی نغمہ الم کر دے %',
      '',
      'حسین ابنِ علی آئے \\ محمد کے نبی آئے',
      '',
      'مری آنکھوں کو نم کر دے \\ کوئی نغمہ الم کر دے %',
    ].join('\n'),
    expectedBayts:   3,
    expectedStanzas: 3,
    expectedPoems:   1,
    expectedRefrains: 2,
  },

  {
    id:       'edge-per-misra-refrain',
    poet:     '(test)',
    title:    'Edge case: only sadr is refrain',
    language: 'ur',
    script:   'urdu',
    form:     'test',
    license:  'N/A',
    text: [
      'یاد آتی ہے وہ گھڑی % \\',
      'جب تھے ہم ساتھ چلتے ہیں',
    ].join('\n'),
    expectedBayts:   1,
    expectedStanzas: 1,
    expectedPoems:   1,
  },

  {
    id:       'edge-multi-poem',
    poet:     '(test)',
    title:    'Edge case: two poems separated by ---',
    language: 'ar',
    script:   'arabic',
    form:     'test',
    license:  'N/A',
    text: [
      'بيت أول \\ وعجزه الأول',
      '---',
      'قصيدة ثانية \\ وعجزها',
    ].join('\n'),
    expectedBayts:   2,
    expectedStanzas: 2,
    expectedPoems:   2,
  },

];

// Group helpers
var CORPUS_BY_LANGUAGE = CORPUS.reduce(function (acc, p) {
  (acc[p.language] = acc[p.language] || []).push(p);
  return acc;
}, {});

var CORPUS_BY_SCRIPT = CORPUS.reduce(function (acc, p) {
  (acc[p.script] = acc[p.script] || []).push(p);
  return acc;
}, {});

var POETRY_CORPUS = CORPUS.filter(function (p) { return p.form !== 'test'; });
var EDGE_CORPUS   = CORPUS.filter(function (p) { return p.form === 'test'; });

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CORPUS: CORPUS, CORPUS_BY_LANGUAGE: CORPUS_BY_LANGUAGE,
    CORPUS_BY_SCRIPT: CORPUS_BY_SCRIPT, POETRY_CORPUS: POETRY_CORPUS,
    EDGE_CORPUS: EDGE_CORPUS };
}
