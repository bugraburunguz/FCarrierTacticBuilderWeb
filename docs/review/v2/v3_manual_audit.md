# V3 manuel denetim (V3-02 girdisi)
Kapsam: yalnız `11_GLASSMORPHISM_TASARIM_V3.md` §3 token'ları ve Q1–Q10 kapıları. Kod değiştirilmedi; script/hook/harici araç yok (sayımlar `Grep` ile salt-okur, 13 Ekim 2026, `src/`). Sayılar yaklaşıktır; `cardDesign` (kart config'i) ve test dosyaları ayrıldı.

## Token uyumu (§3)
| Bulgu | Sayı | Not |
|---|---|---|
| Sabit hex renk (`#rrggbb`) | ~145 | Kart tasarım config'i hariç yasak (CLAUDE.md). Çoğu `lib/cardDesign`, `PositionCard`, saha SVG'leri |
| Palet sınıfı (`emerald/teal/slate/sky/...-NNN`) | 9 | `PlayerAvatar`, `SquadDensity`, `PositionCard`; 11 §8 Q2 yasağı |
| Mevcut token adları | `--bg --surface --surface-2 --line --ink --muted --accent*` | v3 adları (`--glass-1/2/3`, `--aurora-*`, `--chem-*`, `--rate-*`, `--faint`, `--radius-*`) **yok**; eşleme tablosu V3-01'de |
| Font | Barlow Condensed + IBM Plex Sans/Mono (self-host) | v3 gövde fontu Inter: **dosya yok** |
| Cam / aurora | `backdrop-filter` kullanımı 0, aurora katmanı yok | Tümü V3-01 |

## Kapılar (Q1–Q10) — mevcut durum
| Kapı | Durum | Kanıt |
|---|---|---|
| Q1 yükleme/boş/hata üçlüsü | Kısmen | `Skeleton`, `EmptyState`, `ErrorBox` var; her sorguda üçlü zorunlu değil. UT kadro kurucuda yükleme "Yükleniyor…" metni |
| Q2 11px altı metin + renk token'ı | **Kırık** | `text-[9px]` (PositionCard ×3), `text-[10px]/[11px]/[11.5px]` toplam ~26 yer; hex/palet bulguları yukarıda |
| Q3 375/768/1280 yatay taşma | Ölçülmedi | Playwright 3 kırılım V3-02'de; UT kadro kurucuda 820px kırılımı var (`min-[820px]`) |
| Q4 klavye + axe | Ölçülmedi | axe yok (V3-02); saha slotlarında klavye taşıma (M) var |
| Q5 kontrast (en kötü aurora) | Uygulanamaz | Cam/aurora henüz yok; mevcut koyu tema `--muted` #a9b0ba / `--surface` #12151a ≈ 8:1 (yeterli) |
| Q6 yalnız yeni motor uçları | Uygulanamaz | v3 kariyer ekranları V3-06 |
| Q7 bilinen buglar | Kısmen | UT Kadro Kurucu için WEB-BUG-08/11 kapandı; WEB-UX-03/06, RULE-01/02 UI kısımları açık |
| Q8 açıklama paragrafı / HelpPopover | **Kırık** | ~164 `<p … text-xs/sm>` bloğu, `HelpPopover` 3 dosyada |
| Q9 reduced transparency/motion | Kısmen | yalnız `prefers-reduced-motion` (süreleri 0.01ms yapar); `prefers-reduced-transparency`/`prefers-contrast` yok |
| Q10 ilk JS ≤ 250 KB, lazy rota | **Kırık** | `React.lazy` 0 kullanım; tüm rotalar tek pakette |

## Ek gözlemler (UT kadro kurucu ekranı, gözle) → yeni kapılar Q11–Q15 (11 §8'e eklendi)
1. Saha rol etiketi kesiliyor ("ADVANCED FORWARD - …").
2. Pasif "Yükle" butonu düşük kontrastlı, nedeni söylenmiyor.
3. Chip'ler çok küçük (11px civarı), dokunma hedefi < 32px.
4. Üst çubukta "Giriş" ve "Kayıt ol" aynı ağırlıkta; tek birincil eylem yok.
5. axe serious/critical sayısı bilinmiyor.

## V3-02'ye öneriler (yalnız kurallar)
- Birim testi olarak "kaynak taraması": hex, palet sınıfı, `text-[<12px]`, `backdrop-filter` sayısı (stylelint kurulmadan, paket eklemeden).
- 3 kırılım × 2 tema × 2 mod Playwright döngüsü + `emulateMedia({ reducedMotion, reducedTransparency? })`.
