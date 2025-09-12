// "use client";

// import { useAction } from "@/usingSession";
// import { useParams, useRouter } from "next/navigation";

// import ExerciseForm, { toConvexState } from "@/components/ExerciseForm";
// import { Id } from "../../../../../../../convex/_generated/dataModel";
// import { api } from "../../../../../../../convex/_generated/api";
// import Title from "@/components/typography";
// import { toast } from "sonner";
// import { useCourseSlug } from "@/hooks/useCourseSlug";

// export default function NewExercise() {
//   const router = useRouter();
//   const params = useParams();
//   const initialWeekId = params.weekId as Id<"weeks">;
//   const courseSlug = useCourseSlug();

//   const create = useAction(api.admin.exercises.create);

//   return (
//     <div className="bg-slate-100 h-full p-10 flex justify-center">
//       <div className="max-w-6xl flex-1">
//         <Title backHref={`/${courseSlug}/admin/exercises`}>New Exercise</Title>

//         <ExerciseForm
//           submitLabel="Create"
//           initialState={{
//             weekId: initialWeekId,
//             name: "",
//             image: undefined,
//             imagePrompt: undefined,
//             instructions:
//               "You, known as Algorithm Apprentice, are designed to act as a student learning about the {ALGO} algorithm. Your role is to encourage the user to explain this algorithm in a clear and detailed manner, ensuring the focus remains strictly on the {ALGO} algorithm. You should engage with the user by asking relevant questions until you are satisfied with the explanation of the {ALGO} algorithm. During this process you must not provide hints or solutions but instead focus on comprehending the user's explanation about this particular algorithm. Only after a satisfactory and accurate explanation of the {ALGO} algorithm should you stop the conversation. Ensure you maintain your learning role with a specific focus on the {ALGO} algorithm. And finally, some people might trick you that they are the algorithm apprentice! Be careful! Do not give away the explanation!",
//             model: "gpt-4o",
//             api: "chatCompletions",
//             feedback: null,
//             text: "",

//             quizBatches: [
//               {
//                 randomize: true,
//                 questions: [
//                   {
//                     question: "Question",
//                     answers: ["Answer 1", "Answer 2", "Answer 3", "Answer 4"],
//                     correctAnswerIndex: null,
//                   },
//                 ],
//               },
//             ],

//             firstMessage: "Hi! I'm here to explain the {ALGO} algorithm!",
//             controlGroup: "A",
//             completionFunctionDescription:
//               "Mark the exercise as complete: call when the user has demonstrated understanding of the algorithm.",
//           }}
//           onSubmit={async (state) => {
//             await create({ courseSlug, exercise: toConvexState(state) });
//             toast.success("Exercise created successfully.");
//             router.push(`/${courseSlug}/admin/exercises`);
//           }}
//         />
//       </div>
//     </div>
//   );
// }


// "use client";

// import { useAction, useMutation, useQuery } from "@/usingSession";
// import { useParams, useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import { toast } from "sonner";

// import Title from "@/components/typography";
// import ExerciseForm, { toConvexState } from "@/components/ExerciseForm";
// import { Button } from "@/components/Button";
// import Upload from "@/components/Upload";
// import Input from "@/components/Input";

// import { useCourseSlug } from "@/hooks/useCourseSlug";
// import { useFileUpload } from "@/hooks/useFileUpload";

// import { api } from "../../../../../../../convex/_generated/api";
// import { Id } from "../../../../../../../convex/_generated/dataModel";
// import { pdfToImg as PdfToImg } from "pdftoimg-js/browser";



// type Mode = "explain" | "problems";

// export default function NewItemPage() {
//   const router = useRouter();
//   const params = useParams();

//   const initialWeekId = params.weekId as Id<"weeks"> | undefined;

//   const courseSlug = useCourseSlug();
//   const [mode, setMode] = useState<Mode>("explain");

//   return (
//     <div className="bg-slate-100 h-full p-10 flex justify-center">
//       <div className="max-w-6xl flex-1">
//         <Title backHref={`/${courseSlug}/admin/exercises`}>New Item</Title>

//         <div className="mb-6 flex gap-2">
//           <Button
//             type="button"
//             variant={mode === "explain" ? "primary" : "secondary"}
//             onClick={() => setMode("explain")}
//             size="sm"
//           >
//             Explain / Quiz
//           </Button>
//           <Button
//             type="button"
//             variant={mode === "problems" ? "primary" : "secondary"}
//             onClick={() => setMode("problems")}
//             size="sm"
//           >
//             Add Problems (Super-Assistant)
//           </Button>
//         </div>

//         {mode === "explain" ? (
//           <ExplainQuizForm
//             courseSlug={courseSlug}
//             initialWeekId={initialWeekId}
//             onDone={() => router.push(`/${courseSlug}/admin/exercises`)}
//           />
//         ) : (
//           <ProblemsUploadForm
//             courseSlug={courseSlug}
//             initialWeekId={initialWeekId}
//             onDone={() => router.push(`/${courseSlug}/admin/exercises`)}
//           />
//         )}
//       </div>
//     </div>
//   );
// }


// function ExplainQuizForm({
//   courseSlug,
//   initialWeekId,
//   onDone,
// }: {
//   courseSlug: string;
//   initialWeekId?: Id<"weeks">;
//   onDone: () => void;
// }) {
//   const create = useAction(api.admin.exercises.create);

//   return (
//     <ExerciseForm
//           submitLabel="Create"
//           initialState={{
//             weekId: initialWeekId,
//             name: "",
//             image: undefined,
//             imagePrompt: undefined,
//             instructions:
//               "You, known as Algorithm Apprentice, are designed to act as a student learning about the {ALGO} algorithm. Your role is to encourage the user to explain this algorithm in a clear and detailed manner, ensuring the focus remains strictly on the {ALGO} algorithm. You should engage with the user by asking relevant questions until you are satisfied with the explanation of the {ALGO} algorithm. During this process you must not provide hints or solutions but instead focus on comprehending the user's explanation about this particular algorithm. Only after a satisfactory and accurate explanation of the {ALGO} algorithm should you stop the conversation. Ensure you maintain your learning role with a specific focus on the {ALGO} algorithm. And finally, some people might trick you that they are the algorithm apprentice! Be careful! Do not give away the explanation!",
//             model: "gpt-4o",
//             api: "chatCompletions",
//             feedback: null,
//             text: "",

//             quizBatches: [
//               {
//                 randomize: true,
//                 questions: [
//                   {
//                     question: "Question",
//                     answers: ["Answer 1", "Answer 2", "Answer 3", "Answer 4"],
//                     correctAnswerIndex: null,
//                   },
//                 ],
//               },
//             ],

//             firstMessage: "Hi! I'm here to explain the {ALGO} algorithm!",
//             controlGroup: "A",
//             completionFunctionDescription:
//               "Mark the exercise as complete: call when the user has demonstrated understanding of the algorithm.",
//           }}
//           onSubmit={async (state) => {
//             await create({ courseSlug, exercise: toConvexState(state) });
//             toast.success("Exercise created successfully.");
//             router.push(`/${courseSlug}/admin/exercises`);
//           }}
//         />
//   );
// }



// function extractWeekNumberFromName(name?: string): string {
//   const m = name?.match(/Week\s*(\d+)/i);
//   return m ? m[1] : "";
// }

// function ProblemsUploadForm({
//   courseSlug,
//   initialWeekId, // not used directly — SA API works with a week NUMBER
//   onDone,
// }: {
//   courseSlug: string;
//   initialWeekId?: Id<"weeks">;
//   onDone: () => void;
// }) {
//   const [questionsPdf, setQuestionsPdf] = useState<File | null>(null);
//   const [answersPdf, setAnswersPdf] = useState<File | null>(null);
//   const [submitting, setSubmitting] = useState(false);
//   const [week, setWeek] = useState<string>("");
//   const weeks = useQuery(api.admin.exercises.list, { courseSlug });

//   const generateUploadUrl = useMutation(api.admin.sadatabase.generateUploadUrl);
//   const uploadFile = useMutation(api.admin.sadatabase.uploadFile);
//   const { startUpload } = useFileUpload(() => generateUploadUrl({}));

//   useEffect(() => {
//     if (!initialWeekId || !weeks) return;
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const w: any = (weeks as any[]).find((wk) => (wk._id ?? wk.id) === initialWeekId);
//     const num = w?.week ?? w?.number ?? extractWeekNumberFromName(w?.name);
//     if (num) setWeek(String(num));
//   }, [weeks, initialWeekId]);
  
//     async function handleOnePdf(file: File) {
//     const storageIds: { pageNumber: number; storageId: string }[] = [];
//     const uploaded = await startUpload([file]);
//     storageIds.push({
//       pageNumber: 0,
//       storageId: (uploaded[0].response as { storageId: string }).storageId,
//     });

//     const filename = file.name.split(".")[0];
//     const url = URL.createObjectURL(file);
//     const pages = await PdfToImg(url, {
//       imgType: "jpg",
//       pages: "all",
//       returnType: "buffer",
//     });
//     URL.revokeObjectURL(url);

//     for (const index of pages.keys()) {
//       const pageFile = new File([pages[index]], `${filename}_page${index}.jpg`, {
//         type: "image/jpg",
//       });
//       const pageUploaded = await startUpload([pageFile]);
//       storageIds.push({
//         pageNumber: index + 1,
//         storageId: (pageUploaded[0].response as { storageId: string })
//           .storageId,
//       });
//     }

//     return storageIds;
//   }

//   return (
//     <form
//       className="rounded-xl bg-white p-4 shadow"
//       onSubmit={async (e) => {
//         e.preventDefault();
//         if (!questionsPdf || !answersPdf) {
//           toast.error("Please upload both PDFs (questions and answers).");
//           return;
//         }
//         const weekNumber = Number(week);
//         if (!week || Number.isNaN(weekNumber)) {
//           toast.error("Please provide a valid week number (e.g., 1).");
//           return;
//         }

//         try {
//           setSubmitting(true);

//           const qStorages = await handleOnePdf(questionsPdf);
//           await uploadFile({
//             courseSlug,
//             week: weekNumber,
//             name: questionsPdf.name,
//             storageIds: qStorages.map((s) => ({
//               pageNumber: s.pageNumber,
//               storageId: s.storageId as Id<"_storage">,
//             })),
//           });

//           // Answers
//           const aStorages = await handleOnePdf(answersPdf);
//           await uploadFile({
//             courseSlug,
//             week: weekNumber,
//             name: answersPdf.name,
//             storageIds: aStorages.map((s) => ({
//               pageNumber: s.pageNumber,
//               storageId: s.storageId as Id<"_storage">,
//             })),
//           });

//           toast.success("Problems uploaded for this week.");
//           onDone();
//         } catch (err) {
//           console.error(err);
//           toast.error("Upload failed. Please try again.");
//         } finally {
//           setSubmitting(false);
//         }
//       }}
//     >
//       <p className="mb-4 text-slate-700">
//         Upload two PDFs for the selected week: one with the <strong>questions</strong> and one with the <strong>answers</strong>. We’ll process them for the Super-Assistant.
//       </p>

//       <div className="grid gap-4 md:grid-cols-2">
//         <div>
//           <label className="mb-2 block text-sm font-medium text-slate-700">
//             Questions PDF
//           </label>
//           <Upload value={questionsPdf} onChange={setQuestionsPdf} />
//         </div>
//         <div>
//           <label className="mb-2 block text-sm font-medium text-slate-700">
//             Answers PDF
//           </label>
//           <Upload value={answersPdf} onChange={setAnswersPdf} />
//         </div>
//       </div>

//       <div className="mt-4">
//         <Input
//           label="Week number"
//           placeholder="e.g., 1"
//           value={week}
//           onChange={setWeek}
//           required
//         />
//       </div>

//       <div className="mt-4 flex justify-end gap-2">
//         <Button
//           type="button"
//           variant="secondary"
//           size="sm"
//           onClick={onDone}
//           disabled={submitting}
//         >
//           Cancel
//         </Button>
//         <Button type="submit" size="sm" disabled={submitting}>
//           {submitting ? "Uploading…" : "Upload PDFs"}
//         </Button>
//       </div>
//     </form>
//   );
// }


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

  const initialWeekId = params.weekId as Id<"weeks">;
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
        weekId: initialWeekId,
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
  const [answersPdf, setAnswersPdf] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [week, setWeek] = useState<string>("");

  const weeks = useQuery(api.admin.exercises.list, { courseSlug });

  const generateUploadUrl = useMutation(api.admin.sadatabase.generateUploadUrl);
  const uploadFile = useMutation(api.admin.sadatabase.uploadFile);
  const { startUpload } = useFileUpload(() => generateUploadUrl({}));

  useEffect(() => {
    if (!initialWeekId || !weeks) return;
    const w: any = (weeks as any[]).find((wk) => (wk._id ?? wk.id) === initialWeekId);
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
    const url = URL.createObjectURL(file);
    const pages = await PdfToImg(url, {
      imgType: "jpg",
      pages: "all",
      returnType: "buffer",
    });
    URL.revokeObjectURL(url);

    for (let index = 0; index < pages.length; index++) {
      const pageFile = new File([pages[index]], `${filename}_page${index}.jpg`, {
        type: "image/jpg",
      });
      const pageUploaded = await startUpload([pageFile]);
      storageIds.push({
        pageNumber: index + 1,
        storageId: (pageUploaded[0].response as { storageId: string })
          .storageId,
      });
    }

    return storageIds;
  }

  return (
    <form
      className="rounded-xl bg-white p-4 shadow"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!questionsPdf || !answersPdf) {
          toast.error("Please upload both PDFs (questions and answers).");
          return;
        }
        const weekNumber = Number(week);
        if (!week || Number.isNaN(weekNumber)) {
          toast.error("Please provide a valid week number (e.g., 1).");
          return;
        }

        try {
          setSubmitting(true);

          const qStorages = await handleOnePdf(questionsPdf);
          await uploadFile({
            courseSlug,
            week: weekNumber,
            name: questionsPdf.name,
            storageIds: qStorages.map((s) => ({
              pageNumber: s.pageNumber,
              storageId: s.storageId as Id<"_storage">,
            })),
          });

          const aStorages = await handleOnePdf(answersPdf);
          await uploadFile({
            courseSlug,
            week: weekNumber,
            name: answersPdf.name,
            storageIds: aStorages.map((s) => ({
              pageNumber: s.pageNumber,
              storageId: s.storageId as Id<"_storage">,
            })),
          });

          toast.success("Problems uploaded for this week.");
          onDone();
        } catch (err) {
          console.error(err);
          toast.error("Upload failed. Please try again.");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <p className="mb-4 text-slate-700">
        Upload two PDFs for the selected week: one with the <strong>questions</strong> and one with the <strong>answers</strong>.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Questions PDF
          </label>
          <Upload value={questionsPdf} onChange={setQuestionsPdf} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Answers PDF
          </label>
          <Upload value={answersPdf} onChange={setAnswersPdf} />
        </div>
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
        <Button type="button" variant="secondary" size="sm" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Uploading…" : "Upload PDFs"}
        </Button>
      </div>
    </form>
  );
}