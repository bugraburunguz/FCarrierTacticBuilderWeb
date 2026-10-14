# E3-10b — Öneri hattı süresi (canlı havuz düzeltmesinden sonra)

Ölçüm: `CareerRecommender.compute` hat içi süresi (HTTP ve kredi işlemi hariç), varsayılan istek (BALANCED, ilk 10), yerel Docker, 4 mevki × (1 soğuk + 2 ısınma + 20 ölçüm). Araç: `fcareer.report.recommendations.timing=true` (rapor çalıştırıcısı).

| Kariyer | Soğuk (ilk çağrı) | p50 | p95 | en yavaş |
|---|---|---|---|---|
| Crewe (id 4, kayıt dosyası var) | 213–1.188 ms | 206 ms | **262 ms** | 273 ms |
| Kayıt dosyası olmayan (katalog, 22 bin satır, geçici hesap) | 233–1.416 ms | 239 ms | **289 ms** | 367 ms |

Hedef ≤ 2 sn: **karşılandı** (sıcak p95 < 0,4 sn; soğuk ilk çağrı ≤ 1,5 sn, kulüp gücü hesabı dahil).

Düzeltmeden önce: aynı katalog kariyerinde ilk öneri **55 sn** (korelasyonlu `NOT EXISTS`; bkz. V3-04 progress E3-10). Geçici ölçüm hesabı silindi.
Not: ölçüm tek kullanıcı, tek istek; eşzamanlı yük altında ölçülmedi.
