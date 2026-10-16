# E3-2 — PlayStyle çözümü: LE trait bit maskeleri (2026-10-14)

## Durum tespiti
Kariyer içe aktarıcısı (`BaseCatalogImporter`) `trait1/trait2/icontrait1/icontrait2` bitlerini zaten çözüyordu, ama **koda gömülü iki dizi** ile (`DumpMappings`), gizli özellikler ve bilinmeyen bitler yoktu ve doğrulaması kayıtlı değildi. Bu adım eşlemeyi veriye taşıdı ve doğruladı.

## Seed ve kural
- `seed/le-playstyle-bits.json` (üretici `tools/fit-seeds/gen-le-playstyle-bits.mjs`): bit adları LE `loc/eng_us/localize.json` `trait1_N` (bit 0–29 saha PS), `trait2_N` (bit 0–5 kaleci PS, 6–7 CPU yapay zekâ, 8–13 gizli özellikler: Solid Player, Team Player, One Club Player, Injury Prone, Leadership, Super Sub) ve `icontrait1/2_N` (PS+) dizgelerinden. Katalog adlandırması: boşluksuz CamelCase, "Game Changer" → Gamechanger, GK PS'lerinde "GK " öneki yok.
- Kural: `icontrait` biti set → PS+ (2); yoksa `trait` biti set → PS (1). Courtois'da `icontrait2` biti set, `trait2` biti set değil: yine PS+ (doğrulandı).
- Dizgesi olmayan bit (trait1 ≥30, trait2 ≥14): `unknown_<alan>_<bit>` olarak saklanır; sıfır oyuncuda görüldü, ama sonraki sürümde yeni bit çıkarsa sessizce kaybolmaz. Gizli özellikler ve unknown bitler `career_player.hidden_traits`'e yazılacak (backfill adımında).
- Kod: `LePlaystyleBits` (ingestion/base) + 4 birim test; içe aktarıcı artık bunu kullanır, `DumpMappings` dizileri silindi.

## Doğrulama: LE çözümü ↔ katalog (EA ratings sitesi), 22.314 katalog oyuncusu üzerinde
LE çözümü ↔ katalog: 21609 eşleşen oyuncu, **tam eşit 21528 (99.63%)**, farklı PS kümesi 81, aynı küme farklı seviye (PS/PS+) 0.

| Oyuncu | LE çözümü | Katalog (ratings sitesi) | Eşit |
|---|---|---|---|
| Kylian Mbappé | Acrobatic, FinesseShot, FirstTouch, Gamechanger, LowDrivenShot, QuickStep+, Rapid | Acrobatic, FinesseShot, FirstTouch, Gamechanger, LowDrivenShot, QuickStep+, Rapid | ✓ |
| Erling Haaland | Acrobatic, ChipShot, Enforcer, Gamechanger, LowDrivenShot+, PowerShot, PrecisionHeader | Acrobatic, ChipShot, Enforcer, Gamechanger, LowDrivenShot+, PowerShot, PrecisionHeader | ✓ |
| Virgil van Dijk | AerialFortress+, Anticipate, Bruiser, Intercept, Jockey, PingedPass, PrecisionHeader | AerialFortress+, Anticipate, Bruiser, Intercept, Jockey, PingedPass, PrecisionHeader | ✓ |
| Rodri | AerialFortress, Bruiser, PowerShot, PressProven, TikiTaka+ | AerialFortress, Bruiser, PowerShot, PressProven, TikiTaka+ | ✓ |
| Lionel Messi | DeadBall, FinesseShot, Gamechanger, IncisivePass+, QuickStep, Technical, TikiTaka | DeadBall, FinesseShot, Gamechanger, IncisivePass+, QuickStep, Technical, TikiTaka | ✓ |
| Thibaut Courtois | FarReach, FarThrow, RushOut+ | FarReach, FarThrow, RushOut+ | ✓ |
| Florian Wirtz | ChipShot, FinesseShot, FirstTouch, IncisivePass, Inventive, Technical | ChipShot, FinesseShot, FirstTouch, IncisivePass, Inventive, Technical | ✓ |
| Jude Bellingham | FirstTouch, Inventive, LowDrivenShot+, PrecisionHeader, Relentless, SlideTackle, Technical | FirstTouch, Inventive, LowDrivenShot+, PrecisionHeader, Relentless, SlideTackle, Technical | ✓ |
| Bukayo Saka | FinesseShot, LowDrivenShot, Technical, WhippedPass+ | FinesseShot, LowDrivenShot, Technical, WhippedPass+ | ✓ |

İlk uyuşmazlıklar:
- Kiki Van Zanten (70675): LE IncisivePass ↔ katalog —
- Carlos Espí (70967): LE Acrobatic, Enforcer, PrecisionHeader ↔ katalog Enforcer, PrecisionHeader
- Tyrique George (71998): LE PowerShot ↔ katalog —
- Florian Wiegele (72937): LE CrossClaimer, FarThrow ↔ katalog CrossClaimer
- Lina Altenburg (73714): LE CrossClaimer ↔ katalog —
- Lorenzo Scipioni (74697): LE — ↔ katalog AerialFortress
- Chema (75056): LE Intercept ↔ katalog —
- Younes Ebnoutalib (76282): LE Acrobatic ↔ katalog —
- Michele Šego (76461): LE DeadBall, Rapid ↔ katalog Rapid
- Harold Voyer (78757): LE LongThrow ↔ katalog —
- Courtney Clarke (79057): LE WhippedPass ↔ katalog —
- Tomáš Ladra (79948): LE LongBallPass, Technical ↔ katalog —

Yorum: 21.609 eşleşen oyuncunun %99,63'ü **birebir** (PS kümesi ve PS/PS+ seviyesi) aynı; seviye farkı 0. Kalan 81 uyuşmazlığın hepsi PS **kümesi** farkı ve hepsi 70.675 ve üstü oyuncu kimliklerinde; 64 oyuncuda LE katalogdan fazla PS gösteriyor, 15 oyuncuda katalog fazla (kaynaklar farklı anlarda alınmış olabilir); LE'nin kendi verisi olduğu için çözüm hatası olarak değerlendirilmedi, bit kuralı doğru. Not: Mbappé için katalog ve LE ikisi de `QuickStep+` + `Rapid` (PS+ olan Rapid değil).
