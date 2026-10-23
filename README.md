# Hidup Kedua — Life Simulator

Game simulasi kehidupan berbasis teks yang berjalan 100% di browser (client-side PWA). Tanpa backend: progres tersimpan otomatis di IndexedDB setiap aksi, dan bisa dimainkan offline setelah dibuka sekali.

Fase saat ini: latar **Indonesia**, mata uang **IDR**, semua teks berbahasa Indonesia.

---

## 1. Prasyarat

| Alat | Versi yang dipakai | Catatan |
|---|---|---|
| Node.js | **24.x** (diuji 24.17.0) | Lihat `.nvmrc`. Minimal 22.6 bila ingin menjalankan `scripts/*.ts` langsung dengan `node`. |
| npm | 11.x (diuji 11.13.0) | Ikut Node. |
| Git | versi apa pun | |

Semua dependency dikunci versinya di `package.json` dan `package-lock.json`. Jangan menaikkan versi tanpa alasan.

| Paket | Versi |
|---|---|
| react, react-dom | 18.3.1 |
| dexie | 4.0.10 |
| vite | 5.4.11 |
| typescript | 5.6.3 |
| vitest | 2.1.8 |
| @types/react, @types/react-dom | 18.3.12, 18.3.1 |

Tidak ada plugin Vite. JSX dikompilasi oleh esbuild bawaan Vite (`esbuild.jsx: 'automatic'`), dan PWA dibuat manual (`public/sw.js` + `public/manifest.webmanifest`).

## 2. Instalasi

```bash
git clone https://github.com/adeehilman/life-simulator.git
cd life-simulator
npm ci
```

Gunakan `npm ci` (bukan `npm install`) agar versi persis sama dengan `package-lock.json`.

## 3. Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan di `http://localhost:5173` (service worker **tidak** aktif di mode ini). |
| `npm run typecheck` | `tsc --noEmit` dengan mode strict. |
| `npm test` | Unit test mesin (Vitest). |
| `npm run build` | Typecheck lalu build produksi ke `dist/`. |
| `npm run preview` | Menyajikan `dist/` di `http://localhost:4173` (service worker aktif). |
| `node scripts/demo-localization.ts` | Demo lokalisasi negara (gaji, pajak, usia legal, nama). |

## 4. Verifikasi setelah instalasi

Konfigurasi dianggap sama bila semua ini lolos:

1. `npm run typecheck` → tanpa output error.
2. `npm test` → **11 test lolos**.
3. `npm run build` → selesai tanpa error.
4. `npm run preview`, buka `http://localhost:4173`:
   - Muncul karakter yang baru lahir di sebuah kota di Indonesia, saldo `Rp0`.
   - Klik **+ Umur** → umur bertambah dan (sering) muncul pop-up kejadian yang wajib dipilih.
   - Reload halaman → umur, log, dan pop-up yang belum dijawab tetap ada.
5. Uji offline (Chrome): buka sekali, DevTools → Network → **Offline**, reload → game tetap terbuka.

## 5. Struktur proyek

```
src/
  types/types.ts          Skema utama (flat entity map). schema.ts = versi lama, tidak dipakai.
  data/countries/         Konfigurasi negara: id.ts (aktif), us.ts & generic.ts (belum aktif), index.ts
  content/                Konten statis: careers.ts, catalog.ts (aset, penyakit), events.ts
  engine/
    tick.ts               Pipeline "+ Umur" 7 langkah
    events.ts             Pemilih event berbobot, resolusi pilihan, efek
    formula.ts            Evaluator Formula/Condition (AST, tanpa eval)
    actions.ts            Semua aksi menu (sekolah, kerja, aset, hubungan, aktivitas)
    lifecycle.ts          Kematian, warisan, "lanjutkan sebagai anak"
    education.ts          Pendaftaran & kemajuan sekolah
    people.ts             Pembuatan karakter/NPC, kehidupan baru, kesuburan
    localization.ts       Format uang, PPP, pajak, Gompertz, generator nama
    rng.ts                RNG deterministik (mulberry32) yang state-nya ikut disimpan
    world.ts              Struktur World + helper
    f.ts                  Builder untuk menulis konten
    engine.test.ts        Test
  db/db.ts                Dexie: tabel, persistWorld, loadLatestWorld
  ui/                     App.tsx, components.tsx, tabs.tsx, format.ts
  styles.css
public/                   sw.js, manifest.webmanifest, icon.svg
scripts/demo-localization.ts
```

## 6. Aturan arsitektur (wajib diikuti saat mengubah kode)

- **Import memakai ekstensi `.ts`/`.tsx`** (`allowImportingTsExtensions`). Ini agar file bisa dijalankan langsung oleh Node dan Vite.
- **Flat entity map.** Person, relationship (edge berarah), employment, education, asset, account disimpan terpisah dengan `id`. Jangan menyarangkan data di dalam pemain; "lanjutkan sebagai anak" hanya mengganti `SaveGame.currentPlayerId`.
- **Uang = integer satuan minor** mata uang (`MinorUnits`). IDR memakai `minorDigits: 0`. Harga/gaji katalog ditulis dalam **international dollar** lalu dikonversi lewat `pppFactor` (dan `wageIndex` untuk gaji).
- **Konten adalah data murni** (tanpa fungsi). Rumus peluang ditulis sebagai `Formula` AST di `types.ts`; tulis konten memakai builder di `engine/f.ts`.
- **Setiap perubahan state lewat `run()` di `App.tsx`:** clone → mutasi → `persistWorld` → render. RNG ikut tersimpan, jadi reload tidak bisa mengulang undian.
- **Event:** 2–4 pilihan (dipaksa oleh tipe tuple), modal tidak bisa ditutup tanpa memilih, `pendingEvent` disimpan di save.
- **Dexie hanya menyimpan data save.** Konten ikut bundle JS. Mengubah indeks tabel Dexie = naikkan `version()` dan tulis migrasi.
- **Negara aktif** diatur di `src/data/countries/index.ts` (`ACTIVE_COUNTRY_CODES`, `DEFAULT_COUNTRY_CODE`).

## 7. Aturan konten (clean-room)

- Semua teks, nama, dan angka **ditulis sendiri**. Jangan menyalin teks, aset, atau angka dari game lain, dan jangan memakai nama merek/IP pihak ketiga.
- Bahasa Indonesia, gaya humor satir ringan. Token teks: `{player}`, nama peran (`{ibu}`, `{pacar}`, …), `{money}`.
- Angka dunia nyata di konfigurasi negara (pajak, usia legal, kurs) adalah **perkiraan** untuk gameplay; cek ulang sebelum rilis.
- `FEATURE_MAP.md` hanya peta jenis fitur (dari nama class), bukan sumber konten.

## 8. Catatan

- Service worker hanya didaftarkan di build produksi (`import.meta.env.PROD`). Panel browser bawaan beberapa aplikasi bisa memblokir service worker; uji offline di Chrome biasa.
- Emoji bendera tampil sebagai huruf ("ID") di Windows karena Windows tidak merender emoji bendera.
