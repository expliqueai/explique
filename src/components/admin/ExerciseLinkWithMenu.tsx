"use client";

import { ImageLink } from "@/components/ImageLink";
import { DropdownMenu, DropdownMenuItem } from "@/components/DropdownMenu";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { useState } from "react";
import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../convex/_generated/api";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";
import { SelectWithNone } from "@/components/Input";

type Exercise = {
  id: Id<"exercises">;
  name: string;
  image: {
    thumbnails: { type: string; sizes?: string; src: string }[];
  } | null;
};

export function ExerciseLinkWithMenu({ exercise }: { exercise: Exercise }) {
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
      <ImageLink
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
