# Altın set — KESİN sürüm (13 §3.5 / §3.6) — Buğra onayı 2026-10-14

Bu dosya `golden_set_draft.md`'nin onaylanmış hâlidir (taslak dosya referans olarak kalır). Oyuncu tabloları ve attribute kanıtları taslakla aynıdır; değişen: **kesin çift listeleri**, çıkarılan/gözleme alınan çiftler ve **levelFit** beklentileri.

## Test kuralları
- **Kesin çiftler** (`KESİN çiftler` satırları): ikili sıra testi ve Kendall τ **yalnız bu çiftlerde** hesaplanır. Kabul: kesin çiftler %100, τ ≥ 0,8 (kesin çiftlerin kendi içinde). Kırılırsa build kırılır.
- **Gözlem çiftleri** (aşağıda `Gözlem` satırları): test edilmez; sonuçları (hangi yön, skor farkı) rapor edilir, **build'i kırmaz**.
- **İlke** (13 §2 madde 8): `currentFit` kaliteyi değil, **rolün oyuncuya oturmasını** ölçer; kalite ile rolü birlikte tartan sıralama öneri hattının işidir (§3.3).
- **levelFit** (13 §3.2 madde 11): aynı (mevki, rol, focus) için OVR ±3 bandındaki katalog oyuncuları arasında `currentFit` yüzdeliği (`fit_level_norms`). Golden testleri: (a) kendi seviyesinde tipik profildeki oyuncunun levelFit'i **[35, 65]**; (b) **Kampa (GK 57) ve Lawlor (GK 61) levelFit ≥ 30**; (c) currentFit'te kaleci merdiveni sırası korunur (blok 12).
- İkinci tur (eksik arketipler ve ayak/yan): Classic 10, Stopper, Sweeper Keeper, Wide Playmaker, Half Winger, Falseback.

## Gözlem listesi (test edilmez, loglanır)
Abline ↔ Hofleitner (TF) · Distefano ↔ Hofleitner (Poacher) · Barcola ↔ Traoré fark büyüklüğü · Bakasetas ↔ Nartey · Modrić ↔ Löwen · Modrić ↔ Xhaka · Puig ↔ Martin (DLP) · Román ↔ Demetriou · White ↔ Tabiner.

Kısaltmalar: hea=Heading, jum=Jumping, str=Strength, spd=SprintSpeed, dri=Dribbling, fin=Finishing, pos=Positioning, comp=Composure, cro=Crossing, vis=Vision, sp=ShortPassing, lp=LongPassing, sta=Stamina, dfa=DefAwareness, tkl=StandingTackle, itc=Interceptions.

---
## 1. Target Forward · Attack (ST)
| Oyuncu | Kulüp | OVR | Arketip | Kanıt (attribute) |
|---|---|---|---|---|
| Cristiano Ronaldo | Al Nassr | 84 | hava | hea 87, jum 93, str 81, fin 89, 187 cm |
| Lucas Passerini | Belgrano | 74 | hava | hea 78, jum 84, str 94, 189 cm |
| Alexander Hofleitner | Grazer AK | 64 | hava | hea 77, jum 83, str 91, 196 cm |
| Hugo Ekitiké | Liverpool | 85 | hızlı | spd 87, dri 87, fin 86; hea 79, jum 85, str 70 |
| Matthis Abline | AS Monaco | 76 | hızlı | spd 89, dri 83; hea 68, str 69 |
| Alieu Njie | Torino FC | 65 | hızlı-kısa | spd 74, dri 71; hea 48, jum 51, str 39, 177 cm |

**KESİN çiftler** : Ronaldo > Passerini · Passerini > Hofleitner · Ronaldo > Hofleitner · Passerini > Njie · Hofleitner > Njie · **Ronaldo > Ekitiké** (karar).
Gözlem (test edilmez, loglanır): Abline ↔ Hofleitner.

## 2. Poacher · Attack (ST)
| Oyuncu | Kulüp | OVR | Kanıt |
|---|---|---|---|
| Antoine Griezmann | Orlando City | 84 | fin 85, pos 86, comp 88, str 70 |
| Alexis Sánchez | CF Montréal | 75 | fin 77, pos 79, comp 77, str 58 |
| Filippo Distefano | Empoli | 65 | fin 72, pos 68, comp 68, hea 52, str 32 |
| Alexander Hofleitner (çapraz) | Grazer AK | 64 | fin 67, pos 70, comp 62; hea 77, str 91 |

**KESİN çiftler:** Griezmann > Sánchez · Sánchez > Distefano · Griezmann > Distefano.
Gözlem: Distefano ↔ Hofleitner.

## 3. Inside Forward · Attack (LW/RW)
| Oyuncu | Kulüp | OVR | Kanıt |
|---|---|---|---|
| Yan Diomande | Real Madrid | 84 | spd 93, dri 90, fin 81, pos 81 |
| Ismael Díaz | Club León | 74 | spd 92, dri 73, fin 75, pos 73 |
| Abdul Abdulmalik | Djurgårdens IF | 66 | spd 88, dri 73, fin 65, pos 66 |
| Adama Traoré (çapraz) | RC Deportivo | 74 | spd 90, str 90, dri 81, fin 61, pos 67, cro 74 |

**KESİN çiftler:** Diomande > Díaz · Díaz > Abdulmalik · Diomande > Abdulmalik · Díaz > Traoré (aynı OVR 74, bitiricilik farkı).
Gözlem: ayak/kanat etkisi (ikinci tur).

## 4. Winger · Balanced (LW/RW)
| Oyuncu | Kulüp | OVR | Kanıt |
|---|---|---|---|
| Bradley Barcola | Paris SG | 85 | spd 95, dri 86, cro 81, sp 83 |
| Adama Traoré | RC Deportivo | 74 | spd 90, dri 81, cro 74, str 90 |
| Emilio Rodríguez | Club Necaxa | 66 | spd 89, dri 74, cro 64 |
| Ismael Díaz (çapraz) | Club León | 74 | spd 92, dri 73, cro 62, fin 75 |

**KESİN çiftler:** Barcola > Rodríguez · **Traoré > Díaz** (karar: Winger'da orta/çalım/hız bitiricilikten ağır).
Gözlem: Barcola ↔ Traoré fark büyüklüğü.

## 5. Playmaker · Balanced (CAM)
| Oyuncu | Kulüp | OVR | Kanıt |
|---|---|---|---|
| Kevin De Bruyne | SSC Napoli | 85 | vis 92, sp 89, cro 89, dri 84 |
| Dominik Szoboszlai | Liverpool | 86 | vis 86, sp 86, dri 85, sta 93, spd 85 |
| Nikolas Nartey | VfB Stuttgart | 74 | vis 77, sp 78, dri 78 |
| Anastasios Bakasetas | Panathinaikos | 75 | vis 76, sp 75, long shots 83, shot power 86 |
| Isaque | Shakhtar Don. | 66 | vis 70, sp 70, dri 74 |

**KESİN çiftler:** De Bruyne > Isaque · Nartey > Isaque · **De Bruyne > Szoboszlai** (karar).
Gözlem: Bakasetas ↔ Nartey.

## 6. Box-to-Box · Balanced (CM)
| Oyuncu | Kulüp | OVR | Kanıt |
|---|---|---|---|
| Scott McTominay | SSC Napoli | 86 | sta 92, str 83, agg 84, dfa 78 |
| Eduard Löwen | SJ Earthquakes | 74 | sta 86, str 83, agg 82 |
| Kim Dong Hyun | Gangwon FC | 65 | sta 88, str 79; sp 70, vis 59 |
| Luka Modrić (çapraz) | Milano FC | 85 | sta 74, str 48; vis 88, sp 89 |
| Riqui Puig (çapraz) | LA Galaxy | 74 | sta 49, str 32; vis 80, sp 80 |

**KESİN çiftler:** McTominay > Löwen · Löwen > Kim · McTominay > Kim · McTominay > Modrić · **Kim Dong Hyun > Riqui Puig** (karar: arketip, seviyeye baskın; currentFit kaliteyi değil rolün oturmasını ölçer).
Gözlem: Modrić ↔ Löwen.

## 7. Deep-Lying Playmaker · Build-Up (CDM)
| Oyuncu | Kulüp | OVR | Kanıt |
|---|---|---|---|
| Granit Xhaka | Sunderland | 85 | vis 85, sp 88, lp 89, comp 85 |
| Nicolò Fagioli | Fiorentina | 76 | vis 81, sp 84, dfa 69 |
| Jonas Martin | US Boulogne CO | 66 | vis 71, sp 72, dfa 60 |
| Luka Modrić (CM de oynar) | Milano FC | 85 | vis 88, sp 89, comp 91 |
| Riqui Puig | LA Galaxy | 74 | vis 80, sp 80, dfa 43 |

**KESİN çiftler:** Xhaka > Fagioli · Fagioli > Martin · Xhaka > Martin.
Gözlem: Modrić ↔ Xhaka · Puig ↔ Martin (DLP).

## 8. Holding · Defend (CDM)
| Oyuncu | Kulüp | OVR | Kanıt |
|---|---|---|---|
| Moisés Caicedo | Chelsea | 86 | dfa 83, tkl 86, itc 88, str 76, sta 91 |
| Rani Khedira | Union Berlin | 76 | dfa 83, tkl 79, str 83, sta 80 |
| Leonardo Freijão | Cruzeiro | 64 | dfa 68, tkl 69, itc 72, sta 64 |
| Granit Xhaka (çapraz) | Sunderland | 85 | dfa 80, tkl 79, itc 77; vis 85, sp 88 |

**KESİN çiftler:** Caicedo > Khedira · Khedira > Freijão · Caicedo > Freijão · **Khedira > Xhaka** (karar: Holding Defend'de savunma attribute'ları, oyun kurucu üstünlüğüne baskın).

## 9. Defender · Defend (CB)
| Oyuncu | Kulüp | OVR | Kanıt |
|---|---|---|---|
| Aymeric Laporte | Athletic Bilbao | 84 | dfa 87, tkl 84, hea 84, str 84 |
| Gautier Lloris | Brest | 75 | dfa 74, tkl 76, hea 81, str 84 |
| Uroš Radaković | Buriram United | 66 | dfa 66, tkl 67, hea 72, str 86 |
| Bright Arrey-Mbi (çapraz) | SC Braga | 74 | spd 91, jum 88, str 82; dfa 67, tkl 75, sp 69 |

**KESİN çiftler:** Laporte > Lloris · Lloris > Radaković · Laporte > Radaković · **Lloris > Arrey-Mbi** (karar).

## 10. Ball-Playing Defender · Build-Up (CB)
| Oyuncu | Kulüp | OVR | Kanıt |
|---|---|---|---|
| Pau Cubarsí | FC Barcelona | 86 | sp 88, vis 81, dri 74, dfa 86 |
| Aymeric Laporte | Athletic Bilbao | 84 | sp 83, vis 79, dfa 87 |
| Kenan Toibibou | Cádiz CF | 64 | sp 71, vis 60, dri 67, dfa 61 |
| Uroš Radaković (çapraz) | Buriram United | 66 | sp 52, vis 42, dri 37; dfa 66 |

**KESİN çiftler:** Laporte > Radaković · Toibibou > Radaković (seviye normalizasyonu çaprazı: OVR 64<66 ama pas 71>52) · **Cubarsí > Laporte** (karar).

## 11. Fullback · Defend ↔ Attacking Wingback · Attack (RB/LB, eşit OVR 66 çifti)
| Oyuncu | Kulüp | OVR | Poz | Kanıt |
|---|---|---|---|---|
| Marcos Llorente | Atlético de Madrid | 85 | RB | sta 93, spd 92, cro 80, dfa 78, tkl 84 |
| Álvaro Angulo | Pumas | 74 | LB | sta 91, spd 93, cro 73, dfa 60 |
| Henry Rorig | Energie Cottbus | 66 | RB | sta 82, spd 87, cro 69, dfa 49, tkl 59 |
| Cucurella | Real Madrid | 86 | LB | dfa 86, tkl 86, sta 89, cro 80 |
| Bernardo | TSG Hoffenheim | 75 | LB | dfa 74, tkl 78, cro 60, spd 66 |
| Craig Forsyth | Derby County | 66 | LB | dfa 70, tkl 69, spd 34, cro 68, sta 55 |

**KESİN çiftler** (Attacking Wingback · Attack): Llorente > Angulo · Angulo > Rorig · Rorig > Forsyth (aynı OVR 66).
**KESİN çiftler** (Fullback · Defend): Cucurella > Bernardo · Bernardo > Forsyth · Forsyth > Rorig (aynı OVR 66; rol değişince sıra döner) · **Bernardo > Angulo** (karar).
Ayak/yan etkisini karıştırmamak için test her oyuncunun doğal tarafında koşar.

## 12. Goalkeeper · Defend (GK): seviye merdiveni
| Oyuncu | Kulüp | OVR | Kanıt (diving/handling/reflexes/positioning) |
|---|---|---|---|
| Marco Carnesecchi | Bergamo Calcio | 86 | 84 / 85 / 87 / 86 |
| Colin Coosemans | RSC Anderlecht | 76 | 79 / 75 / 75 / 78 |
| Simon Ngapandouetnbu | Montpellier | 69 | 72 / 69 / 72 / 70 |
| Mikel Santos | Athletic Bilbao | 63 | 65 / 64 / 63 / 66 |
| Owen Jochmans | OH Leuven | 58 | 65 / 61 / 62 / 52 (positioning 52) |

**KESİN çiftler (currentFit, kaleci merdiveni):** Carnesecchi > Coosemans > Ngapandouetnbu > Santos > Jochmans (tüm komşu çiftler ve geçişliler).
**levelFit beklentileri:** kendi seviyesinde tipik profildeki oyuncunun levelFit'i [35, 65] aralığında; **Kampa (GK 57) ve Lawlor (GK 61) levelFit ≥ 30**.

---
## K. Kariyer tarafı (LE içe aktarma: Crewe Alexandra, EFL League Two; attribute'lar kariyer kaydından)
| Oyuncu | OVR | Poz | Kanıt |
|---|---|---|---|
| Keisuke Osako | 69 | GK | diving 68, handling 68, reflexes 72, positioning 66 |
| Ian Lawlor | 61 | GK | diving 61, handling 59, reflexes 62, positioning 60 |
| Iván Román | 66 | CB | dfa 62, tkl 69, itc 64, str 80, hea 68 |
| Mickey Demetriou | 64 | CB | dfa 64, tkl 63, itc 63, str 76, hea 65 |
| Givairo Read | 76 | RB | spd 78, sta 73, cro 76, dfa 73, tkl 74 |
| Lewis Billington | 64 | RB | spd 71, sta 90, cro 59, dfa 58, tkl 60 |
| Jesse Eugen Bisiwu | 68 | LW | spd 86, dri 73, fin 64 |
| Jordan Gibson | 64 | LM | spd 83, dri 64, fin 58 |
| Joe White | 64 | CM | sta 69, dri 64, sp 67 |
| Joel Tabiner | 60 | CM | sta 71, sp 64 |

**KESİN çiftler (kariyer):** Osako > Lawlor (Goalkeeper · Defend) · Bisiwu > Gibson (Inside Forward · Attack / Winger · Balanced) · Read > Billington (Wingback · Support).
**levelFit beklentisi:** bu kariyerde 61'lik kaleci (Lawlor) ve 64-66'lık CB/CM oyuncuları kendi seviyelerinde makul uyum alır; **Lawlor levelFit ≥ 30**. Bugün (v1) Lawlor 25, Román (CB 66) 9,7, White (CM 64) 36 currentFit alıyor.
Gözlem: Román ↔ Demetriou · White ↔ Tabiner.
Kariyer verisi ile katalog farkı (ENG-01): bu 10 oyuncu için testler `career_player_rating` kaynaklı attribute'larla koşar.

---
## Kapsam ve sınırlar
- Toplam ≈ 52 benzersiz katalog oyuncusu + 10 kariyer oyuncusu. 60 hedefine yakın; eksik arketipler (Classic 10, Stopper, Sweeper Keeper, Wide Playmaker, Half Winger, Falseback) ikinci turda, Buğra bu taslağı onayladıktan sonra.
- Sıralamalar seçilen oyuncuların **attribute'larından** türetildi; EA'nın resmî rol puanı yok, hiçbir sıralama oyuncunun adına dayanmıyor.
- Ayak/yan, boy ve PlayStyle terimleri bu sürüme girmedi (veri var, motor terimi M2'de gelince ikinci tur).
