import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  getHomepageWorkflowTools,
  HOMEPAGE_WORKFLOWS,
} from "@/lib/home/homepage-tools";

const WORKFLOW_STYLES = [
  "border-violet-200 bg-violet-50/70 text-violet-800",
  "border-blue-200 bg-blue-50/70 text-blue-800",
  "border-amber-200 bg-amber-50/70 text-amber-900",
] as const;

export function WorkflowStories() {
  return (
    <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="section-eyebrow">Connected work, not isolated tools</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
            Follow a workflow—or enter at any step.
          </h2>
        </div>

        <div className="mt-9 space-y-4">
          {HOMEPAGE_WORKFLOWS.map((workflow, workflowIndex) => {
            const workflowTools = getHomepageWorkflowTools(workflow.toolIds);
            return (
              <article
                key={workflow.id}
                className="grid gap-5 rounded-[1.25rem] border border-slate-200 bg-[#fbfaf7] p-5 md:grid-cols-[260px_minmax(0,1fr)] md:items-center lg:p-6"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    Workflow {workflowIndex + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-slate-950">
                    {workflow.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {workflow.description}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {workflowTools.map((tool, index) => {
                    const Icon = tool.icon;
                    return (
                      <div
                        key={tool.id}
                        className="contents"
                      >
                        <Link
                          href={tool.href}
                          className={`group flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-xl border px-3.5 py-3 outline-none transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-violet-100 ${WORKFLOW_STYLES[workflowIndex]}`}
                        >
                          <Icon size={18} className="shrink-0" />
                          <span className="min-w-0 text-sm font-bold">
                            {tool.shortTitle ?? tool.title}
                          </span>
                        </Link>
                        {index < workflowTools.length - 1 ? (
                          <ArrowRight
                            size={16}
                            className="mx-auto shrink-0 rotate-90 text-slate-300 sm:rotate-0"
                            aria-hidden="true"
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

