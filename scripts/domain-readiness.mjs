import { resolveSiteUrl } from "../src/lib/site-url.ts";

const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

if (!configured) {
  console.log(
    JSON.stringify(
      {
        status: "pending-domain",
        message:
          "Set NEXT_PUBLIC_SITE_URL to the purchased HTTPS domain, then run this audit again.",
        remainingDashboardSteps: [
          "Add the apex and www domains to the Vercel project.",
          "Copy the exact Vercel A and CNAME values into Hostinger DNS.",
          "Set the Supabase Auth Site URL to the production domain.",
          "Allow the exact /auth/callback URL in Supabase Auth redirects.",
        ],
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const siteUrl = resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: configured });
if (siteUrl.includes("localhost")) {
  throw new Error("NEXT_PUBLIC_SITE_URL must be the public production domain.");
}

console.log(
  JSON.stringify(
    {
      status: "code-ready",
      siteUrl,
      expectedAuthCallback: `${siteUrl}/auth/callback`,
      expectedPasswordRecovery: `${siteUrl}/reset-password`,
      expectedSitemap: `${siteUrl}/sitemap.xml`,
      expectedRobots: `${siteUrl}/robots.txt`,
    },
    null,
    2,
  ),
);
