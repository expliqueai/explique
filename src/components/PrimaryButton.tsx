import React from "react";

export function PrimaryButton({
  children,
  disabled,
  onClick,
  href,
  type,
  target,
}: React.PropsWithChildren<
  | {
      disabled?: boolean;
      onClick?: () => void;
      type?: "button" | "submit";
      href?: never;
      target?: never;
    }
  | {
      disabled?: never;
      onClick?: never;
      type?: never;
      href: string;
      target?: string;
    }
>) {
  const className =
    "flex gap-1 justify-center items-center py-3 px-6 bg-linear-to-b from-purple-500 to-purple-600 text-white sm:text-lg font-semibold rounded-2xl shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:text-slate-700";

  return href !== undefined ? (
    <a href={href} className={className} target={target}>
      {children}
    </a>
  ) : (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
