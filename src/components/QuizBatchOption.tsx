import { Switch } from "@headlessui/react";
import clsx from "clsx";
import Tooltip from "./Tooltip";

export function QuizBatchOption({
  checked,
  onChange,
  tooltip,
  children,
}: React.PropsWithChildren<{
  checked: boolean;
  onChange: (newValue: boolean) => void;
  tooltip: React.ReactNode;
}>) {
  return (
    <Tooltip tip={tooltip} side="bottom" sideOffset={4} asChild>
      <Switch
        className={clsx(
          "p-1.5 rounded mr-1 transition-colors focus:outline-none focus-visible:ring",
          checked
            ? "bg-slate-300 text-slate-700"
            : "hover:bg-slate-200 hover:text-slate-600 text-slate-500",
        )}
        checked={checked}
        onChange={onChange}
      >
        {children}
      </Switch>
    </Tooltip>
  );
}
