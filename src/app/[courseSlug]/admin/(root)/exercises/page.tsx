"use client";

import { useMutation, useQuery } from "@/usingSession";
import Link from "next/link";
import { formatTimestampHumanFormat } from "@/util/date";
import { PlusIcon } from "@heroicons/react/20/solid";
import { api } from "../../../../../../convex/_generated/api";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import Title from "@/components/typography";
import { ExerciseLink } from "@/components/ExerciseLink";
import { DropdownMenu, DropdownMenuItem } from "@/components/DropdownMenu";
import { Button } from "@/components/Button";
import { Doc, Id } from "../../../../../../convex/_generated/dataModel";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";
import { SelectWithNone } from "@/components/Input";

type Exercise = {
  id: Id<"exercises">;
  name: string;
  image: {
    thumbnails: { type: string; sizes?: string; src: string }[];
  } | null;
};

export default function AdminExercisePage() {
  const courseSlug = useCourseSlug();
  const weeks = useQuery(api.admin.exercises.list, {
    courseSlug,
  });

  return (
    <>
      <Title>
        <span className="flex-1">Weeks</span>

        <Button href={`/${courseSlug}/admin/weeks/new`}>
          <PlusIcon className="w-5 h-5" />
          Add Week
        </Button>
      </Title>

      <div className="grid gap-12">
        {weeks?.map((week) => <Week week={week} key={week._id} />)}
      </div>
    </>
  );
}

function Week({
  week,
}: {
  week: Doc<"weeks"> & {
    exercises: Exercise[];
  };
}) {
  const courseSlug = useCourseSlug();

  const deleteWeek = useMutation(api.admin.weeks.remove);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <div>
      <h2 className="text-3xl font-medium flex mb-4 gap-3 flex-wrap items-center">
        <span className="flex-1">{week.name}</span>

        <DropdownMenu>
          <DropdownMenuItem href={`/${courseSlug}/admin/weeks/${week._id}`}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="danger"
            onClick={() => {
              setIsDeleteModalOpen(true);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenu>
      </h2>
      <p className="text-gray-700">
        <strong className="font-medium text-gray-800">
          {formatTimestampHumanFormat(week.startDate)}
        </strong>{" "}
        {week.softEndDate ? (
          <>
            to{" "}
            <strong className="font-medium text-gray-800">
              {formatTimestampHumanFormat(week.softEndDate)}
            </strong>{" "}
            (late deadline:{" "}
            <strong className="font-medium text-gray-800">
              {formatTimestampHumanFormat(week.endDate)}
            </strong>
            )
          </>
        ) : (
          <>
            to{" "}
            <strong className="font-medium text-gray-800">
              {formatTimestampHumanFormat(week.endDate)}
            </strong>
          </>
        )}
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {week.exercises.map((exercise) => (
          <ExerciseLinkWithMenu exercise={exercise} key={exercise.id} />
        ))}

        <Link
          href={`/${courseSlug}/admin/exercises/new/${week._id}`}
          className="block rounded-3xl shadow-[inset_0_0_0_2px_#bfdbfe] transition-shadow hover:shadow-[inset_0_0_0_2px_#0084c7]"
        >
          <div className="relative pb-[57.14%]">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-700 text-xl gap-2">
              <PlusIcon className="w-6 h-6" />
              <span>New Exercise</span>
            </div>
          </div>
        </Link>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete “${week.name}”?`}
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Are you sure that you want to delete the week{" "}
            <strong className="font-semibold text-gray-600">
              “{week.name}”
            </strong>
            ? This action cannot be undone.
          </p>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <Button
            onClick={() => setIsDeleteModalOpen(false)}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setIsDeleteModalOpen(false);
              await deleteWeek({
                id: week._id,
                courseSlug,
              });
              toast.success("Week deleted successfully");
            }}
            variant="danger"
            size="sm"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ExerciseLinkWithMenu({ exercise }: { exercise: Exercise }) {
  const courseSlug = useCourseSlug();

  const deleteExercise = useMutation(api.admin.exercises.softDelete);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [destinationCourse, setDestinationCourse] =
    useState<Id<"courses"> | null>(null);
  const [destinationWeek, setDestinationWeek] = useState<Id<"weeks"> | null>(
    null,
  );
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  return (
    <>
      <ExerciseLink
        href={`/${courseSlug}/admin/exercises/${exercise.id}`}
        name={exercise.name}
        image={exercise.image}
        corner={
          <div className="p-4">
            <div className="pointer-events-auto">
              <DropdownMenu variant="overlay">
                <DropdownMenuItem
                  onClick={() => {
                    setIsDuplicateModalOpen(true);
                  }}
                >
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                  }}
                  variant="danger"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        }
      />

      <Modal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        title={`Duplicate “${exercise.name}”`}
      >
        <DuplicationForm
          exercise={exercise}
          onClose={() => setIsDuplicateModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete “${exercise.name}”?`}
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Are you sure that you want to delete the exercise{" "}
            <strong className="font-semibold text-gray-600">
              “{exercise.name}”
            </strong>
            ? This action cannot be undone.
          </p>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <Button
            onClick={() => setIsDeleteModalOpen(false)}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setIsDeleteModalOpen(false);
              await deleteExercise({
                id: exercise.id,
                courseSlug,
              });
              toast.success("Exercise deleted successfully");
            }}
            variant="danger"
            size="sm"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}

function DuplicationForm({
  onClose,
  exercise,
}: {
  onClose: () => void;
  exercise: Exercise;
}) {
  const courseSlug = useCourseSlug();
  const courses = useQuery(api.courses.getMyRegistrations, {})?.filter(
    (course) => course.isAdmin,
  );
  const [selectedCourse, setSelectedCourse] = useState<Id<"courses"> | null>(
    null,
  );

  const selectedCourseSlug = selectedCourse
    ? courses?.find((c) => c.id === selectedCourse)?.slug
    : null;
  const weeks = useQuery(
    api.admin.weeks.list,
    selectedCourseSlug ? { courseSlug: selectedCourseSlug } : "skip",
  );

  const [selectedWeek, setSelectedWeek] = useState<Id<"weeks"> | null>(null);

  const duplicate = useMutation(api.admin.exercises.duplicate);

  return (
    <>
      <div className="mt-2">
        {courses !== undefined && true ? (
          <SelectWithNone
            label="Course"
            value={selectedCourse}
            onChange={(v) => {
              if (v !== selectedCourse) {
                setSelectedCourse(v);
                setSelectedWeek(null);
              }
            }}
            values={courses.map((course) => ({
              value: course.id,
              label: course.name,
            }))}
          />
        ) : (
          <div className="h-16 bg-slate-200 rounded animate-pulse" />
        )}

        {selectedCourse !== null && (
          <>
            {weeks === undefined ? (
              <div className="h-16 bg-slate-200 rounded animate-pulse" />
            ) : (
              <SelectWithNone
                label="Week"
                value={selectedWeek}
                onChange={(v) => setSelectedWeek(v)}
                values={weeks!.map((week) => ({
                  value: week.id,
                  label: week.name,
                }))}
              />
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex gap-2 justify-end">
        <Button onClick={onClose} variant="secondary" size="sm">
          Cancel
        </Button>
        <Button
          onClick={async () => {
            onClose();
            await duplicate({
              courseSlug,
              id: exercise.id,

              weekId: selectedWeek!,
              courseId: selectedCourse!,
            });
            toast.success("Exercise duplicated successfully");
          }}
          size="sm"
          disabled={selectedWeek === null || selectedCourse === null}
        >
          Duplicate
        </Button>
      </div>
    </>
  );
}
