# Kulüp ikizleri — DRY-RUN raporu (birleştirme YAPILMADI)

Sorgu: `FCarrierTacticBuilderBackend/backups/club_twins_dryrun.sql` (yalnız SELECT). Tarih: 2026-10-13. Veri değişmedi, yedek gerekmedi.

## Özet
- club: 827 satır, 769 farklı ea_team_id; **aynı ea_team_id'li birden fazla satır yok**.
- Aday çift: 38 (4 tanesi "normalize aynı ad + aynı lig" = bozuk diakritikli ad ikizi, kalanı "ad içerme" adayı).
- Bağlı tablolar: yalnız `player_rating.club_id` ve `career.club_id` FK'li; ayrıca FK'siz `career_player_rating`, `user_player_state`, `roster_event`. Tablodaki sayılar a/b = (a satırı / b satırı).
- Hiçbir şeye bağlı olmayan (yetim) club satırı: **57**. İkizlerin hemen hepsinde eski/kısa ad satırı yetim; oyuncular ea_team_id eşleşen satırda.
- Elle bilinen örnek: **27 "Paris SG"** (kadın, lig 10, EA id yok, 0 bağ) ↔ **996 "PSG"** (kadın, EA 116034, 31 oyuncu) ↔ **7 "Paris SG"** (erkek, lig 6, EA 73, 29 oyuncu). Baş harf kuralı bunu yakalamadı ("Paris SG" → "ps"); alias tablosu bunu tutmalı.
- Yanlış pozitifler: Raków / Wisła Kraków / KS Wieczysta Kraków ("Kraków" içeriyor), Estudiantes ↔ Asociación Atlética Estudiantes / Estudiantes RC, Gimnasia ↔ Gimnasia Mendoza gerçekten ayrı kulüpler olabilir; birleştirilmez.
- **Bozuk ad (kodlama):** 328 "Atltico de SL", 330 "Club Len", 379 "FC Jurez", 477 "Quertaro FC": diakritik düşmüş; doğru yazımlı kanonik satırlar 1029/1032/1028/1027. Bu dört satır yetim.

## Kulüp kimyasına etkisi (örnek)
Kadın-erkek bağı kulüp üzerinden kurulduğu için aynı adlı iki kulüp satırı tehlikelidir: UT kimyası `clubId` yoksa kulüp adına bakar. 27 ve 7 ikisi de "Paris SG", cinsiyetleri farklı. Bugün 27 yetim olduğu için canlı etkisi yok; ancak bir kadın PSG kartı adla 27'ye bağlanırsa erkek PSG (7) kartlarıyla kulüp kimyası kurar. 996 (EA id'li) doğru çalışır: 31 kadın PSG oyuncusu aynı satırda. İkinci risk: aynı kulübün oyuncuları iki satıra bölünürse kimya ağında ayrı sayılırlar; listede iki satırında da oyuncu olan çiftler (Estudiantes 196↔997, Gimnasia 375↔1019, Raków 553↔384/637) var; adları farklı gerçek kulüplere benziyor (Estudiantes de La Plata / Río Cuarto, Gimnasia La Plata / Mendoza), yani bölünme değil; yine de insan onayı gerekir.

## Aday çiftler
| Neden | a | b | lig | cinsiyet | player_rating a/b | career_player_rating a/b | career a/b | Önerilen kanonik |
|---|---|---|---|---|---|---|---|---|
| ad içerme (aday) | 163 Abha Club | 1018 Abha | 16 | 0 | 0/33 | 0/0 | 0/0 | 1018 (Abha) |
| ad içerme (aday) | 518 Académico de Viseu FC | 1039 Académico | 13 | 0 | 0/30 | 0/0 | 0/0 | 1039 (Académico) |
| ad içerme (aday) | 171 Al Diriyah | 1008 Diriyah | 16 | 0 | 0/34 | 0/0 | 0/0 | 1008 (Diriyah) |
| ad içerme (aday) | 357 Amed Sportif Faaliyetler | 1042 Amed | 12 | 0 | 0/26 | 0/0 | 0/0 | 1042 (Amed) |
| ad içerme (aday) | 598 Arezzo | 1003 SS Arezzo | 40 | 0 | 0/32 | 0/0 | 0/0 | 1003 (SS Arezzo) |
| ad içerme (aday) | 94 Bologna | 1015 Bologna FC | 11 | 0 | 0/27 | 0/0 | 0/0 | 1015 (Bologna FC) |
| ad içerme (aday) | 130 Cagliari | 1009 Cagliari Calcio | 11 | 0 | 0/34 | 0/0 | 0/0 | 1009 (Cagliari Calcio) |
| ad içerme (aday) | 428 CE Sabadell FC | 1031 CE Sabadell | 27 | 0 | 0/28 | 0/0 | 0/0 | 1031 (CE Sabadell) |
| ad içerme (aday) | 200 Club Atlético Gimnasia y Esgrima | 375 Gimnasia | 21 | 0 | 0/31 | 0/0 | 0/0 | 375 (Gimnasia) |
| ad içerme (aday) | 30 Denver Summit FC | 1022 Denver Summit | 8 | 1 | 0/27 | 0/0 | 0/0 | 1022 (Denver Summit) |
| ad içerme (aday) | 705 Dijon Football Côte d’Or | 995 Dijon | 39 | 0 | 0/29 | 0/0 | 0/0 | 995 (Dijon) |
| ad içerme (aday) | 196 Estudiantes | 541 Asociación Atlética Estudiantes | 21 | 0 | 31/0 | 0/0 | 0/0 | 196 (Estudiantes) |
| ad içerme (aday) | 196 Estudiantes | 997 Estudiantes RC | 21 | 0 | 31/35 | 0/0 | 0/0 | elle bak |
| ad içerme (aday) | 690 FC Corvinul 1921 Hunedoara | 1043 Corvinul 1921 | 54 | 0 | 0/28 | 0/0 | 0/0 | 1043 (Corvinul 1921) |
| ad içerme (aday) | 516 FK Austria Wien | 1063 Austria Wien | 44 | 0 | 0/31 | 0/0 | 0/0 | 1063 (Austria Wien) |
| ad içerme (aday) | 198 Frosinone | 1000 Frosinone Calcio | 11 | 0 | 0/33 | 0/0 | 0/0 | 1000 (Frosinone Calcio) |
| ad içerme (aday) | 249 Genoa | 1007 Genoa CFC | 11 | 0 | 0/31 | 0/0 | 0/0 | 1007 (Genoa CFC) |
| ad içerme (aday) | 375 Gimnasia | 1019 Gimnasia Mendoza | 21 | 0 | 31/31 | 0/0 | 0/0 | elle bak |
| ad içerme (aday) | 347 Havre AC | 1045 Le Havre AC | 6 | 0 | 0/29 | 0/0 | 0/0 | 1045 (Le Havre AC) |
| ad içerme (aday) | 31 Juventus | 1034 Juventus FC | 11 | 0 | 0/31 | 0/0 | 0/0 | 1034 (Juventus FC) |
| ad içerme (aday) | 384 KS Wieczysta Kraków | 553 Raków | 47 | 0 | 25/29 | 0/0 | 0/0 | elle bak |
| ad içerme (aday) | 63 Lecce | 1002 US Lecce | 11 | 0 | 0/31 | 0/0 | 0/0 | 1002 (US Lecce) |
| ad içerme (aday) | 619 L. R. Vicenza | 1001 Vicenza | 40 | 0 | 0/28 | 0/0 | 0/0 | 1001 (Vicenza) |
| ad içerme (aday) | 253 Monza | 1012 AC Monza | 11 | 0 | 0/29 | 0/0 | 0/0 | 1012 (AC Monza) |
| ad içerme (aday) | 174 Neom | 1049 Neom SC | 16 | 0 | 0/31 | 0/0 | 0/0 | 1049 (Neom SC) |
| ad içerme (aday) | 258 Parma | 1005 Parma Calcio | 11 | 0 | 0/29 | 0/0 | 0/0 | 1005 (Parma Calcio) |
| ad içerme (aday) | 553 Raków | 637 Wisła Kraków | 47 | 0 | 29/25 | 0/0 | 0/0 | elle bak |
| ad içerme (aday) | 723 SC Fortuna Köln | 1065 Fortuna Köln | 60 | 0 | 0/30 | 0/0 | 0/0 | 1065 (Fortuna Köln) |
| ad içerme (aday) | 499 SC Telstar | 1030 Telstar | 20 | 0 | 0/24 | 0/0 | 0/0 | 1030 (Telstar) |
| ad içerme (aday) | 131 Torino | 1048 Torino FC | 11 | 0 | 0/32 | 0/0 | 0/0 | 1048 (Torino FC) |
| ad içerme (aday) | 203 Udinese | 1010 Udinese Calcio | 11 | 0 | 0/30 | 0/0 | 0/0 | 1010 (Udinese Calcio) |
| ad içerme (aday) | 692 US Boulogne | 1038 US Boulogne CO | 39 | 0 | 0/28 | 0/0 | 0/0 | 1038 (US Boulogne CO) |
| ad içerme (aday) | 546 Vålerenga Fotball | 1037 Vålerenga Fotb. | 26 | 0 | 0/27 | 0/0 | 0/0 | 1037 (Vålerenga Fotb.) |
| ad içerme (aday) | 245 Venezia | 1013 Venezia FC | 11 | 0 | 0/37 | 0/0 | 0/0 | 1013 (Venezia FC) |
| normalize aynı ad + aynı lig | 328 Atltico de SL | 1029 Atlético de SL | 23 | 0 | 0/26 | 0/0 | 0/0 | 1029 (Atlético de SL) |
| normalize aynı ad + aynı lig | 330 Club Len | 1032 Club León | 23 | 0 | 0/30 | 0/0 | 0/0 | 1032 (Club León) |
| normalize aynı ad + aynı lig | 379 FC Jurez | 1028 FC Juárez | 23 | 0 | 0/29 | 0/0 | 0/0 | 1028 (FC Juárez) |
| normalize aynı ad + aynı lig | 477 Quertaro FC | 1027 Querétaro FC | 23 | 0 | 0/26 | 0/0 | 0/0 | 1027 (Querétaro FC) |

## Önerilen `club_alias` şeması (seed tablosu)
```sql
CREATE TABLE club_alias (
  id          serial PRIMARY KEY,
  alias_name  text     NOT NULL,                      -- eşlenecek ad (olduğu gibi)
  league_id   integer  REFERENCES league(id),         -- null: lig fark etmez
  gender      smallint CHECK (gender IN (0, 1)),      -- null: fark etmez
  ea_team_id  integer,                                -- bilinen EA team.id (varsa)
  club_id     integer  NOT NULL REFERENCES club(id),  -- kanonik satır
  source      text     NOT NULL,                      -- örn. 'manual-review', 'le-dump'
  verified    boolean  NOT NULL DEFAULT false
);
CREATE UNIQUE INDEX ux_club_alias ON club_alias (lower(alias_name), coalesce(league_id, 0), coalesce(gender, 2));
```
Tohum `seed/club-aliases.json` (ut_rules gibi hash'li yükleyici). Kulüp çözümü sırası: 1) ea_team_id, 2) club_alias (ad + lig + cinsiyet), 3) (ad, lig), 4) yeni satır. Koddaki "çakışmada yeniden adlandırma yapma" kuralı alias tablosuyla değişir; koda gömülü isim eşlemesi kalmaz.

## Onay sonrası uygulama planı
Yedek (git dışı, `backups/`) → tek transaction: yetim a satırları alias'a taşınır, bağlı satır varsa club_id b'ye çevrilir, a silinir → sayımlar. **Onay beklenir; hiçbir şey yapılmadı.**
