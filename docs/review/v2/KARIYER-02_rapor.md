# KARIYER-02 — kariyer kiralıkları, sahada EA kartları, kalıcı görsel önbelleği, tablo sırası (rapor)

## Kiralıklar: betikte eksik vardı

Buğra'nın kendi kiraladıkları: Figueiredo, Nyoni, Ouazane, Lynch, Figueroa, Ilhan Fakılı, Tiago Silva, Lerma, Bisiwu (bazılarında satın alma opsiyonu). Dışa aktarımın `playerloans` tablosunda bunlardan yalnız Lynch var; diğerleri bu yüzden "transfer" görünüyordu.

**Olası neden (doğrulanmadı):** LE'nin `LE.db:GetTable(ad)` fonksiyonu tüm veritabanlarını dolaşıp **adı eşleşen ilk tabloyu** döndürüyor (`lua/libs/v2/imports/t3db/db.lua`). Aynı ad hem temel hem kariyer veritabanında varsa betik temel kopyayı okuyor olabilir (1.426 satır = gerçek hayattaki kiralıklar). `career_users`, `career_presignedcontract` gibi kariyer tabloları da "yok" çıkıyordu.

**Betik 2.0.2** (yalnız okur; Set/Terminate/Delete/Transfer/Loan çağrısı yok, testle denetleniyor):
- `DBMAP`: her veritabanının tablo adı → satır sayısı (teşhis; kariyer kiralıklarının hangi tabloda olduğunu kesinleştirecek).
- `playerloans`'ın diğer kopyaları `playerloans_db<N>` olarak dışa aktarılır.
- `fca_squadstatus`: kullanıcı kadrosundaki her oyuncu için oyunun kendi sorguları `IsPlayerLoanedOut`, `IsPlayerPresigned`.
- Transfer bütçesi: `GetUserTransferBudget` (`GetTransferBudget` LE'de kullanımdan kalkmış, nil dönüyor; imza belgesiz olduğundan argümansız ve takım kimliğiyle denenir).

**Sunucu:** kiralık kaynakları birleşir: `playerloans` → `playerloans_db*` → kadro durumunda "kiralıkta" olup tabloda olmayan (kaynak kulüp = ana kayıttaki kulüp). Bitiş tarihi tüm kopyalardan. Bütçe kariyere yazılır (oyun içi para birimi).

**Doğrulama sende:** LE'de Lua derleyicim yok ve oyuna erişemem; betik bu yüzden derlenmeden/çalıştırılmadan yayında. Kariyerde 2.0.2 ile dışa aktarım alıp log'u gönder: DBMAP satırlarından kiralıkların gerçek yerini kesinleştiririm; `fca_squadstatus` kiralıkları zaten yakalarsa Hareketler doğru "Kiralık" der.

## Diğer

- **Sahada EA kartları:** Kadro sahası ve kariyer kadro kurucusu `eaCards` ile EA kart görselini kullanır (UT sahası kendi kartını çizer). Saha slotları oyuncunun EA kimliğini taşır.
- **Kalıcı görsel önbelleği:** bellek → DB (`card_image`, V41) → kaynak. Var olan kart bir kez indirilir, bir daha EA'ya gidilmez (yeniden başlatma dahil); kartı olmayan oyuncu 7 gün sonra yeniden denenir. Tarayıcı bulunan kartı 30 gün tutar.
- **Tablo sırası:** Oyuncu → OVR → POT (önce OVR ilk sütundaydı, ada yapışık okunup kaçıyordu). Mobilde iki sütun yapışkan, masaüstünde ad tam genişlikte.

## Testler

Backend 624 (normal + ters sıra) yeşil; web 1099, lint, build yeşil. Yeni: kiralık kaynakları + bütçe entegrasyon testi, kalıcı önbellek (yeniden başlatma, 7 gün), DB deposu gidiş-dönüş, saha EA kartları, tablo sırası. Not: betik içerik testi betikten sonra yazıldı (kırmızısı görülmedi). Ters sırada bulunan test seçim hatası (kariyer oyuncusundan oluşan kulüp) iki testte düzeltildi.
