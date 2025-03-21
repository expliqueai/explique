import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import Link from "next/link";

export default function ActivityHeader({
  goBackTo,
  title,
  action,
  isSolid = false,
}: {
  goBackTo: string | undefined;
  title: string | undefined;
  action?: React.ReactNode;
  isSolid?: boolean;
}) {
  return (
    <>
      <header
        className={clsx(
          "h-14 sm:h-16 top-0 left-0 w-full bg-white bg-opacity-90 backdrop-blur-lg p-4 shadow-lg flex items-center justify-center z-10",
          isSolid ? "block" : "fixed",
        )}
      >
        {goBackTo && (
          <Link
            href={goBackTo}
            title="Back"
            className="absolute top-0 left-0 sm:w-16 sm:h-16 w-14 h-14 flex items-center justify-center"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
        )}

        <h1 className="text-lg sm:text-xl font-medium text-center">
          {title ?? (
            <div className="animate-pulse h-7 bg-slate-200 rounded w-56" />
          )}
        </h1>

        {action && <div className="absolute top-0 right-0">{action}</div>}
      </header>
      {!isSolid && <div className="h-14 sm:h-16" />}
    </>
  );
}
