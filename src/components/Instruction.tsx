import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline"
import clsx from "clsx"

type Variant = "info" | "success" | "error"

export default function Instruction({
  children,
  variant,
}: React.PropsWithChildren<{
  variant: Variant
}>) {
  const Icon = iconForVariant(variant)

  return (
    <p className="flex items-center justify-center gap-1 font-light sm:text-lg">
      <Icon
        className={clsx(
          "size-6 text-purple-700",
          variant === "error" ? "text-red-600" : "text-purple-700"
        )}
        aria-hidden="true"
      />
      <span
        className={clsx(
          "[&>strong]:font-medium",
          variant === "error"
            ? "[&>strong]:text-red-600"
            : "[&>strong]:text-purple-700"
        )}
      >
        {children}
      </span>
    </p>
  )
}

function iconForVariant(variant: Variant) {
  switch (variant) {
    case "info":
      return InformationCircleIcon
    case "success":
      return CheckCircleIcon
    case "error":
      return ExclamationCircleIcon
    default:
      const _never: never = variant
      throw new Error(`Unknown variant: ${_never}`)
  }
}
