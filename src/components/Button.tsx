import clsx from "clsx"
import React from "react"

export function Button({
  children,
  disabled,
  onClick,
  href,
  type = "button",
  target,
  variant = "primary",
  size = "base",
}: React.PropsWithChildren<
  (
    | {
        disabled?: boolean
        onClick?: () => void
        type?: "button" | "submit"
        href?: never
        target?: never
      }
    | {
        disabled?: never
        onClick?: never
        type?: never
        href: string
        target?: string
      }
  ) & {
    variant?: "primary" | "secondary" | "danger"
    size?: "sm" | "base"
  }
>) {
  const className = clsx(
    "font-medium px-4 py-2 rounded-2xl cursor-pointer inline-flex items-center gap-2 border border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 tracking-normal",
    size == "sm" && "text-sm rounded-lg",
    size == "base" && "text-base",
    !disabled &&
      variant == "primary" &&
      "bg-blue-100 hover:bg-blue-200 text-blue-900",
    !disabled &&
      variant == "danger" &&
      "bg-red-100 hover:bg-red-200 text-red-900",
    !disabled && variant == "secondary" && "text-gray-600 hover:bg-gray-100",
    disabled && "text-gray-700 bg-gray-200 cursor-not-allowed"
  )

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
  )
}
