<!-- TEAM P02 | STEP P02-017 | Review this file, then remove this marker only. -->
# RIGPILOT — قاعدة البيانات وSupabase

قاعدة البيانات PostgreSQL على Supabase. **ملفات SQL داخل `server/supabase/migrations/` هي المصدر النهائي للمخطط وسياسات RLS**؛ هذا المستند خريطة تشغيل وليس بديلًا عن مراجعة SQL قبل أي تعديل.

## حدود المجلدات

- `server/supabase/migrations/`: تغييرات قاعدة البيانات المتسلسلة.
- `server/supabase/seed.sql`: بيانات أولية/تجريبية للمشروع، وليست مصدر أسعار المتاجر الحالية.
- `server/supabase/functions/`: وظائف Supabase Edge المكتوبة بـ JavaScript/Deno.
- `server/supabase/config.toml`: إعدادات Supabase CLI.
- `server/scripts/`: أدوات التحقق من البيانات والأسعار والـ API.

## سجل migrations الحالي

يحتوي المستودع على السلسلة التالية. لا تعدّل migration سبق تطبيقه على بيئة مشتركة؛ أضف ملفًا جديدًا برقم تالٍ بدلًا منه.

| الملف | الغرض العام |
| --- | --- |
| `001_initial_schema.sql` | الجداول الأساسية للمكونات والتجميعات وقواعد التوافق والتنبيهات والمجتمع، مع الدوال والفهارس الأساسية |
| `002_catalogue_rls.sql` | أدوار تحرير الكتالوج وسياسات الكتابة المقيدة |
| `003_1_performance_data.sql` | بيانات الأداء وFPS وتقديرات FPS واستخدام AI |
| `003_2_fps_benchmarks_seed.sql` | بيانات FPS المرجعية الأولية |
| `004_chat.sql` | جلسات المحادثة والرسائل وسياسات الملكية |
| `005_ratings.sql` | تقييمات التجميعات وتحديث متوسطات المجتمع وعدّاد المشاهدات |
| `006_fix_storage_rule.sql` | تصحيح سياسة التخزين |
| `007_i18n_content.sql` | محتوى متعدد اللغات |
| `008_retailer_products.sql` | منتجات المتاجر وسجلات مزامنتها |
| `009_retailer_cron.sql` | جدولة مهام مزامنة المتاجر |
| `010_price_units.sql` | توحيد وحدات/عملات الأسعار |
| `011_atomic_ai_usage_quota.sql` | استهلاك حصص AI بطريقة ذرية |
| `012_legacy_build_prices_egp.sql` | معالجة أسعار التجميعات القديمة إلى EGP |
| `013_authenticated_ai_quota.sql` | حصة AI للمستخدم المسجل الحالي والتحقق من هويته |
| `014_guest_ai_quota.sql` | حصص AI للزوار مع بصمة مجزأة |
| `015_username_signup_rate_limit.sql` | الحد من محاولات إنشاء الحساب باسم المستخدم |
| `016_retailer_build_item_snapshots.sql` | حفظ نسخة بيانات القطع داخل عناصر التجميعة لحماية السجلات من تغير الكتالوج |

## الكيانات الرئيسية

تعرض migrations تفاصيل الأعمدة والفهارس والعلاقات الفعلية. تشمل مجموعات البيانات الأساسية:

- **الكتالوج والتوافق:** `components`, `compatibility_rules`.
- **التجميعات:** `builds`, `build_items`, وسجلات العناصر المحفوظة/نسخ القطع حسب migration 016.
- **المجتمع والتقييمات:** `community_builds`, `build_ratings`.
- **الأداء:** `fps_benchmarks`, `ai_fps_estimates`.
- **المحادثات:** `chat_sessions`, `chat_messages`.
- **المتاجر:** `retailer_products`, `retailer_sync_runs`.
- **الاستخدام والأمان:** `ai_usage`, `ai_guest_usage`, `username_signup_attempts`.

تُدار صلاحيات القراءة والكتابة من خلال RLS والسياسات الموجودة في migrations. لا تعطّل RLS لحل مشكلة في الواجهة، ولا تضع `SUPABASE_SECRET_KEY` في متغيرات العميل أو ملفات `VITE_*`.

## تشغيل محلي

نفّذ أوامر Supabase CLI من جذر المشروع أو من مجلد `server/` مع التأكد من تحديد المشروع المقصود:

```bash
supabase start
supabase db reset
```

`db reset` يعيد إنشاء قاعدة Supabase المحلية ويطبّق migrations وملف seed وفق إعدادات CLI؛ لا تستخدمه على قاعدة البيانات البعيدة.

## نشر migrations على مشروع مستضاف

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

راجع قائمة migrations قبل الدفع، واحتفظ بنسخة احتياطية وفق سياسة المشروع. لا تشغّل `db reset` على الإنتاج.

## تحديث بيانات المشروع

- مزامنة المتاجر تتم عبر `server/supabase/functions/retailer-sync/` وجدول `retailer_products`.
- بيانات JSON في `client/public/data/` نسخة احتياطية/لقطة ثابتة للتحميل عند تعذر المصدر المباشر، وليست ضمانًا لحداثة السعر.
- كل تعديل في مصدر السعر أو شكل بيانات المنتج يجب أن يمر عبر اختبارات سلامة الأسعار والكتالوج قبل الدمج.

```bash
node server/scripts/verify-catalogue-categories.mjs
node server/scripts/verify-catalogue-specs.mjs
node server/scripts/verify-price-integrity.mjs
```

## JavaScript وليس TypeScript

تطبيق العميل والخادم مكتوب بـ JavaScript/JSX. لا توجد مجلدات تعريفات `database.ts` أو خطوة `supabase gen types typescript`. عند تغيير قاعدة البيانات، حدّث استهلاك البيانات والتحويلات في ملفات JavaScript مثل `client/src/services/componentsService.js` واختبر عقد البيانات؛ لا تضف ملفات TypeScript.
