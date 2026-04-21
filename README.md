# Jeff Pickup (Jeffersonville Pick up Soccer)

Mobile-first web app to sign up for **today’s pickup soccer** and see a **shared roster** (by date + location).

## Links

- Facebook group: `https://www.facebook.com/share/g/18ruTArVRB/`
- WhatsApp group: `https://l.facebook.com/l.php?u=https%3A%2F%2Fchat.whatsapp.com%2FCGKl1hIhaoJ7zjIPNVcEZ1%3Fmode%3Dems_copy_c%26fbclid%3DIwZXh0bgNhZW0CMTAAYnJpZBExQW9UQlRENGxmc3hLNHN2cXNydGMGYXBwX2lkEDIyMjAzOTE3ODgyMDA4OTIAAR72867lrLGpSLAi0MElnoTyy_nIsItUv2vxSLi8zZ1QzrOi-jOLBqAl7TLzyw_aem_Wbdxa-HIEA8qr-i3utN1lQ&h=AT6N82Mu8Hu_IXFtfs4j2h9BgyMVkWAPNMTluGdsjlWeEHkJUIzGLESkkKck45Y4J0N_lT7kakBuycLRMuGQcJUU4RPHIIEvnGr2eIWlMcK2Ob66nz05nQpcq1gt-5O9jJumtd60lrTp4VVSKieYVqeH5Ni_ji-Bn1w&__tn__=-UK-R&c[0]=AT48Ry3TVtd0cmpNXdwgk7NKkTr8trEBk7XG4hQIyKE4n6ALoLtj3recVAxIuvYOQP6CyQbUq_peDSCujGrN-5CG5DLG0Ul0WZksK15eA5POJxsviovx6L9vFOshNrICAVFGImFAc2F97_b2W1cK8xzuYWXJ1GAVtWc8krnONBoJvnarZ6eh8a-syfyuaxbO6QiG2TvHJMOYXJ8S9LRKim96UFm8`

## Local development

Install deps:

```bash
npm install
```

Create an env file:

```bash
cp .env.example .env
```

Fill in:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- (optional) `VITE_ADMIN_PIN` (used by the hidden admin menu)

Run dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Supabase setup (shared roster)

1. Create a Supabase project.
2. In the Supabase **SQL Editor**, run:
   - `supabase/migrations/001_create_signups.sql`
   - `supabase/migrations/002_signups_unregister_and_settings.sql`
   - `supabase/migrations/003_add_active_time_setting.sql`
   - `supabase/migrations/004_add_announcement_settings.sql`
   - `supabase/migrations/005_decouple_location_and_admin_remove.sql`
   - `supabase/migrations/006_add_game_status_settings.sql`
   - `supabase/migrations/007_add_guest_count_to_signups.sql`
3. In Supabase project settings, copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

RLS is enabled:

- `public.signups`: public **select + insert**; unregister is done via `public.unregister_signup(signup_id, delete_token)`
- `public.app_settings`: public **select + update** (used for active location)
 

## Admin menu (hidden)

Tap **“Location & Time”** quickly **5 times** to open the admin sheet and set the active location/time.

If `VITE_ADMIN_PIN` is set, you’ll be prompted for the PIN before changing the location.

## Deploy

Deploy the frontend to **Netlify** or **Vercel** and set the same environment variables there:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- (optional) `VITE_ADMIN_PIN`

Then redeploy.

