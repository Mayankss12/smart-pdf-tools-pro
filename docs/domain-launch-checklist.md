# PDFMantra custom-domain launch checklist

The application code is domain-independent. Complete these dashboard steps after the final domain is purchased.

## 1. Hostinger

- Purchase the domain only. Web hosting and paid SSL are not required.
- Keep Hostinger nameservers active.
- Do not add DNS values until Vercel displays the exact records for this project.

## 2. Vercel project

1. Open **Project > Settings > Domains**.
2. Add the apex domain, for example `pdfmantra.example`.
3. Add `www.pdfmantra.example`.
4. Select the apex domain as primary and redirect `www` to it.
5. Copy Vercel's exact A and CNAME values into the Hostinger DNS zone.
6. Remove only conflicting parking A, AAAA, or CNAME records. Preserve mail records.
7. Set `NEXT_PUBLIC_SITE_URL=https://pdfmantra.example` for Production.
8. Redeploy after changing the environment variable.

Vercel provisions HTTPS automatically after DNS verification.

## 3. Supabase Auth

Open **Authentication > URL Configuration**.

- Site URL: `https://pdfmantra.example`
- Exact production redirect: `https://pdfmantra.example/auth/callback`
- Local development redirect: `http://localhost:3000/**`

Keep preview-domain wildcards only when preview authentication is intentionally required. Production should use the exact callback path.

## 4. Verification

Run:

```powershell
$env:NEXT_PUBLIC_SITE_URL="https://pdfmantra.example"
npm.cmd run audit:domain
npm.cmd run build
```

Then verify:

- `/` redirects consistently between `www` and apex.
- `/robots.txt` names the production sitemap and host.
- `/sitemap.xml` contains only production-domain URLs.
- Canonical and Open Graph URLs use the production domain.
- Signup confirmation opens the production site.
- Login password + OTP completes successfully.
- Forgot-password email opens `/auth/callback` and then `/reset-password`.
- Logout returns to the production login page.
- No browser console or mixed-content errors appear.

For the authenticated production workspace acceptance test, set either
`PDFMANTRA_ACCEPTANCE_BASE_URL` or `NEXT_PUBLIC_SITE_URL` to the production
origin. The test intentionally has no hard-coded live fallback.

## 5. Rollback

Keep the existing `vercel.app` deployment active until DNS, HTTPS, authentication, and password recovery have all passed. DNS can be pointed back without changing application data.
