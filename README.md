# ذِكرى (ZIKRA) — تطبيق الذكريات المشتركة

Expo SDK 51 · React Native 0.74.5 · React 18.2.0 · Expo Router 3.5 · Supabase (مشروع جديد ومستقل).

## 1) التثبيت
```bash
npm install --legacy-peer-deps
npx expo install --check      # للتحقق فقط؛ لا ترقّ أي حزمة خارج إصدارات SDK 51
```

## 2) قاعدة البيانات (مشروع Supabase جديد)
1. أنشئ مشروعاً جديداً في supabase.com (لا تستخدم مشروعك القديم).
2. SQL Editor ← الصق محتوى `supabase/schema.sql` كاملاً ← Run (مرة واحدة).
3. أنشئ أول مدير (اختياري) بعد تسجيل حسابك من التطبيق:
   `update public.app_users set role = 'admin' where username = 'اسم_مستخدمك';`
4. Edge Function للصور:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <PROJECT_REF>
   supabase functions deploy zikra-media --no-verify-jwt
   ```
   (متغيرات `SUPABASE_URL` و`SUPABASE_SERVICE_ROLE_KEY` تتوفر تلقائياً داخل الدالة؛ لا تضع service_role في التطبيق.)

## 3) ما عليك ملؤه يدوياً
- `src/constants/config.js`: `SUPABASE_URL` و`SUPABASE_ANON_KEY` (anon public فقط).
- `assets/`: ضع `icon.png` (1024×1024) و`adaptive-icon.png` (1024×1024، المحتوى داخل المنطقة الآمنة) و`splash.png`.
- `app.json`: غيّر `com.yourname.zikramemories` (في android.package و ios.bundleIdentifier) إلى قيمك الفريدة، وغيّر `slug` إن لزم.
- `eas init` ينشئ `projectId` جديداً تلقائياً.

## 4) التشغيل والبناء
```bash
npx expo start
npm i -g eas-cli
eas login
eas init
eas build -p android --profile preview      # APK للتثبيت المباشر
eas build -p android --profile production   # AAB للمتجر
```

## ملاحظات
- RTL: يُفعَّل بالكامل بعد إغلاق التطبيق وفتحه مرة ثانية عند أول تثبيت.
- SDK 51 يستهدف Android API 34. Google Play يشترط API 36 للتطبيقات الجديدة منذ 2026‑08‑31، فالنشر على المتجر يتطلب ترقية SDK لاحقاً؛ APK الاختباري (preview) لا يتأثر.
- الصور: خاصة بالكامل في حاوية `zikra-media` وتُعرض بروابط موقّعة مؤقتة لأعضاء الغرفة فقط.
