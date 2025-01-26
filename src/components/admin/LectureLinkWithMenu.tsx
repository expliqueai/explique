"use client";

import { ImageLink } from "@/components/ImageLink";
import { DropdownMenu, DropdownMenuItem } from "@/components/DropdownMenu";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { useState } from "react";
import { useMutation } from "@/usingSession";
import { api } from "../../../convex/_generated/api";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";

interface Lecture {
  id: Id<"lectures">;
  name: string;
  url: string;
  image: {
    thumbnails: { type: string; sizes?: string; src: string }[];
  } | null;
}

export function LectureLinkWithMenu({ lecture }: { lecture: Lecture }) {
  const courseSlug = useCourseSlug();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const deleteLecture = useMutation(api.admin.lectures.softDelete);

  return (
    <>
      <ImageLink
        href={`/${courseSlug}/admin/lectures/${lecture.id}`}
        name={lecture.name}
        image={lecture.image}
        corner={
          <div className="p-4">
            <div className="pointer-events-auto">
              <DropdownMenu variant="overlay">
                <DropdownMenuItem
                  onClick={() => setIsDeleteModalOpen(true)}
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
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete "${lecture.name}"?`}
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete the lecture{" "}
            <strong className="font-semibold text-gray-600">
              “{lecture.name}”
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
              await deleteLecture({
                id: lecture.id,
                courseSlug,
              });
              toast.success("Lecture deleted successfully");
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
