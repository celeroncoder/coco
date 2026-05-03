import { type ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b px-8 py-5">
      <div className="flex flex-col gap-0.5">
        <h1 className="font-display text-title-h6 font-medium tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-paragraph-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
