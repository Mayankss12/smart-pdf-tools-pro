import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  getHomepageWorkflowTools,
  HOMEPAGE_WORKFLOWS,
} from "@/lib/home/homepage-tools";

export function WorkflowStories() {
  return (
    <section className="home-section-alt border-y border-[var(--home-border)] py-16 sm:py-20">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="section-eyebrow">Connected work, not isolated tools</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
            Follow a workflow—or enter at any step.
          </h2>
        </div>

        <div className="mt-9 divide-y divide-[var(--home-border)] border-y border-[var(--home-border)]">
          {HOMEPAGE_WORKFLOWS.map((workflow, workflowIndex) => {
            const workflowTools = getHomepageWorkflowTools(workflow.toolIds);
            return (
              <article
                key={workflow.id}
                className="grid gap-6 py-7 md:grid-cols-[250px_minmax(0,1fr)] md:items-center"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">
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
                      <div key={tool.id} className="contents">
                        <Link
                          href={tool.href}
                          className="group flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-slate-800 outline-none transition hover:bg-white hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-100"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-violet-700 ring-1 ring-[var(--home-border)]">
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 text-sm font-bold">
                            {tool.shortTitle ?? tool.title}
                          </span>
                        </Link>
                        {index < workflowTools.length - 1 ? (
                          <ArrowRight
                            size={16}
                            className="mx-auto shrink-0 rotate-90 text-violet-400 sm:rotate-0"
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
