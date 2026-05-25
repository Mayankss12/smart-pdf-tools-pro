import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | PDFMantra",
  description: "Read the terms for using PDFMantra smart PDF workspace.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ff] px-6 py-16 text-slate-950">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-violet-100 bg-white/85 p-8 shadow-sm md:p-12">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-violet-600">
          PDFMantra
        </p>

        <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
          Terms of Service
        </h1>

        <p className="mt-5 text-base leading-7 text-slate-600">
          These Terms of Service explain the basic rules for using PDFMantra.
          This page is currently a starter policy and should be reviewed before
          public launch.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-xl font800 font-bold text-slate-950">
              1. Use of PDFMantra
            </h2>
            <p className="mt-3">
              PDFMantra provides PDF tools for editing, annotating, converting,
              organizing, and managing documents. You agree to use the platform
              only for lawful purposes and in a way that does not harm the
              service, other users, or third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">
              2. Your documents
            </h2>
            <p className="mt-3">
              You are responsible for the files you upload, process, or store.
              You should not upload documents that you do not have permission to
              use, share, or process.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">
              3. Account security
            </h2>
            <p className="mt-3">
              If you create an account, you are responsible for keeping your
              login details secure and for all activity under your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">
              4. Service changes
            </h2>
            <p className="mt-3">
              PDFMantra may update, improve, limit, or discontinue features as
              the product develops. Some features may be browser-side, while
              others may require backend processing or paid plans in the future.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">
              5. No legal guarantee
            </h2>
            <p className="mt-3">
              PDFMantra tools are provided to help with document workflows. We
              do not guarantee that generated, edited, converted, or processed
              documents will meet every legal, financial, or compliance
              requirement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-950">
              6. Contact
            </h2>
            <p className="mt-3">
              For questions about these terms, please contact the PDFMantra
              team.
            </p>
          </section>
        </div>

        <p className="mt-10 rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4 text-xs leading-6 text-violet-800">
          Note: This is a starter Terms page for development use. Final legal
          wording should be reviewed before production launch.
        </p>
      </section>
    </main>
  );
}
