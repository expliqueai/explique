import { Radio, RadioGroup, Switch } from "@headlessui/react";
import clsx from "clsx";
import Tooltip from "./Tooltip";

export function IconCheckbox({
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

export function IconToggle<T extends string>({
  values,
  value,
  onChange,
}: {
  values: {
    value: T;
    tooltip: string;
    icon: React.ReactNode;
  }[];
  value: T;
  onChange: (newValue: T) => void;
}) {
  const currentValue = value;

  return (
    <RadioGroup value={value} onChange={onChange}>
      <div className="flex gap-2">
        {values.map(({ value, tooltip, icon }) => (
          <Tooltip
            key={value}
            tip={tooltip}
            side="bottom"
            sideOffset={4}
            asChild
          >
            <RadioGroup.Option
              value={value}
              className={clsx(
                "p-1.5 rounded mr-1 transition-colors focus:outline-none focus-visible:ring",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                value === currentValue
                  ? "bg-slate-300 text-slate-700"
                  : "hover:bg-slate-200 hover:text-slate-600 text-slate-500",
              )}
            >
              {icon}
            </RadioGroup.Option>
          </Tooltip>
        ))}
      </div>
    </RadioGroup>
  );
}
