"use client";

import Title from "@/components/typography";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@/usingSession";
import Input from "@/components/Input";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function SuperadminAddCoursePage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const save = useMutation(api.superadmin.courses.add);
  const router = useRouter();

  return (
    <div className="bg-slate-100 h-full p-10 flex justify-center">
      <div className="max-w-xl flex-1">
        <Title backHref={`/superadmin`}>Add Course</Title>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await save({ name, code });
              toast.success("Course created.");
              router.push(`/superadmin`);
            } catch {}
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
      </div>
    </div>
  );
}
