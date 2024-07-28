import clsx from "clsx";
import Link from "next/link";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

export function ChatLink({
  href,
  name,
  corner,
}: {
  href: string;
  name: string;
  corner?: React.ReactNode;
}) {
  return (
    <div className="block shadow-lg transition hover:scale-105 hover:shadow-2xl group rounded-3xl">
      <div className="relative pb-[57.14%]">
        <div className="rounded-3xl overflow-hidden absolute inset-0 focus-within:ring-8 bg-sky-400 hover:bg-sky-700">
          <Link
            href={href}
            className="absolute inset-0 flex p-4 text-white items-end focus:outline-none"
          >
            <ChatBubbleLeftRightIcon className="max-w-20 max-h-20" />
            <h2 className="font-semibold text-2xl text-shadow-lg [text-wrap:balance]">
              {name}
            </h2>
          </Link>
        </div>

        {corner && (
          <div className="absolute top-0 right-0 pointer-events-none">
            {corner}
          </div>
        )}
      </div>
    </div>
  );
}
