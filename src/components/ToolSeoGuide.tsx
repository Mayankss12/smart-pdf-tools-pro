import type { ToolGuide } from "@/lib/tool-guides";

export function ToolSeoGuide({ guide }: { readonly guide: ToolGuide }) {
  return (
    <section
      aria-labelledby={`${guide.eyebrow.toLowerCase().replaceAll(" ", "-")}-heading`}
      className="mx-auto max-w-6xl px-4 pb-14 pt-5 sm:px-6 lg:px-8"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-violet-600">
          {guide.eyebrow}
        </p>
        <h2
          id={`${guide.eyebrow.toLowerCase().replaceAll(" ", "-")}-heading`}
          className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
        >
          {guide.title}
        </h2>
        <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
          {guide.introduction}
        </p>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h3 className="text-lg font-bold text-slate-900">How to use this tool</h3>
            <ol className="mt-3 space-y-3">
              {guide.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-medium leading-6 text-violet-900">
              {guide.example}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">What to check</h3>
            <ul className="mt-3 space-y-3">
              {guide.limitations.map((limitation) => (
                <li key={limitation} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold text-slate-900">Frequently asked questions</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {guide.faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-slate-200 p-4">
                <summary className="cursor-pointer list-none pr-5 text-sm font-bold text-slate-900 marker:hidden">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
