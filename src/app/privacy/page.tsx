import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | PDFMantra",
  description: "Learn how PDFMantra handles privacy and document workflows.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ff] px-6 py-16 text-slate-950">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-violet-100 bg-white/85 p-8 shadow-sm md:p-12">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-violet-600">
          PDFMantra
        </p>

        <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
          Privacy Policy
        </h1>

        <p className="mt-5 text-base leading-7 text-slate-600">
          This Privacy Policy explains how PDFMantra handles basic account,
          document, and service-related information. This page is currently a
          starter policy and should be reviewed before public launch.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font-bold text-slate-950">
              1. Information we collect
            </h2>
            <p className="mt-3">
              PDFMantra may collect basic account information such as your email
              address, authentication details, and service activity needed to
              operate the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">
              2. Documents and files
            </h2>
            <p className="mt-3">
              Some PDFMantra tools may process files directly in your browser.
              Future backend-assisted features may store or process files only
              when required for saved documents, annotation projects, signatures,
              or processing jobs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">
              3. How we use information
            </h2>
            <p className="mt-3">
              We use information to provide account access, maintain sessions,
              improve document workflows, protect the platform, and support
              future workspace features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">
              4. Authentication
            </h2>
            <p className="mt-3">
              PDFMantra uses authentication services to help users sign up, log
              in, verify access, and manage account sessions securely.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">
              5. Data security
            </h2>
            <p className="mt-3">
              We aim to use reasonable technical safeguards to protect account
              and workspace information. However, no online service can
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">
              6. Contact
            </h2>
            <p className="mt-3">
              For questions about this Privacy Policy, please contact the
              PDFMantra team.
            </p>
          </section>
        </div>

        <p className="mt-10 rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4 text-xs leading-6 text-violet-800">
          Note: This is a starter Privacy page for development use. Final legal
          wording should be reviewed before production launch.
        </p>
      </section>
    </main>
  );
}
