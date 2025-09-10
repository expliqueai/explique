"use client";

import Title from "@/components/typography";
import { api } from "../../../../../../convex/_generated/api";
import React, { useState } from "react";
import clsx from "clsx";
import {
  CheckIcon,
  ChevronDownIcon,
  MinusIcon,
  ArrowPathIcon,
} from "@heroicons/react/16/solid";
import { toast } from "sonner";
import { useConvex, usePaginatedQuery } from "convex/react";
import { useSessionId } from "@/components/SessionProvider";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { Textarea } from "@/components/Input";
import { useMutation, useQuery } from "@/usingSession";
import { Button } from "@/components/Button";
import {
  ChevronUpDownIcon,
  TableCellsIcon,
  CheckIcon as CheckIcon20,
} from "@heroicons/react/20/solid";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Modal } from "@/components/Modal";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Id } from "../../../../../../convex/_generated/dataModel";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";

type WeekWithExercises = {
  id: Id<"weeks">;
  name: string;
  exercises: {
    id: Id<"exercises">;
    name: string;
  }[];
};

export default function ScoresPage() {
  return (
    <>
      <Title>
        <span className="flex-1">Users</span>
        <DownloadAllButton />
      </Title>
      <ScoresTable />
      <AddUsers />
    </>
  );
}

function DownloadAllButton() {
  const convex = useConvex();
  const sessionId = useSessionId();
  const courseSlug = useCourseSlug();
  const weeks = useQuery(api.admin.users.listExercisesForTable, { courseSlug });

  const [spreadsheet, setSpreadsheet] = useState<string | null>(null);

  async function copyAllResults() {
    if (weeks === undefined) return;

    async function getAllRegistrations() {
      let continueCursor = null;
      let isDone = false;
      let page;

      const results = [];

      while (!isDone) {
        ({ continueCursor, isDone, page } = await convex.query(
          api.admin.users.list,
          {
            courseSlug,
            sessionId,
            paginationOpts: { numItems: 50, cursor: continueCursor },
          },
        ));
        console.log("got", page.length);
        results.push(...page);
      }

      return results;
    }

    const users = await getAllRegistrations();

    const rows: string[][] = [
      [
        "User",
        "Role",
        ...weeks.flatMap((week: WeekWithExercises) => week.exercises.map((e) => e.name)),
        "Completed exercises",
      ],
      ...users.map((user) => [
        user.email ?? "Unknown",
        user.role === "admin" ? "Admin" : user.role === "ta" ? "TA" : "",
        ...weeks.flatMap((week: WeekWithExercises) =>
          week.exercises.map((exercise) =>
            user.completedExercises.includes(exercise.id) ? "1" : "0",
          ),
        ),
        user.completedExercises.length.toString(),
      ]),
    ];

    setSpreadsheet(rows.map((cols) => cols.join("\t")).join("\n"));
  }

  if (weeks === undefined) return null;

  return (
    <>
      <Button
        onClick={() => {
          toast.promise(copyAllResults(), {
            loading: "Downloading the table…",
          });
        }}
      >
        <TableCellsIcon className="w-5 h-5" />
        To Spreadsheet
      </Button>

      <Modal
        title="Results"
        isOpen={spreadsheet !== null}
        onClose={() => setSpreadsheet(null)}
      >
        <div className="font-mono my-4">
          <Textarea
            value={spreadsheet ?? ""}
            readOnly
            label=""
            onChange={() => {}}
          />
        </div>

        <div className="flex justify-center">
          <PrimaryButton
            onClick={() => {
              navigator.clipboard.writeText(spreadsheet ?? "");
              toast.success(
                "Copied to clipboard. You can paste it in spreadsheet software.",
              );
            }}
          >
            <ClipboardDocumentIcon className="w-5 h-5" />
            Copy to Clipboard
          </PrimaryButton>
        </div>
      </Modal>
    </>
  );
}

function ScoresTable() {
  const courseSlug = useCourseSlug();
  const sessionId = useSessionId();

  const weeks = useQuery(api.admin.users.listExercisesForTable, { courseSlug });
  const {
    results: users,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.admin.users.list,
    { courseSlug, sessionId },
    { initialNumItems: 15 },
  );

  if (weeks === undefined || users === undefined) {
    return <div className="h-96 bg-slate-200 rounded-xl animate-pulse" />;
  }

  return (
    <div className="mb-8">
      <div className="text-sm grid grid-cols-[auto_1fr] mb-4 max-w-full">
        <div className="w-72">
          <div className="px-2 py-3 align-bottom text-left h-40 font-semibold flex items-end border-b border-b-slate-300">
            User
          </div>

          {users.map((user) => (
            <div
              className="h-12 flex border-b-slate-200 border-b border-r border-r-slate-300"
              key={user.id}
            >
              <div className="px-2 py-3 flex-1 truncate">
                {user.email?.replace("@epfl.ch", "") ?? "Unknown"}
              </div>
              <div className="pl-2 flex items-center">
                <RoleSelector value={user.role} userId={user.id} />
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <div className="h-40 flex">
            {weeks.map((week: WeekWithExercises) => (
              <React.Fragment key={week.id}>
                {week.exercises.map((exercise) => (
                  <div
                    className="px-2 py-3 w-12 relative shrink-0 border-b border-b-slate-300"
                    key={exercise.id}
                  >
                    <div className="text-left h-full w-full [writing-mode:vertical-rl] flex items-center rotate-180 leading-tight font-medium">
                      {exercise.name}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
            <div className="px-2 py-3 flex items-end justify-end text-right w-20 shrink-0 border-b border-b-slate-300 grow">
              #
            </div>
          </div>

          {users.map((user) => (
            <div className="h-12 flex" key={user.id}>
              {weeks.map((week: WeekWithExercises) => (
                <React.Fragment key={week.id}>
                  {week.exercises.map((exercise, exerciseIndex) => (
                    <div
                      className={clsx(
                        "px-2 py-3 text-center w-12 shrink-0 border-b-slate-200 border-b",
                        exerciseIndex === week.exercises.length - 1
                          ? "border-r border-r-slate-300"
                          : "",
                      )}
                      key={exercise.id}
                    >
                      {user.completedExercises.includes(exercise.id) ? (
                        <CheckIcon className="w-4 h-4 inline-flex" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  ))}
                </React.Fragment>
              ))}
              <div className="px-2 py-3 w-20 items-center text-right tabular-nums font-semibold border-b-slate-200 border-b shrink-0 grow">
                {user.completedExercises.length}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:bg-gray-50"
            disabled={status !== "CanLoadMore"}
            onClick={() => {
              loadMore(200);
            }}
          >
            <div className="flex items-center gap-1">
              {status === "CanLoadMore" ? (
                <ChevronDownIcon className="w-4 h-4" aria-hidden />
              ) : (
                <ArrowPathIcon
                  className="w-4 h-4 animate-spin text-gray-500"
                  aria-hidden
                />
              )}
              Show More
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

type Role = null | "ta" | "admin";
function RoleBadge({ value }: { value: Role }) {
  return value === "admin" ? (
    <span className="inline-block bg-red-200 px-2 py-1 rounded-full mr-2 text-red-900 uppercase tracking-wider font-semibold text-xs">
      Admin
    </span>
  ) : value === "ta" ? (
    <span className="inline-block bg-orange-200 px-2 py-1 rounded-full mr-2 text-orange-900 uppercase tracking-wider font-semibold text-xs">
      TA
    </span>
  ) : (
    <MinusIcon className="w-4 h-4 text-slate-400" />
  );
}

function RoleSelector({ value, userId }: { value: Role; userId: Id<"users"> }) {
  const roles = [null, "ta", "admin"] as const;

  const courseSlug = useCourseSlug();
  const setRole = useMutation(api.admin.users.setRole);

  return (
    <div className="w-24 mr-1">
      <Listbox
        value={value ?? "student"}
        onChange={(newValue) => {
          setRole({ courseSlug, userId, role: newValue as Role });
        }}
      >
        {({ open }) => (
          <div className="relative">
            <ListboxButton className="relative w-full cursor-default rounded-md p-1 pr-6 text-left text-gray-900 ring-inset focus:outline-none  sm:text-sm sm:leading-6 h-10">
              <span className="block">
                <RoleBadge value={value} />
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon
                  className="h-5 w-5 text-gray-400"
                  aria-hidden="true"
                />
              </span>
            </ListboxButton>

            <Transition
              show={open}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-30 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {roles.map((role) => (
                  <ListboxOption
                    key={role}
                    className={({ focus }) =>
                      clsx(
                        focus && "bg-gray-100",
                        "relative cursor-default select-none py-2 pr-4 text-gray-900 h-10",
                      )
                    }
                    value={role}
                  >
                    {({ selected }) => (
                      <div className="flex">
                        <span
                          className={clsx(
                            selected ? "font-semibold" : "font-normal",
                            "truncate flex items-center h-full pl-8",
                          )}
                        >
                          <RoleBadge value={role} />
                        </span>
                        {selected && (
                          <span className="text-purple-600 flex items-center">
                            <CheckIcon20
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </span>
                        )}
                      </div>
                    )}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Transition>
          </div>
        )}
      </Listbox>
    </div>
  );
}

function AddUsers() {
  const [emails, setEmails] = useState("");
  const courseSlug = useCourseSlug();
  const addUser = useMutation(api.admin.users.register);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();

        const validatedEmails = emails
          .split("\n")
          .map((l) => l.trim())
          .filter((email) => !!email);

        if (validatedEmails.length === 0) {
          return;
        }

        const invalidEmail = validatedEmails.find(
          (e) => !e.includes("@") || e.includes(" ") || e.includes(","),
        );
        if (invalidEmail) {
          toast.error(`Invalid email address: ${invalidEmail}`);
          return;
        }

        setEmails("");

        const users = { emails: validatedEmails };
        const { added, ignored } = await addUser({
          courseSlug,
          users,
        });

        toast.success(
          (added === 1
            ? `1 user has been added.`
            : `${added} users have been added.`) +
            (ignored === 0
              ? ""
              : ignored === 1
                ? " 1 user was already registered."
                : ` ${ignored} users were already registered.`),
        );
      }}
    >
      <h2 className="font-medium text-2xl tracking-wide mb-6 mt-12">
        Add Users
      </h2>

      <Textarea
        value={emails}
        label={
          <>
            Email addresses{" "}
            <small className="font-normal color-gray-600">
              (one address by line)
            </small>
          </>
        }
        onChange={setEmails}
        required
      />

      <PrimaryButton type="submit" disabled={!emails.trim()}>
        Add Users
      </PrimaryButton>
    </form>
  );
}
