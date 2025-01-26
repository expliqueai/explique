"use client";

import { formatTimestampHumanFormat } from "@/util/date";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { DropdownMenu, DropdownMenuItem } from "@/components/DropdownMenu";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import Title from "@/components/typography";
import { PlusIcon } from "@heroicons/react/20/solid";
import { useState } from "react";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import Link from "next/link";

interface BaseItem {
  id: Id<any>;
  name: string;
}

interface WeekListProps<T extends BaseItem> {
  title: string;
  weeks: (Doc<"weeks"> & { items: T[] })[] | undefined;
  onDeleteWeek: (weekId: Id<"weeks">) => Promise<void>;
  renderItem: (item: T) => React.ReactNode;
  newItemPath: string;
}

export function WeekList<T extends BaseItem>({
  title,
  weeks,
  onDeleteWeek,
  renderItem,
  newItemPath,
}: WeekListProps<T>) {
  const courseSlug = useCourseSlug();

  return (
    <>
      <Title>
        <span className="flex-1">{title}</span>
        <Button
          href={`/${courseSlug}/admin/weeks/new?from=${title.toLowerCase()}`}
        >
          <PlusIcon className="w-5 h-5" />
          Add Week
        </Button>
      </Title>

      <div className="grid gap-12">
        {weeks?.map((week) => (
          <Week
            key={week._id}
            week={week}
            onDelete={() => onDeleteWeek(week._id)}
            renderItem={renderItem}
            newItemPath={newItemPath}
          />
        ))}
      </div>
    </>
  );
}

function Week<T extends BaseItem>({
  week,
  onDelete,
  renderItem,
  newItemPath,
}: {
  week: Doc<"weeks"> & { items: T[] };
  onDelete: () => Promise<void>;
  renderItem: (item: T) => React.ReactNode;
  newItemPath: string;
}) {
  const courseSlug = useCourseSlug();
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
            onClick={() => setIsDeleteModalOpen(true)}
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
        {week.items.map((item) => renderItem(item))}
        <NewItemLink href={`/${courseSlug}${newItemPath}/${week._id}`} />
      </div>

      <DeleteWeekModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={onDelete}
        weekName={week.name}
      />
    </div>
  );
}

function NewItemLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-3xl shadow-[inset_0_0_0_2px_#bfdbfe] transition-shadow hover:shadow-[inset_0_0_0_2px_#0084c7]"
    >
      <div className="relative pb-[57.14%]">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-700 text-xl gap-2">
          <PlusIcon className="w-6 h-6" />
          <span>New Item</span>
        </div>
      </div>
    </Link>
  );
}

function DeleteWeekModal({
  isOpen,
  onClose,
  onConfirm,
  weekName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  weekName: string;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Delete "${weekName}"?`}>
      <div className="mt-2">
        <p className="text-sm text-gray-500">
          Are you sure that you want to delete the week{" "}
          <strong className="font-semibold text-gray-600">
            &quot;{weekName}&quot;
          </strong>
          ? This action cannot be undone.
        </p>
      </div>

      <div className="mt-4 flex gap-2 justify-end">
        <Button onClick={onClose} variant="secondary" size="sm">
          Cancel
        </Button>
        <Button
          onClick={async () => {
            onClose();
            await onConfirm();
          }}
          variant="danger"
          size="sm"
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
}
