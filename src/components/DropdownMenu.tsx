import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
} from "@headlessui/react";
import { EllipsisVerticalIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import Link from "next/link";
import React from "react";

export function DropdownMenu({
  children,
  variant = "ghost",
}: React.PropsWithChildren<{
  variant?: "ghost" | "overlay";
}>) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <MenuButton
          className={clsx(
            "w-10 h-10 flex items-center justify-center rounded-full focus:outline-hidden",
            variant == "ghost" &&
              "text-slate-400 hover:text-slate-600 focus:ring-2 focus:text-slate-600 transition-colors",
            variant == "overlay" &&
              "bg-black/30 hover:bg-black/40 focus:bg-black/40 backdrop-blur-xl text-white/80 hover:text-white focus:ring-4 focus:text-white transition-colors",
          )}
        >
          <span className="sr-only">Open options</span>
          <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
        </MenuButton>
      </div>

      <Transition
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-hidden">
          <div className="py-1">{children}</div>
        </MenuItems>
      </Transition>
    </Menu>
  );
}

export function DropdownMenuItem({
  href,
  onClick,
  children,
  variant = "default",
}: React.PropsWithChildren<
  (
    | { href: string; onClick?: never }
    | { href?: never; onClick: () => void }
  ) & { variant?: "default" | "danger" }
>) {
  return (
    <MenuItem>
      {({ focus }) =>
        href !== undefined ? (
          <Link
            href={href}
            className={clsx(
              variant === "default"
                ? focus
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-700"
                : focus
                  ? "bg-slate-100 text-red-700"
                  : "text-red-600",
              "block px-4 py-2 text-sm w-full text-left",
            )}
          >
            {children}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClick}
            className={clsx(
              variant === "default"
                ? focus
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-700"
                : focus
                  ? "bg-slate-100 text-red-700"
                  : "text-red-600",
              "block px-4 py-2 text-sm w-full text-left",
            )}
          >
            {children}
          </button>
        )
      }
    </MenuItem>
  );
}
