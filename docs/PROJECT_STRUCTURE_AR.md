<!-- TEAM P02 | STEP P02-018 | Review this file, then remove this marker only. -->
# تقسيم مشروع RIGPILOT

تم تقسيم المشروع إلى ثلاث وحدات رئيسية واضحة:

```text
RIGPILOT-PC-Builder/
├── client/
├── docs/
├── server/
├── .gitignore.person-01 ... .gitignore.person-05  # خمس ملفات نطاق محلية
├── dev.js
├── package.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

## client — الواجهة الأمامية

يحتوي على React وVite وصفحات الموقع والمكونات والتنسيقات وملفات الترجمة وبيانات الكتالوج والصور. لا يحتوي على مفاتيح Gemini أو مفتاح Supabase Service Role.

## server — الباك إند

يحتوي على خادم Node.js المستقل، ومسارات الحسابات والذكاء الاصطناعي، وملفات Supabase Functions وقاعدة البيانات، واختبارات الباك إند وأدوات فحص وصيانة المشروع.

## docs — التوثيق

يحتوي على شرح قاعدة البيانات والتوافق والـ AI والتشغيل والإصلاحات.

## التشغيل

من مجلد المشروع الرئيسي:

```bash
pnpm install
pnpm dev
```

الواجهة تعمل على `http://localhost:5173` والباك إند على `http://localhost:3001`. لتشغيل أحدهما فقط استخدم `pnpm dev:client` أو `pnpm dev:server`.

للنشر المستقل: انشر `client/` كواجهة ثابتة، وانشر `server/` على استضافة Node.js، وضع رابط الخادم في `VITE_API_BASE_URL` واضبط `CLIENT_ORIGIN` في الخادم على رابط الواجهة.


## تقسيم الفريق (الإصدار الحالي)

- `client/`: تطبيق React + Vite ومسؤوليات الواجهة.
- `server/`: Node API وقاعدة البيانات والوظائف الخلفية.
- `team/`: توزيع الملفات على خمسة أفراد وترتيب الدمج.
- ملفات `.gitignore.person-01` إلى `.gitignore.person-05`: خمسة ملفات فقط، كل ملف يحتوي قواعد مشتركة ومجموعات ملفات الأفراد الآخرين باستثناء ملفات صاحبه. تُضاف إلى `.git/info/exclude` محليًا. أما `.sparse-checkout.person-01` إلى `.sparse-checkout.person-05` فتحدد ملفات نسخة العمل الفعلية لكل فرد. راجع `team/USING_PERSON_PROFILES_AR.md`.
