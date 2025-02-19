"use client";

import { api } from "../../../convex/_generated/api";
import { useQuery } from "@/usingSession";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIdentity } from "@/components/SessionProvider";
import { useCourseSlug } from "@/hooks/useCourseSlug";

export default function CurrentUser() {
  const router = useRouter();
  const courseSlug = useCourseSlug();
  const user = useQuery(api.courses.getRegistration, { courseSlug });
  const identity = useIdentity();

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [router, user]);

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col leading-snug text-gray-700">
        <p className="text-gray-800 font-semibold">
          {identity ? identity.name : user.name}
          {user.group && <span className="font-normal"> ({user.group})</span>}
        </p>
        <p>{identity ? identity.email : user.email}</p>
      </div>
    </div>
  );
}
