import { Switch } from "@headlessui/react";
import clsx from "clsx";
import Tooltip from "./Tooltip";

export function QuizBatchOption({
  checked,
  onChange,
  tooltip,
  children,
  disabled = false,
}: React.PropsWithChildren<{
  checked: boolean;
  onChange: (newValue: boolean) => void;
  tooltip: React.ReactNode;
  disabled?: boolean;
}>) {
  return (
    <Tooltip tip={tooltip} side="bottom" sideOffset={4} asChild>
      <Switch
        className={clsx(
          "p-1.5 rounded mr-1 transition-colors focus:outline-none focus-visible:ring",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          checked
            ? "bg-slate-300 text-slate-700"
            : !disabled &&
                "hover:bg-slate-200 hover:text-slate-600 text-slate-500",
        )}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      >
        {children}
      </Switch>
    </Tooltip>
  );
}
