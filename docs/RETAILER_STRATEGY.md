<!-- TEAM P02 | STEP P02-021 | Review this file, then remove this marker only. -->
# RIGPILOT — استراتيجية المتاجر والأسعار

هذا المستند يشرح مصادر بيانات المتاجر وتدفق تحديثها. الأعداد أدناه محسوبة من ملفات JSON المرفقة في المستودع، وليست استعلامًا لحظيًا من مواقع المتاجر.

## 1. ملفات البيانات الموجودة

| المتجر | عدد الصفوف | المصدر |
| --- | ---: | --- |
| Elbadr | 1,775 | `client/public/data/retailer_snapshot.json` |
| Elnekhely | 725 | `client/public/data/retailer_snapshot.json` |
| Alfrensia | 218 | `client/public/data/retailer_snapshot.json` |
| Sigma Computer | 247 | `client/public/data/sigma_products.json` |
| **الإجمالي** | **2,965** | اللقطتان معًا |

ملفا اللقطة يسجلان وقت التقاط في **3 نوفمبر 2026**. لذلك فهما fallback data وليسا أسعارًا لحظية. يجب إظهار حداثة السعر وحالة المخزون، وعدم الاعتماد على السعر القديم كعرض شراء مؤكد.

| الفئة | الصفوف في اللقطتين |
| --- | ---: |
| CPU | 262 |
| GPU | 544 |
| Motherboard | 580 |
| RAM | 264 |
| Storage | 210 |
| PSU | 263 |
| Case | 415 |
| Cooling | 427 |

## 2. مسار مزامنة المتاجر

تتم المزامنة من خلال Supabase Edge Function:

- نقطة التنفيذ: `server/supabase/functions/retailer-sync/index.js`.
- إعدادات المتاجر والمحللات: `server/supabase/functions/retailer-sync/parsers.js`.
- البيانات الناتجة: جدول `retailer_products`.
- سجلات كل محاولة: جدول `retailer_sync_runs`.
- الجدولة: إعدادات pg_cron في `server/supabase/migrations/009_retailer_cron.sql`.

تلتزم الوظيفة بطلبات متتابعة وفواصل زمنية وحدود للصفحات والوقت. المنتج الذي لا يمكن ربطه بمنتج الكتالوج يظل في بيانات المتجر الخام، لكنه لا يُعامل كأفضل عرض مؤكد حتى يحقق شروط المطابقة.

## 3. طريقة تحليل صفحات المتاجر

المحللات مكتوبة بـ JavaScript في `parsers.js`. تستخدم قواعد محددة على بنية صفحات المتاجر وتُرجع بيانات منتجات قابلة للاختبار. عند تغيّر قالب المتجر، يجب أن يفشل المحلل بشكل محافظ أو يعيد عددًا أقل من المنتجات بدل تخمين بيانات غير صحيحة.

تتضمن اختبارات المحللات حالات تصنيف الفئات، وتجميع SKU، والأسعار الوهمية، والتوافر المستخرج من Schema.org:

```bash
pnpm --dir client test
node --test client/src/services/retailers/__tests__/*.test.js
node server/scripts/verify-retailer-stock-parser.mjs
node server/scripts/verify-retailer-stock-freshness.mjs
```

## 4. Sigma Computer

لـ Sigma مسار منفصل يعتمد على متصفح آلي؛ العامل موجود في `server/scripts/sigma_worker.py` ويكتب `client/public/data/sigma_products.json`. التطبيق يقرأ الـ feed من `client/src/services/retailers/sigmaFeed.js`، ويستخدم `sigmaSnapshot.js` كبيانات بدء احتياطية.

تشغيل العامل يحتاج Python وPlaywright وChromium:

```bash
pip install playwright
python -m playwright install chromium
python server/scripts/sigma_worker.py
```

لا تُعدّل ملف feed يدويًا لتوليد أسعار. عند فشل الجمع، يجب تسجيل حالة الفشل بدل اختراع صفوف أو أسعار.

## 5. مطابقة المنتجات وتجميع العروض

تُستخدم قواعد مختلفة لسؤالين مختلفين:

1. هل عرض متجر معين يطابق عنصرًا في كتالوج المكونات؟ تتم المطابقة داخل وظيفة `retailer-sync` مع الاحتفاظ بمعرّف المنتج والثقة.
2. هل عرضان من متجرين مختلفين يمثلان SKU نفسه؟ يستخدم العميل `client/src/lib/skuGrouping.js` لتكوين مجموعات المقارنة.

لا تدمج عرضين من المتجر نفسه في صف واحد لمجرد تشابه الاسم؛ قد يكونان إصدارين أو SKU مختلفين.

## 6. قواعد السعر والمخزون

- السعر المقبول لتجميعة PC يجب أن يكون صالحًا وبعملة EGP، وألا يكون قيمة placeholder.
- لا يُعامل المخزون المجهول على أنه متوفر أو غير متوفر.
- العرض القديم لا يتقدم تلقائيًا على عرض حديث لمجرد أن رقمه أقل.
- إذا كان سعر قطعة غير صالح أو مفقودًا، لا تُظهر الواجهة مجموعًا جزئيًا على أنه إجمالي كامل.
- اللقطات المحلية تساعد على عرض بيانات احتياطية؛ التحقق من السعر الحالي يكون من بيانات حديثة موثوقة.

المنطق المشترك موجود في `client/src/lib/buildTotals.js` و`offerRanking.js` و`stockFreshness.js`. شغّل فحص سلامة السعر بعد أي تعديل:

```bash
node server/scripts/verify-price-integrity.mjs
node server/scripts/verify-catalogue-categories.mjs
node server/scripts/verify-catalogue-specs.mjs
```
