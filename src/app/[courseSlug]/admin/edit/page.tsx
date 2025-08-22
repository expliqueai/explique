"use client";

import Title from "@/components/typography";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../../../convex/_generated/api";
import Input from "@/components/Input";
import { useState } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function Form({
  initialState,
  onSumbit,
  onSumbitStop,
}: {
  initialState: {
    name: string;
    code: string;
  };
  onSumbit?: () => void;
  onSumbitStop?: () => void;
}) {
  const courseSlug = useCourseSlug();
  const [name, setName] = useState(initialState.name);
  const [code, setCode] = useState(initialState.code);

  const save = useMutation(api.admin.course.edit);
  const router = useRouter();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          onSumbit?.();
          const { slug } = await save({ courseSlug, name, code });
          toast.success("Course saved.");
          router.push(`/${slug}/admin`);
        } catch {
          onSumbitStop?.();
        }
      }}
    >
      <Input
        value={name}
        onChange={setName}
        label={"Name"}
        required
        maxLength={50}
        hint="(e.g. Algorithms I)"
      />
      <Input
        value={code}
        onChange={setCode}
        label={"Code"}
        required
        maxLength={15}
        hint="(e.g. CS-250)"
      />
      <PrimaryButton type="submit">Save</PrimaryButton>
    </form>
  );
}

export default function AdminCourseEditPage() {
  const courseSlug = useCourseSlug();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const course = useQuery(
    api.admin.course.get,
    isSubmitting ? "skip" : { courseSlug },
  );

  return (
    <div className="bg-slate-100 h-full p-10 flex justify-center">
      <div className="max-w-xl flex-1">
        <Title backHref={`/${courseSlug}/admin`}>Edit Course</Title>

        {course ? (
          <Form
            initialState={course}
            onSumbit={() => setIsSubmitting(true)}
            onSumbitStop={() => setIsSubmitting(false)}
          />
        ) : (
          <div className="w-full mx-auto h-48 sm:h-32 rounded-xl bg-slate-200 animate-pulse"></div>
        )}
      </div>
    </div>
  );
}
