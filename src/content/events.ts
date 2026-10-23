// Original Indonesian event writing. Tokens: {player}, role names ({ibu}, {pacar}…), {money}.
import {
  add, bar, c, clamp, curve, dHidden, dStat, hidden, karma, money, mul, notFlag, stat,
} from '../engine/f.ts';
import type {
  EventChoice, EventChoices, EventOutcome, EventPreconditions, Formula, GameEvent, LogTone, RoleSelector, Effect,
} from '../types/types.ts';

let outcomeSeq = 0;
const out = (text: string, tone: LogTone, effects: Effect[] = [], weight: number | Formula = 1): EventOutcome =>
  ({ id: `o${outcomeSeq++}`, text, tone, effects, weight: typeof weight === 'number' ? c(weight) : weight });
const choice = (id: string, label: string, ...outcomes: [EventOutcome, ...EventOutcome[]]): EventChoice => ({ id, label, outcomes });

interface EvInput {
  id: string;
  module: string;
  prompt: string;
  age: [number, number];
  choices: EventChoices;
  roles?: RoleSelector[];
  pre?: Partial<EventPreconditions>;
  weight?: number | Formula;
  cooldownYears?: number;
  once?: boolean;
}
const ev = (e: EvInput): GameEvent => ({
  id: e.id,
  module: e.module,
  prompt: e.prompt,
  roles: e.roles ?? [],
  pre: {
    minAge: e.age[0], maxAge: e.age[1], countries: [], excludeCountries: [], requiredFlags: {}, forbiddenFlags: [], conditions: [],
    ...e.pre,
  },
  weight: typeof e.weight === 'number' || e.weight === undefined ? c(e.weight ?? 10) : e.weight,
  cooldownYears: e.cooldownYears ?? 5,
  once: e.once ?? false,
  choices: e.choices,
});
const role = (name: string, relation: RoleSelector['relation'], extra: Partial<RoleSelector> = {}): RoleSelector =>
  ({ role: name, relation, alive: true, required: true, ...extra });

/** 0..1 chance that grows with smarts. */
const smartOdds = (base = 0.2) => clamp(add(c(base), mul(curve(stat('smarts')), c(0.7))));

export const EVENTS: GameEvent[] = [
  // ───────── Bayi & balita ─────────
  ev({
    id: 'bayi-lagu-sumbang', module: 'family', age: [0, 2], once: true,
    roles: [role('ibu', ['parent'], { sex: 'female' })],
    prompt: '{ibu} menyanyikan lagu nina bobo dengan nada yang membuat kucing tetangga pindah rumah. Apa reaksimu?',
    choices: [
      choice('nangis', 'Menangis sekencang-kencangnya',
        out('Aku menangis sampai {ibu} menyerah dan memutar musik dari ponsel.', 'neutral', [bar('ibu', -2)])),
      choice('tidur', 'Tidur saja, demi perdamaian',
        out('Aku tertidur. {ibu} yakin suaranya merdu, dan aku tidak akan pernah membantahnya.', 'positive', [bar('ibu', 5)])),
      choice('ikut', 'Ikut bernyanyi dengan ocehan',
        out('Aku ikut mengoceh. Duet kami terdengar sampai pos ronda.', 'positive', [bar('ibu', 8), dStat('happiness', 4)])),
    ],
  }),
  ev({
    id: 'balita-krayon', module: 'family', age: [2, 5], once: true,
    roles: [role('ortu', ['parent'])],
    prompt: 'Kamu menemukan krayon dan dinding ruang tamu yang masih putih bersih. Sebuah kanvas raksasa, menurutmu.',
    choices: [
      choice('dinding', 'Gambar mural di dinding',
        out('Aku melukis mahakarya di dinding. {ortu} tidak menganggapnya seni.', 'negative', [bar('ortu', -6), dStat('happiness', 5)], 3),
        out('Aku melukis di dinding. {ortu} malah memotretnya dan memamerkannya ke grup keluarga.', 'positive', [bar('ortu', 4), dStat('happiness', 6)], 1)),
      choice('kertas', 'Minta kertas dulu',
        out('Aku menggambar di kertas. {ortu} menempelkannya di kulkas, galeri paling bergengsi di rumah.', 'positive', [bar('ortu', 6), dStat('smarts', 2)])),
    ],
  }),
  ev({
    id: 'balita-telan-kancing', module: 'health', age: [1, 4], once: true, weight: 4,
    prompt: 'Ada kancing baju mengilap di lantai. Bentuknya sangat mirip permen.',
    choices: [
      choice('telan', 'Masukkan ke mulut',
        out('Aku menelan kancingnya. Dua hari kemudian kancing itu kembali ke dunia dengan selamat.', 'negative', [dStat('health', -5)], 3),
        out('Aku tersedak dan dilarikan ke klinik. Tagihannya {money}.', 'negative', [dStat('health', -12), money(-80)], 1)),
      choice('lempar', 'Lempar ke bawah kursi',
        out('Aku melempar kancing itu ke bawah kursi, tempat semua benda hilang di rumah ini berkumpul.', 'neutral')),
    ],
  }),

  // ───────── Sekolah ─────────
  ev({
    id: 'sekolah-contekan', module: 'education', age: [8, 17], cooldownYears: 4,
    pre: { conditions: [{ op: 'inSchool' }] },
    prompt: 'Ada ulangan matematika mendadak. Anak di sebelahmu menyodorkan contekan dengan tatapan penuh dosa.',
    choices: [
      choice('contek', 'Ambil contekannya',
        out('Aku menyontek dan dapat nilai bagus. Guruku curiga karena aku bahkan menulis nama anak sebelah.', 'negative', [dHidden('karma', -5), dStat('happiness', 2)], karma(0.5)),
        out('Aku ketahuan menyontek. Kertas ulanganku disobek di depan kelas, dramatis sekali.', 'negative', [dHidden('karma', -5), dStat('happiness', -8)], 1)),
      choice('sendiri', 'Kerjakan sendiri',
        out('Aku mengerjakan sendiri dan mendapat nilai memuaskan. Otakku ternyata berfungsi.', 'positive', [dStat('smarts', 3), dStat('happiness', 4)], smartOdds()),
        out('Aku mengerjakan sendiri dan nilainya merah. Setidaknya merahnya jujur.', 'negative', [dHidden('karma', 2), dStat('happiness', -4)], 1)),
      choice('lapor', 'Laporkan ke guru',
        out('Aku melapor ke guru. Guru senang, teman sekelas menjulukiku "CCTV berjalan".', 'neutral', [dHidden('karma', 3), dStat('happiness', -3)])),
    ],
  }),
  ev({
    id: 'sekolah-pajak-koridor', module: 'education', age: [10, 16], cooldownYears: 3,
    pre: { conditions: [{ op: 'inSchool' }] },
    prompt: 'Kakak kelas berbadan besar meminta uang jajanmu. Katanya itu "pajak koridor", berlaku untuk semua yang lewat.',
    choices: [
      choice('bayar', 'Bayar saja',
        out('Aku membayar pajak koridor. Sistem perpajakan sekolah ini lebih efektif dari yang kukira.', 'negative', [dStat('happiness', -5)])),
      choice('lawan', 'Lawan',
        out('Aku melawan dan menang! Sejak hari itu koridor bebas pajak.', 'positive', [dHidden('notoriety', 5), dStat('happiness', 8)], clamp(add(c(0.2), mul(stat('health'), c(0.004))))),
        out('Aku melawan dan kalah telak. Hidungku butuh waktu untuk memaafkanku.', 'negative', [dStat('health', -10), dStat('looks', -2)], 1)),
      choice('lapor', 'Lapor ke guru BK',
        out('Aku lapor guru BK. Kakak kelas itu dipanggil, lalu esoknya pura-pura tidak mengenalku. Menang.', 'positive', [dHidden('karma', 2)], 2),
        out('Aku lapor guru BK. Guru BK sedang cuti, dan kakak kelas itu tahu siapa pelapornya.', 'negative', [dStat('health', -5), dStat('happiness', -5)], 1)),
    ],
  }),
  ev({
    id: 'sekolah-joget-viral', module: 'education', age: [11, 18], cooldownYears: 4,
    prompt: 'Teman-teman sekelas membuat video joget untuk media sosial. Mereka kekurangan satu orang di barisan belakang.',
    choices: [
      choice('ikut', 'Ikut joget',
        out('Videonya ditonton 2 juta kali. Semua komentar membahas gerakanku yang salah ketukan.', 'positive', [dStat('happiness', 6), dHidden('notoriety', 2)], 1),
        out('Videonya hanya ditonton 14 kali, 9 di antaranya oleh kami sendiri.', 'neutral', [dStat('happiness', 2)], 2)),
      choice('tolak', 'Tolak dengan sopan',
        out('Aku menolak. Martabatku utuh, walau grup kelas sepi selama seminggu.', 'neutral', [dStat('happiness', -1)])),
    ],
  }),
  ev({
    id: 'sekolah-ketua-kelas', module: 'education', age: [9, 17], once: true, weight: 6,
    pre: { conditions: [{ op: 'inSchool' }] },
    prompt: 'Wali kelas membuka pemilihan ketua kelas. Kandidat lainnya menjanjikan "jam kosong setiap hari".',
    choices: [
      choice('maju', 'Mencalonkan diri',
        out('Aku menang pemilihan! Janji kampanyeku: piket yang adil. Revolusioner.', 'positive', [dStat('happiness', 8), dHidden('discipline', 3)], add(c(0.2), mul(stat('looks'), c(0.004)), mul(stat('smarts'), c(0.004)))),
        out('Aku kalah. Ternyata janji jam kosong lebih menarik daripada keadilan.', 'negative', [dStat('happiness', -4)], 1)),
      choice('pilih', 'Pilih kandidat lain saja',
        out('Aku memilih kandidat jam kosong. Jam kosongnya tidak pernah terjadi. Politik.', 'neutral')),
    ],
  }),

  // ───────── Remaja & dewasa muda ─────────
  ev({
    id: 'dewasa-investasi-bodong', module: 'finance', age: [17, 70], cooldownYears: 6,
    prompt: 'Seseorang di media sosial mengajakmu berinvestasi. Untungnya "pasti" 300% per minggu, dijamin oleh foto mobil sewaan.',
    choices: [
      choice('ikut', 'Ikut investasi',
        out('Aku menyetor uang dan akunnya menghilang esok harinya. Aku kehilangan {money}.', 'negative', [money(-600), dStat('happiness', -10)], 9),
        out('Ajaibnya aku sempat menarik untung {money} sebelum platformnya kabur. Jangan diulangi.', 'positive', [money(300), dHidden('karma', -2)], karma(0.1, 0.1))),
      choice('abaikan', 'Abaikan',
        out('Aku mengabaikannya. Tiga bulan kemudian beritanya muncul di televisi. Aku merasa bijak.', 'positive', [dStat('smarts', 1)])),
      choice('lapor', 'Laporkan akunnya',
        out('Aku melaporkan akun itu. Ia diblokir, lalu muncul lagi dengan nama baru dua jam kemudian.', 'neutral', [dHidden('karma', 2)])),
    ],
  }),
  ev({
    id: 'dewasa-dompet-angkot', module: 'events', age: [12, 90], cooldownYears: 8,
    prompt: 'Kamu menemukan dompet tebal tertinggal di kursi angkot. Isinya uang tunai dan KTP seseorang.',
    choices: [
      choice('kembalikan', 'Kembalikan ke pemiliknya',
        out('Aku mengembalikan dompetnya. Pemiliknya menangis terharu dan memberiku imbalan {money}.', 'positive', [dHidden('karma', 8), money(40)], 1),
        out('Aku mengembalikan dompetnya. Pemiliknya menghitung isinya di depanku, lalu pergi tanpa terima kasih.', 'neutral', [dHidden('karma', 8)], 1)),
      choice('ambil', 'Ambil uangnya',
        out('Aku mengambil uangnya, {money}. Dompetnya kubuang. Tidurku jadi kurang nyenyak.', 'negative', [money(120), dHidden('karma', -10), dStat('happiness', -2)])),
    ],
  }),
  ev({
    id: 'dewasa-saudara-pinjam', module: 'family', age: [20, 80], cooldownYears: 5,
    prompt: 'Saudara jauh yang hanya muncul saat Lebaran tiba-tiba datang meminjam uang untuk "bisnis yang pasti berhasil".',
    pre: { conditions: [{ op: 'balance', cmp: 'gt', value: 500 }] },
    choices: [
      choice('pinjamkan', 'Pinjamkan',
        out('Aku meminjamkan {money}. Bisnisnya gagal, dan saudara itu kini hanya muncul saat Lebaran tanpa menyapaku.', 'negative', [money(-500), dHidden('karma', 3)], 4),
        out('Aku meminjamkan uang dan ajaibnya dikembalikan lengkap. Keajaiban ini akan kuceritakan ke cucu.', 'positive', [dHidden('karma', 5)], 1)),
      choice('tolak', 'Tolak dengan halus',
        out('Aku menolak dengan halus. Namaku kini jadi topik hangat di arisan keluarga.', 'neutral', [dStat('happiness', -2)])),
    ],
  }),
  ev({
    id: 'kerja-lembur-minggu', module: 'career', age: [18, 70], cooldownYears: 3,
    pre: { conditions: [{ op: 'employed' }] },
    prompt: 'Bosmu memintamu lembur hari Minggu tanpa bayaran tambahan. Alasannya: "Kita ini keluarga."',
    choices: [
      choice('iya', 'Iya, Pak',
        out('Aku lembur. Senin pagi, "keluarga" ini lupa mengucapkan terima kasih.', 'neutral', [dStat('happiness', -5), dStat('health', -2)])),
      choice('tolak', 'Tolak dengan sopan',
        out('Aku menolak dengan sopan. Bos menghargai batasanku, dan aku kaget sendiri.', 'positive', [dStat('happiness', 4)], 1),
        out('Aku menolak. Sejak itu namaku selalu muncul di daftar "evaluasi kinerja".', 'negative', [dStat('happiness', -3)], 1)),
      choice('sakit', 'Pura-pura sakit',
        out('Aku pura-pura sakit. Sayangnya aku mengunggah foto piknik hari itu juga.', 'negative', [dHidden('karma', -3), dStat('happiness', -4)], 1),
        out('Aku pura-pura sakit dan menikmati hari Minggu dengan tenang.', 'positive', [dHidden('karma', -2), dStat('happiness', 5)], 2)),
    ],
  }),
  ev({
    id: 'dewasa-buzzer', module: 'events', age: [19, 60], once: true, weight: 5,
    prompt: 'Sebuah akun misterius menawarimu kerja sampingan: menulis komentar memuji tokoh yang tidak kamu kenal.',
    choices: [
      choice('terima', 'Terima tawarannya',
        out('Aku menerima dan dibayar {money}. Jempolku kini lebih fasih memuji orang asing daripada keluarga sendiri.', 'negative', [money(200), dHidden('karma', -6)])),
      choice('tolak', 'Tolak',
        out('Aku menolak. Akun itu membalas dengan stiker jempol, lalu menawari tetanggaku.', 'neutral', [dHidden('karma', 2)])),
    ],
  }),
  ev({
    id: 'dewasa-tetangga-dangdut', module: 'events', age: [16, 90], cooldownYears: 6,
    prompt: 'Tetangga memutar musik keras pukul dua pagi. Bass-nya membuat gelas di lemari ikut berdansa.',
    choices: [
      choice('tegur', 'Tegur langsung',
        out('Aku menegur dengan sopan. Tetangga minta maaf dan mengecilkan suara... sampai minggu depan.', 'neutral', [], 2),
        out('Aku menegur, dan dia malah tersinggung. Pagar kami kini terasa seperti perbatasan negara.', 'negative', [dStat('happiness', -4)], 1)),
      choice('joget', 'Ikut berjoget',
        out('Aku ikut berjoget sampai subuh. Kami resmi berteman, kurang tidur, tapi bahagia.', 'positive', [dStat('happiness', 6), dStat('health', -2)])),
      choice('rt', 'Lapor ke Pak RT',
        out('Aku melapor ke Pak RT. Ternyata Pak RT ada di pesta itu, di barisan paling depan.', 'neutral', [dStat('happiness', -1)])),
    ],
  }),
  ev({
    id: 'dewasa-kucing-liar', module: 'events', age: [5, 90], cooldownYears: 10,
    prompt: 'Seekor kucing liar kurus mengikutimu pulang sambil mengeong penuh perhitungan.',
    choices: [
      choice('makan', 'Beri makan',
        out('Aku memberinya makan. Kini kucing itu datang setiap hari, membawa dua temannya.', 'positive', [dHidden('karma', 4), dStat('happiness', 4)])),
      choice('usir', 'Usir',
        out('Aku mengusirnya. Dia menatapku dengan pandangan yang akan kuingat seumur hidup.', 'negative', [dHidden('karma', -3)])),
    ],
  }),
  ev({
    id: 'dewasa-undian-minimarket', module: 'events', age: [18, 90], cooldownYears: 3,
    prompt: 'Kasir minimarket menawarkan kupon undian berhadiah setiap belanja kelipatan tertentu. Ambil kuponnya?',
    choices: [
      choice('ikut', 'Ikut undian',
        out('Aku memenangkan hadiah utama senilai {money}! Kasirnya terlihat lebih kaget daripada aku.', 'positive', [money(5_000), dStat('happiness', 15)], karma(0.02, 0.04)),
        out('Aku memenangkan hadiah hiburan: sebungkus mi instan. Sesuai statistik.', 'neutral', [], 1)),
      choice('tidak', 'Tidak usah',
        out('Aku menolak kuponnya. Kasir mengangguk seperti biasa menghadapi orang realistis.', 'neutral')),
    ],
  }),

  // ───────── Hubungan ─────────
  ev({
    id: 'ibu-kapan-nikah', module: 'family', age: [24, 45], cooldownYears: 3,
    roles: [role('ibu', ['parent'], { sex: 'female' })],
    pre: { conditions: [notFlag('married')] },
    prompt: '{ibu} bertanya "kapan nikah?" untuk ke-47 kalinya tahun ini, kali ini di depan seluruh keluarga besar.',
    choices: [
      choice('sopan', 'Jawab "doakan saja, Bu"',
        out('Aku menjawab "doakan saja". {ibu} langsung mendoakan dengan suara keras, lengkap dengan kriteria calon.', 'neutral', [bar('ibu', 2)])),
      choice('balik', 'Balik bertanya "kapan pensiun nanya?"',
        out('Aku membalas dengan candaan. Satu meja tertawa, kecuali {ibu}.', 'negative', [bar('ibu', -8), dStat('happiness', 3)])),
      choice('kabur', 'Pura-pura ditelepon bos',
        out('Aku pura-pura menerima telepon penting. {ibu} tahu, aku tahu dia tahu, semua pura-pura tidak tahu.', 'neutral')),
    ],
  }),
  ev({
    id: 'pacar-lupa-anniversary', module: 'romance', age: [16, 70], cooldownYears: 3,
    roles: [role('pacar', ['partner', 'spouse'])],
    prompt: '{pacar} lupa hari jadi kalian dan malah mengajakmu menemaninya membeli ban motor.',
    choices: [
      choice('maafkan', 'Maafkan saja',
        out('Aku memaafkan {pacar}. Ban motornya bagus, dan kami makan bakso sesudahnya. Romantis versi hemat.', 'positive', [bar('pacar', 5)])),
      choice('ngambek', 'Ngambek tiga hari',
        out('Aku ngambek tiga hari. {pacar} minta maaf dengan martabak spesial.', 'neutral', [bar('pacar', -2), dStat('happiness', 2)], clamp(add(c(0.3), mul(stat('looks'), c(0.005))))),
        out('Aku ngambek, dan {pacar} malah ikut ngambek karena aku ngambek. Situasi makin rumit.', 'negative', [bar('pacar', -12)], 1)),
    ],
  }),
  ev({
    id: 'grup-keluarga-hoaks', module: 'family', age: [25, 90], cooldownYears: 5,
    roles: [role('kerabat', ['parent', 'sibling'])],
    prompt: '{kerabat} mengirim pesan berantai ke grup keluarga: air rebusan sandal jepit bisa menyembuhkan segala penyakit.',
    choices: [
      choice('coba', 'Coba resepnya',
        out('Aku mencobanya. Satu-satunya yang sembuh adalah rasa penasaranku, digantikan sakit perut.', 'negative', [dStat('health', -6)])),
      choice('koreksi', 'Koreksi dengan sopan',
        out('Aku mengirim tautan klarifikasi dengan sopan. {kerabat} membalas "kamu terlalu percaya internet".', 'neutral', [bar('kerabat', -3), dStat('smarts', 1)])),
      choice('keluar', 'Keluar dari grup',
        out('Aku keluar dari grup. Lima menit kemudian aku dimasukkan lagi dengan pesan "jangan baper".', 'neutral')),
    ],
  }),

  // ───────── Kesehatan & usia lanjut ─────────
  ev({
    id: 'dokter-kolesterol', module: 'health', age: [35, 90], cooldownYears: 6,
    prompt: 'Hasil cek darahmu keluar. Kata dokter, kadar kolesterolmu "cukup ambisius". Dia menyarankan diet ketat.',
    choices: [
      choice('diet', 'Mulai diet ketat',
        out('Aku konsisten diet setahun penuh. Gorengan tinggal kenangan, dan badanku berterima kasih.', 'positive', [dStat('health', 8), dStat('looks', 2)], clamp(add(c(0.1), mul(hidden('discipline'), c(0.008))))),
        out('Aku diet tiga hari, lalu khilaf di warung nasi padang. Diet ditunda sampai tahun baru.', 'negative', [dStat('health', -2)], 1)),
      choice('abaikan', 'Abaikan saja',
        out('Aku mengabaikan saran dokter. Kolesterolku terus mengejar cita-citanya.', 'negative', [dStat('health', -5)])),
    ],
  }),
  ev({
    id: 'lansia-ponsel-pintar', module: 'events', age: [58, 99], cooldownYears: 10,
    prompt: 'Anak tetangga menawarkan diri mengajarimu memakai ponsel pintar, termasuk cara mengirim stiker.',
    choices: [
      choice('belajar', 'Belajar dengan semangat',
        out('Aku belajar memakai ponsel. Sekarang aku mengirim stiker selamat pagi ke 14 grup setiap hari.', 'positive', [dStat('smarts', 3), dStat('happiness', 5)])),
      choice('tolak', 'Tolak, ponsel lama masih bisa telepon',
        out('Aku menolak. Ponsel lamaku masih bisa menelepon dan menyalakan senter. Itu sudah cukup.', 'neutral')),
    ],
  }),
  ev({
    id: 'lansia-reuni', module: 'friends', age: [45, 90], cooldownYears: 8,
    prompt: 'Undangan reuni sekolah datang. Panitia menulis "dress code: sukses".',
    choices: [
      choice('datang', 'Datang',
        out('Aku datang ke reuni. Separuh teman sibuk menawarkan asuransi, separuh lagi menawarkan produk kesehatan.', 'neutral', [dStat('happiness', 2)], 1),
        out('Aku datang dan bertemu teman lama yang tulus. Kami tertawa seperti remaja lagi.', 'positive', [dStat('happiness', 8)], 1)),
      choice('absen', 'Tidak datang',
        out('Aku tidak datang. Fotonya kulihat di grup, dan semua tampak lebih tua kecuali aku. Semoga.', 'neutral')),
    ],
  }),
];
