import type { ReactNode } from "react";

export default function DashboardPageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="dashboard-page-heading flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-faida-teal">{eyebrow}</p>
        <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-faida-navy sm:text-[28px]">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-faida-slate">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
