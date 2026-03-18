import { cn } from "@/lib/utils";
import * as React from "react";

export interface NanopubIconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number | string;
}

export function NanopubIcon({
  className,
  size = 24,
  ...props
}: NanopubIconProps) {
  return (
    <div
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      <img
        src="/nanopub.png"
        alt="Nanopub"
        className="block dark:hidden w-full h-full object-contain"
      />
      <img
        src="/nanopub_dark.png"
        alt="Nanopub"
        className="hidden dark:block w-full h-full object-contain"
      />
    </div>
  );
}
