"use client";

import { useAction, useMutation, useQuery } from "@/usingSession";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import Title from "@/components/typography";
import { Button } from "@/components/Button";
import Upload from "@/components/Upload";
import Input from "@/components/Input";
import ExerciseForm, { toConvexState } from "@/components/ExerciseForm";

import { useCourseSlug } from "@/hooks/useCourseSlug";
import { useFileUpload } from "@/hooks/useFileUpload";

import { pdfToImg as PdfToImg } from "pdftoimg-js/browser";


import { Id } from "../../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../../convex/_generated/api";

type Mode = "explain" | "problems";

export default function NewItemPage() {
  const router = useRouter();
  const params = useParams();

  const initialWeekId = params.weekId as Id<"weeks"> | undefined;
  const courseSlug = useCourseSlug();

  const [mode, setMode] = useState<Mode>("explain");

  return (
    <div className="bg-slate-100 h-full p-10 flex justify-center">
      <div className="max-w-6xl flex-1">
        <Title backHref={`/${courseSlug}/admin/exercises`}>New Item</Title>

        {/* Toggle buttons */}
        <div className="mb-6 flex gap-2">
          <Button
            type="button"
            variant={mode === "explain" ? "primary" : "secondary"}
            onClick={() => setMode("explain")}
            size="sm"
          >
            Explain / Quiz
          </Button>
          <Button
            type="button"
            variant={mode === "problems" ? "primary" : "secondary"}
            onClick={() => setMode("problems")}
            size="sm"
          >
            Add Problems (Super-Assistant)
          </Button>
        </div>

        {/* Render correct form */}
        {mode === "explain" ? (
          <ExplainQuizForm
            courseSlug={courseSlug}
            initialWeekId={initialWeekId}
            onDone={() => router.push(`/${courseSlug}/admin/exercises`)}
          />
        ) : (
          <ProblemsUploadForm
            courseSlug={courseSlug}
            initialWeekId={initialWeekId}
            onDone={() => router.push(`/${courseSlug}/admin/exercises`)}
          />
        )}
      </div>
    </div>
  );
}

function ExplainQuizForm({
  courseSlug,
  initialWeekId,
  onDone,
}: {
  courseSlug: string;
  initialWeekId?: Id<"weeks">;
  onDone: () => void;
}) {
  const create = useAction(api.admin.exercises.create);

  return (
    <ExerciseForm
      submitLabel="Create"
      initialState={{
        weekId: initialWeekId ?? ("" as unknown as Id<"weeks">),
        name: "",
        image: undefined,
        imagePrompt: undefined,
        instructions:
          "You, known as Algorithm Apprentice, are designed to act as a student learning about the {ALGO} algorithm...",
        model: "gpt-4o",
        api: "chatCompletions",
        feedback: null,
        text: "",
        quizBatches: [
          {
            randomize: true,
            questions: [
              {
                question: "Question",
                answers: ["Answer 1", "Answer 2", "Answer 3", "Answer 4"],
                correctAnswerIndex: null,
              },
            ],
          },
        ],
        firstMessage: "Hi! I'm here to explain the {ALGO} algorithm!",
        controlGroup: "A",
        completionFunctionDescription:
          "Mark the exercise as complete: call when the user has demonstrated understanding of the algorithm.",
      }}
      onSubmit={async (state) => {
        await create({ courseSlug, exercise: toConvexState(state) });
        toast.success("Exercise created successfully.");
        onDone();
      }}
    />
  );
}

function extractWeekNumberFromName(name?: string): string {
  const m = name?.match(/Week\s*(\d+)/i);
  return m ? m[1] : "";
}


function ProblemsUploadForm({
  courseSlug,
  initialWeekId,
  onDone,
}: {
  courseSlug: string;
  initialWeekId?: Id<"weeks">;
  onDone: () => void;
}) {
  const [questionsPdf, setQuestionsPdf] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [week, setWeek] = useState<string>("");

  const weeks = useQuery(api.admin.exercises.list, { courseSlug });

  const generateUploadUrl = useMutation(api.admin.sadatabase.generateUploadUrl);
  const uploadFile = useMutation(api.admin.sadatabase.uploadFile);
  const { startUpload } = useFileUpload(() => generateUploadUrl({}));

  const createProblemSet = useMutation(
    api.superassistant.problemExtraction.createProblemSet
  );

  useEffect(() => {
    if (!initialWeekId || !weeks) return;
    const w: any = (weeks as any[]).find(
      (wk) => (wk._id ?? wk.id) === initialWeekId
    );
    const num = w?.week ?? w?.number ?? extractWeekNumberFromName(w?.name);
    if (num) setWeek(String(num));
  }, [weeks, initialWeekId]);

  async function handleOnePdf(file: File) {
  const storageIds: { pageNumber: number; storageId: string }[] = [];

  const uploaded = await startUpload([file]);
  storageIds.push({
    pageNumber: 0,
    storageId: (uploaded[0].response as { storageId: string }).storageId,
  });

  const filename = file.name.split(".")[0];
  const pages: string[] = await PdfToImg(URL.createObjectURL(file), {
    imgType: "png",
    pages: "all",
  });

  for (let i = 0; i < pages.length; i++) {
    const base64Data = pages[i].replace(/^data:image\/\w+;base64,/, "");
    const byteArray = Uint8Array.from(atob(base64Data), (c) =>
      c.charCodeAt(0)
    );

    const pageFile = new File([byteArray], `${filename}_page${i + 1}.png`, {
      type: "image/png",
    });


    const pageUploaded = await startUpload([pageFile]);
    storageIds.push({
      pageNumber: i + 1,
      storageId: (pageUploaded[0].response as { storageId: string }).storageId,
    });
  }

  return storageIds;
}

  return (
    <form
      className="rounded-xl bg-white p-4 shadow"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!questionsPdf) {
          toast.error("Please upload a questions PDF.");
          return;
        }
        const weekNumber = Number(week);
        if (!week || Number.isNaN(weekNumber)) {
          toast.error("Please provide a valid week number.");
          return;
        }

        try {
          setSubmitting(true);
          const storages = await handleOnePdf(questionsPdf);
          const pdfStorageId = storages.find((s) => s.pageNumber === 0)
            ?.storageId as Id<"_storage">;
          const imageStorageIds = storages
            .filter((s) => s.pageNumber > 0)
            .map((s) => s.storageId as Id<"_storage">);

          await uploadFile({
            courseSlug,
            week: weekNumber,
            name: questionsPdf.name,
            storageIds: storages.map((s) => ({
              pageNumber: s.pageNumber,
              storageId: s.storageId as Id<"_storage">,
            })),
          });

          await createProblemSet({
            courseId: weeks?.[0]?.courseId as Id<"courses">,
            weekId: initialWeekId as Id<"weeks">,
            storageId: pdfStorageId,
            storageIds: imageStorageIds,
            name: questionsPdf.name,
          });

          toast.success("Problems uploaded! Extraction will start soon.");
          onDone();
        } catch (err) {
          console.error(err);
          toast.error("Upload failed.");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <p className="mb-4 text-slate-700">
        Upload the <strong>questions PDF</strong> for the selected week. We’ll
        extract and process it for the Super-Assistant.
      </p>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Questions PDF
        </label>
        <Upload value={questionsPdf} onChange={setQuestionsPdf} />
      </div>

      <div className="mt-4">
        <Input
          label="Week number"
          placeholder="e.g., 1"
          value={week}
          onChange={setWeek}
          required
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onDone}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Uploading…" : "Upload PDF"}
        </Button>
      </div>
    </form>
  );
}