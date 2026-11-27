<!-- TEAM P02 | STEP P02-013 | Review this file, then remove this marker only. -->
# RIGPILOT PC Builder 1.2.1

تطبيق بناء تجميعات الكمبيوتر، مقسوم إلى واجهة React مستقلة وخادم Node.js مستقل. لغة التطبيق JavaScript/JSX.

## هيكل المشروع

```text
RIGPILOT/
├── client/              # React + Vite + الصفحات والمكونات
├── server/              # Node API + Supabase + Edge Function مزامنة المتاجر
├── docs/                # التوثيق الحالي وإعداد البيئة
├── team/                # توزيع الملفات وخطة دمج 5 أفراد
├── .gitignore.person-01 ... .gitignore.person-05  # خمسة ملفات فقط
├── .sparse-checkout.*   # خمسة نطاقات عمل
├── dev.js               # تشغيل العميل والخادم معًا
├── package.json         # أوامر موحدة
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## المتطلبات

- Node.js 22 أو أحدث.
- pnpm 10 أو أحدث.
- مشروع Supabase ومفاتيح Publishable + Secret.
- Gemini API key من Google AI Studio.

## إعداد البيئة

```powershell
Copy-Item client/.env.example client/.env.local
Copy-Item server/.env.example server/.env
```

راجع `docs/ENV_SETUP_AR.md` لملء القيم ومكان استخراجها. لا تضع المفاتيح الحقيقية في Git أو داخل ZIP.

## التثبيت والتشغيل

```bash
pnpm install
pnpm dev
```

- Client: `http://localhost:5173`
- API: `http://localhost:3001`
- Health: `http://localhost:3001/api/health`

أوامر منفصلة: `pnpm dev:client` و`pnpm dev:server`.

## الفحوص

```bash
pnpm lint
pnpm test
pnpm test:server
pnpm audit:env
pnpm audit:prices
pnpm audit:all
```

## قاعدة البيانات والمتاجر

- migrations: `server/supabase/migrations/`
- Edge Function الحالية: `server/supabase/functions/retailer-sync/`
- نشر الوظيفة: `pnpm --dir server functions:deploy:retailer-sync`
- مزامنة Sigma الآلية: `.github/workflows/sigma-feed.yml`

## تقسيم الفريق

ابدأ بقراءة `team/TEAM_SPLIT_AR.md` ثم `team/WORK_ORDER_AR.md`. ملف `team/FILE_OWNERSHIP.csv` هو المرجع النهائي: يحدد مالك كل ملف، مجموعة الرفع، ترتيب الدمج، ومؤشر التعليق الذي يجب مراجعته وحذفه.

يوجد **خمسة ملفات Git ignore فقط** (`.gitignore.person-01` إلى `.gitignore.person-05`) وخمسة ملفات sparse-checkout. تعليمات تشغيلها موجودة في `team/USING_PERSON_PROFILES_AR.md`. تذكّر أن ignore وحده لا يخفي الملفات المتتبعة؛ sparse-checkout هو الذي يحدد الملفات الموجودة في نسخة العمل.

## التوثيق

- `docs/ARCHITECTURE.md` — بنية النظام
- `docs/ENV_SETUP_AR.md` — البيئة والمفاتيح
- `docs/SCRIPTS_AR.md` — وظيفة سكربتات الفحص والاختبار المتبقية
- `docs/DATABASE.md` — الجداول وRLS وmigrations
- `docs/COMPATIBILITY_RULES.md` — قواعد توافق القطع
- `docs/AI_ARCHITECTURE.md` — AI والـ tools
- `docs/RETAILER_STRATEGY.md` — بيانات المتاجر والأسعار
