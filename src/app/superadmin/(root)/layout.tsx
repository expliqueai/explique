"use client";

import { ChevronLeftIcon } from "@heroicons/react/16/solid";
import { AcademicCapIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { ReactNode } from "react";
import { NavLink } from "@/components/NavLink";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-slate-100 h-min-full flex flex-col md:flex-row md:justify-center p-4 sm:p-10 gap-10">
      <nav className="md:w-48 flex flex-col gap-2">
        <Link
          className="flex items-center gap-1 h-10 text-slate-600 hover:text-slate-900 transition-colors rounded focus:outline-hidden focus:ring-4"
          href="/"
        >
          <ChevronLeftIcon className="w-5 h-5" /> Back
        </Link>

        <NavLink href={`/superadmin`}>
          <AcademicCapIcon />
          Courses
        </NavLink>
      </nav>
      <div className="max-w-6xl md:flex-1">{children}</div>
    </div>
  );
}
