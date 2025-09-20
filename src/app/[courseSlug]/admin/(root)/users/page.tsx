"use client"

import { Button } from "@/components/Button"
import { Textarea } from "@/components/Input"
import { Modal } from "@/components/Modal"
import { PrimaryButton } from "@/components/PrimaryButton"
import { useSessionId } from "@/components/SessionProvider"
import Title from "@/components/typography"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useMutation, useQuery } from "@/usingSession"
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react"
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronDownIcon,
  MinusIcon,
} from "@heroicons/react/16/solid"
import {
  CheckIcon as CheckIcon20,
  ChevronUpDownIcon,
  TableCellsIcon,
} from "@heroicons/react/20/solid"
import { ClipboardDocumentIcon, TrashIcon } from "@heroicons/react/24/outline"
import clsx from "clsx"
import { useConvex, usePaginatedQuery } from "convex/react"
import React, { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"

type WeekWithExercises = {
  id: Id<"weeks">
  name: string
  exercises: {
    id: Id<"exercises">
    name: string
  }[]
}

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
  )
}

function DownloadAllButton() {
  const convex = useConvex()
  const sessionId = useSessionId()
  const courseSlug = useCourseSlug()
  const weeks = useQuery(api.admin.users.listExercisesForTable, { courseSlug })

  const [spreadsheet, setSpreadsheet] = useState<string | null>(null)

  async function copyAllResults() {
    if (weeks === undefined) return

    async function getAllRegistrations() {
      let continueCursor = null
      let isDone = false
      let page

      const results = []

      while (!isDone) {
        ;({ continueCursor, isDone, page } = await convex.query(
          api.admin.users.list,
          {
            courseSlug,
            sessionId,
            paginationOpts: { numItems: 50, cursor: continueCursor },
          }
        ))
        console.log("got", page.length)
        results.push(...page)
      }

      return results
    }

    const users = await getAllRegistrations()

    const rows: string[][] = [
      [
        "User",
        "Role",
        ...weeks.flatMap((week: WeekWithExercises) =>
          week.exercises.map((e) => e.name)
        ),
        "Completed exercises",
      ],
      ...users.map((user) => [
        user.email ?? "Unknown",
        user.role === "admin" ? "Admin" : user.role === "ta" ? "TA" : "",
        ...weeks.flatMap((week: WeekWithExercises) =>
          week.exercises.map((exercise) =>
            user.completedExercises.includes(exercise.id) ? "1" : "0"
          )
        ),
        user.completedExercises.length.toString(),
      ]),
    ]

    setSpreadsheet(rows.map((cols) => cols.join("\t")).join("\n"))
  }

  if (weeks === undefined) return null

  return (
    <>
      <Button
        onClick={() => {
          toast.promise(copyAllResults(), {
            loading: "Downloading the table…",
          })
        }}
      >
        <TableCellsIcon className="h-5 w-5" />
        To Spreadsheet
      </Button>

      <Modal
        title="Results"
        isOpen={spreadsheet !== null}
        onClose={() => setSpreadsheet(null)}
      >
        <div className="my-4 font-mono">
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
              navigator.clipboard.writeText(spreadsheet ?? "")
              toast.success(
                "Copied to clipboard. You can paste it in spreadsheet software."
              )
            }}
          >
            <ClipboardDocumentIcon className="h-5 w-5" />
            Copy to Clipboard
          </PrimaryButton>
        </div>
      </Modal>
    </>
  )
}

function ScoresTable() {
  const courseSlug = useCourseSlug()
  const sessionId = useSessionId()

  const weeks = useQuery(api.admin.users.listExercisesForTable, { courseSlug })
  const {
    results: users,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.admin.users.list,
    { courseSlug, sessionId },
    { initialNumItems: 15 }
  )

  if (weeks === undefined || users === undefined) {
    return <div className="h-96 animate-pulse rounded-xl bg-slate-200" />
  }

  return (
    <div className="mb-8">
      <div className="mb-4 grid max-w-full grid-cols-[auto_1fr] text-sm">
        <div className="w-80">
          <div className="flex h-40 items-end border-b border-b-slate-300 px-2 py-3 text-left align-bottom font-semibold">
            User
          </div>

          {users.map((user) => (
            <div
              className="flex h-12 border-r border-b border-r-slate-300 border-b-slate-200 pr-2"
              key={user.id}
            >
              <div className="flex-1 truncate px-2 py-3">
                <Tooltip>
                  <TooltipTrigger className="cursor-default">
                    {user.email?.replace("@epfl.ch", "") ?? "Unknown"}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{user.email}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center pl-2">
                <RoleSelector value={user.role} userId={user.id} />
                <RemoveUserButton userId={user.id} userEmail={user.email} />
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          <div className="flex h-40">
            {weeks.map((week: WeekWithExercises) => (
              <React.Fragment key={week.id}>
                {week.exercises.map((exercise) => (
                  <div
                    className="relative w-12 shrink-0 border-b border-b-slate-300 px-2 py-3"
                    key={exercise.id}
                  >
                    <div className="flex h-full w-full rotate-180 items-center text-left leading-tight font-medium [writing-mode:vertical-rl]">
                      {exercise.name}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
            <div className="flex w-20 shrink-0 grow items-end justify-end border-b border-b-slate-300 px-2 py-3 text-right">
              #
            </div>
          </div>

          {users.map((user) => (
            <div className="flex h-12" key={user.id}>
              {weeks.map((week: WeekWithExercises) => (
                <React.Fragment key={week.id}>
                  {week.exercises.map((exercise, exerciseIndex) => (
                    <div
                      className={clsx(
                        "w-12 shrink-0 border-b border-b-slate-200 px-2 py-3 text-center",
                        exerciseIndex === week.exercises.length - 1
                          ? "border-r border-r-slate-300"
                          : ""
                      )}
                      key={exercise.id}
                    >
                      {user.completedExercises.includes(exercise.id) ? (
                        <CheckIcon className="inline-flex h-4 w-4" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  ))}
                </React.Fragment>
              ))}
              <div className="w-20 shrink-0 grow items-center border-b border-b-slate-200 px-2 py-3 text-right font-semibold tabular-nums">
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
            className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 disabled:bg-gray-50"
            disabled={status !== "CanLoadMore"}
            onClick={() => {
              loadMore(200)
            }}
          >
            <div className="flex items-center gap-1">
              {status === "CanLoadMore" ? (
                <ChevronDownIcon className="h-4 w-4" aria-hidden />
              ) : (
                <ArrowPathIcon
                  className="h-4 w-4 animate-spin text-gray-500"
                  aria-hidden
                />
              )}
              Show More
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

type Role = null | "ta" | "admin"
function RoleBadge({ value }: { value: Role }) {
  return value === "admin" ? (
    <span className="mr-2 inline-block rounded-full bg-red-200 px-2 py-1 text-xs font-semibold tracking-wider text-red-900 uppercase">
      Admin
    </span>
  ) : value === "ta" ? (
    <span className="mr-2 inline-block rounded-full bg-orange-200 px-2 py-1 text-xs font-semibold tracking-wider text-orange-900 uppercase">
      TA
    </span>
  ) : (
    <MinusIcon className="h-4 w-4 text-slate-400" />
  )
}

function RoleSelector({ value, userId }: { value: Role; userId: Id<"users"> }) {
  const roles = [null, "ta", "admin"] as const

  const courseSlug = useCourseSlug()
  const setRole = useMutation(api.admin.users.setRole)

  return (
    <div className="mr-1 w-24">
      <Listbox
        value={value ?? "student"}
        onChange={(newValue) => {
          setRole({ courseSlug, userId, role: newValue as Role })
        }}
      >
        {({ open }) => (
          <div className="relative">
            <ListboxButton className="relative h-10 w-full cursor-default rounded-md p-1 pr-6 text-left text-gray-900 ring-inset focus:outline-none sm:text-sm sm:leading-6">
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
              <ListboxOptions className="ring-opacity-5 absolute z-10 mt-1 max-h-60 w-30 overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none sm:text-sm">
                {roles.map((role) => (
                  <ListboxOption
                    key={role}
                    className={({ focus }) =>
                      clsx(
                        focus && "bg-gray-100",
                        "relative h-10 cursor-default py-2 pr-4 text-gray-900 select-none"
                      )
                    }
                    value={role}
                  >
                    {({ selected }) => (
                      <div className="flex">
                        <span
                          className={clsx(
                            selected ? "font-semibold" : "font-normal",
                            "flex h-full items-center truncate pl-8"
                          )}
                        >
                          <RoleBadge value={role} />
                        </span>
                        {selected && (
                          <span className="flex items-center text-purple-600">
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
  )
}

function RemoveUserButton({
  userId,
  userEmail,
}: {
  userId: Id<"users">
  userEmail: string | null
}) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const courseSlug = useCourseSlug()
  const removeUser = useMutation(api.admin.users.unregisterFromCourse)

  const handleRemoveUser = async () => {
    await removeUser({ courseSlug, userId })
    toast.success(`User ${userEmail} has been removed from the course.`)
    setShowConfirmation(false)
  }

  return (
    <>
      <button
        onClick={() => setShowConfirmation(true)}
        className="rounded p-1 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800"
        title="Remove user from course"
      >
        <TrashIcon className="h-4 w-4" />
      </button>

      <Modal
        title="Hold up!"
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
      >
        <div className="my-4">
          <p className="mb-4 text-gray-900">
            Are you sure you want to remove <strong>{userEmail}</strong> from
            this course?
          </p>
          <p className="text-sm text-gray-600">
            The user will lose access to the course but their progress data will
            be kept, just in case.
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={() => setShowConfirmation(false)}>Cancel</Button>
          <PrimaryButton onClick={handleRemoveUser}>Remove User</PrimaryButton>
        </div>
      </Modal>
    </>
  )
}

function AddUsers() {
  const [emails, setEmails] = useState("")
  const courseSlug = useCourseSlug()
  const addUser = useMutation(api.admin.users.register)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()

        const validatedEmails = emails
          .split("\n")
          .map((l) => l.trim())
          .filter((email) => !!email)

        if (validatedEmails.length === 0) {
          return
        }

        const invalidEmail = validatedEmails.find(
          (e) => !e.includes("@") || e.includes(" ") || e.includes(",")
        )
        if (invalidEmail) {
          toast.error(`Invalid email address: ${invalidEmail}`)
          return
        }

        setEmails("")

        const users = { emails: validatedEmails }
        const { added, ignored, restored } = await addUser({
          courseSlug,
          users,
        })

        const addedMessage =
          added === 1
            ? "1 new user has been added."
            : added > 0
              ? `${added} new users have been added.`
              : ""

        const restoredMessage =
          restored === 1
            ? "1 user has been restored with their previous progress."
            : restored > 0
              ? `${restored} users have been restored with their previous progress.`
              : ""

        const ignoredMessage =
          ignored === 0
            ? ""
            : ignored === 1
              ? " 1 user was already registered."
              : ` ${ignored} users were already registered.`

        const messages = [addedMessage, restoredMessage].filter(Boolean)
        const finalMessage = messages.join(" ") + ignoredMessage

        toast.success(finalMessage || "No changes were made.")
      }}
    >
      <h2 className="mt-12 mb-6 text-2xl font-medium tracking-wide">
        Add Users
      </h2>

      <Textarea
        value={emails}
        label={
          <>
            Email addresses{" "}
            <small className="color-gray-600 font-normal">
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
  )
}
