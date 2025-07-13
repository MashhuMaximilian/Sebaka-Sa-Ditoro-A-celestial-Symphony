
"use client";

import { cn } from "@/lib/utils";

interface DataDisplayProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export default function DataDisplay({ label, value, className }: DataDisplayProps) {
  if (!value) return null;
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-1", className)}>
      <dt className="font-semibold text-muted-foreground">{label}</dt>
      <dd className="md:col-span-2 text-foreground">{value}</dd>
    </div>
  );
}
