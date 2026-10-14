# E3-10b — Oyuncular sayfası, eski Scouting filtrelerini karşılıyor mu? (kariyer modu)

Eski Scouting filtreleri (silinen `ScoutingPage`) ↔ `PlayersPage` (kariyer modunda `career` parametresiyle kayıt dosyası havuzu):

| Eski Scouting | Oyuncular sayfası | Durum |
|---|---|---|
| Mevki | Mevki | var |
| En fazla yaş | Maks. yaş (+ Min. yaş) | var |
| Min / Maks potansiyel | Min. / Maks. POT* | var |
| Min / Maks genel | Min. / Maks. genel | var |
| Lig | Lig | var |
| Kulüp | Takım (kariyer takım araması) | var |
| Serbest oyuncu | Serbest (free_agent) | var |
| **Değer (€) aralığı** | yok | **EKSİK** (backend `valueMax` destekliyor; web filtresi yok) |
| **Bütçeme sığar / edinilebilir** | yok | **EKSİK** (öneri hattında var, arama sayfasında yok) |
| **Sözleşme bitişi (≤ 6 ay)** | yok | **EKSİK** (veri `contract_until` yeni geldi; export gelince anlamlı) |
| **Kiralık / kiralanabilir** | yok | **EKSİK** |
| Sıralama: "en uygun oyun tarzı" / "fırsat" | yok (yalnız sütun sıralaması) | **EKSİK** — rol uyumuna göre sıralama artık Öneriler'de (rol/slot odaklı); serbest arama için gerekirse V3-06 |
| Tahmini bedel / değer sütunu | yok | **EKSİK** (liste sütunlarında değer yok) |
| Kullanıcı kulübüne göre "ulaşılabilirlik" (kova) | yok | **EKSİK** (yalnız Öneriler'de) |

Bunlar ekleme olarak **V3-06**'ya bırakıldı (bu adımda eklenmedi).
