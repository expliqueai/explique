import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import clsx from "clsx"
import Link from "next/link"

export default function ActivityHeader({
  goBackTo,
  title,
  action,
  isSolid = false,
}: {
  goBackTo: string | undefined
  title: string | undefined
  action?: React.ReactNode
  isSolid?: boolean
}) {
  return (
    <>
      <header
        className={clsx(
          "bg-opacity-90 top-0 left-0 z-10 flex h-10 w-full items-center justify-center bg-white px-8 py-2 shadow-lg backdrop-blur-lg sm:h-12",
          isSolid ? "block" : "fixed"
        )}
      >
        {goBackTo && (
          <Link
            href={goBackTo}
            title="Back"
            className="absolute top-0 left-5 flex h-10 w-10 items-center justify-center sm:h-12 sm:w-12"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>
        )}

        <h1 className="w-[calc(100%-4rem)] truncate text-center text-lg font-medium sm:text-xl">
          {title ?? (
            <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
          )}
        </h1>

        {action && <div className="absolute top-0 right-5">{action}</div>}
      </header>
      {!isSolid && <div className="h-10 sm:h-12" />}
    </>
  )
}
