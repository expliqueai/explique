"use client";

import { useCourseSlug } from "@/hooks/useCourseSlug";
import { useQuery } from "@/usingSession";
import { ChevronLeftIcon } from "@heroicons/react/16/solid";
import {
  PuzzlePieceIcon,
  UserIcon,
  AcademicCapIcon,
  ExclamationCircleIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { ReactNode } from "react";
import { api } from "../../../../../convex/_generated/api";
import { NavLink } from "@/components/NavLink";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  const courseSlug = useCourseSlug();
  const registration = useQuery(api.courses.getRegistration, { courseSlug });

  return (
    <div className="bg-slate-100 h-min-full flex flex-col md:flex-row md:justify-center p-6 sm:p-10 gap-10">
      <nav className="md:w-48 flex flex-col gap-2">
        <Link
          className="flex items-center gap-1 h-10 text-slate-600 hover:text-slate-900 transition-colors rounded focus:outline-hidden focus:ring-4"
          href={`/${courseSlug}`}
        >
          <ChevronLeftIcon className="w-5 h-5" />
          {registration ? (
            <span>{registration.course.code}</span>
          ) : (
            <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse" />
          )}
        </Link>

        <NavLink href={`/${courseSlug}/admin`}>
          <AcademicCapIcon />
          Course
        </NavLink>
        <NavLink href={`/${courseSlug}/admin/exercises`}>
          <PuzzlePieceIcon />
          Exercises
        </NavLink>
        <NavLink href={`/${courseSlug}/admin/lectures`}>
          <VideoCameraIcon />
          Lectures
        </NavLink>
        <NavLink href={`/${courseSlug}/admin/super-assistant`}>
          <ChatBubbleLeftRightIcon />
          Super-Assistant
        </NavLink>
        <NavLink href={`/${courseSlug}/admin/users`}>
          <UserIcon />
          Users
        </NavLink>
        <NavLink href={`/${courseSlug}/admin/reports`}>
          <ExclamationCircleIcon />
          Reports
        </NavLink>
      </nav>
      <div className="max-w-6xl md:flex-1">{children}</div>
    </div>
  );
}
