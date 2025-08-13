"use client"

import { Button } from "@/components/Button"
import { DropdownMenu, DropdownMenuItem } from "@/components/DropdownMenu"
import Input from "@/components/Input"
import { Modal } from "@/components/Modal"
import { useIdentity } from "@/components/SessionProvider"
import { TabBar } from "@/components/TabBar"
import UploadWithImage from "@/components/UploadWithImage"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useFileUpload } from "@/hooks/useFileUpload"
import { useMutation, useQuery } from "@/usingSession"
import { formatTimestampHumanFormat } from "@/util/date"
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react"
import { PlusIcon } from "@heroicons/react/20/solid"
import {
  CheckIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline"
import {
  Column,
  ColumnFiltersState,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowData,
  SortingFn,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import clsx from "clsx"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import * as React from "react"
import { toast } from "sonner"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

function Login() {
  const router = useRouter()
  const courseSlug = useCourseSlug()
  const user = useQuery(api.courses.getRegistration, { courseSlug })
  const identity = useIdentity()

  useEffect(() => {
    if (user === null) {
      router.push("/login")
    }
  }, [router, user])

  if (!user) return null

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col leading-snug text-gray-700">
        <p className="font-semibold text-gray-800">
          {identity ? identity.name : user.name}
          {user.group && <span className="font-normal"> ({user.group})</span>}
        </p>
        <p>{identity ? identity.email : user.email}</p>
      </div>
    </div>
  )
}

function CourseSelector() {
  const router = useRouter()

  const courseSlug = useCourseSlug()
  const user = useQuery(api.courses.getRegistration, { courseSlug })
  const courses = useQuery(api.courses.getMyRegistrations, {})

  if (!user || !courses) {
    return (
      <div className="mx-auto h-28 w-full animate-pulse rounded-xl bg-slate-200 sm:h-32"></div>
    )
  }

  return (
    <>
      <Listbox
        value={courseSlug}
        onChange={(selectedCourseSlug) => {
          router.push(`/${selectedCourseSlug}`)
        }}
      >
        {({ open }) => (
          <>
            <div className="relative">
              <ListboxButton
                className={clsx(
                  "h-28 w-full cursor-default rounded-2xl px-6 py-1.5 text-left text-gray-900 ring-inset focus:ring-4 focus:outline-none sm:h-32 sm:px-10 sm:text-sm sm:leading-6",
                  open && "ring-4"
                )}
              >
                <h1 className="flex flex-col items-center justify-center text-center">
                  <span className="block font-bold tracking-wider text-gray-500 sm:mb-1 sm:text-xl">
                    {user.course.code}
                  </span>
                  <span className="block text-xl leading-tight font-semibold tracking-tight [text-wrap:balance] text-balance text-gray-800 sm:text-3xl md:text-4xl">
                    {user.course.name}
                  </span>
                </h1>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center sm:pr-2">
                  <ChevronUpDownIcon
                    className="h-6 w-6 text-gray-400"
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
                <ListboxOptions className="ring-opacity-5 absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none sm:text-sm">
                  {courses.map((course) => (
                    <ListboxOption
                      key={course.slug}
                      className={({ focus }) =>
                        clsx(
                          focus ? "bg-purple-600 text-white" : "",
                          !focus ? "text-gray-900" : "",
                          "relative cursor-default py-2 pr-4 pl-9 select-none"
                        )
                      }
                      value={course.slug}
                    >
                      {({ selected, focus }) => (
                        <>
                          <div className="flex gap-2">
                            <span
                              className={clsx(
                                focus ? "text-purple-200" : "text-gray-500",
                                "ml-2 truncate tabular-nums"
                              )}
                            >
                              {course.code}
                            </span>
                            <span
                              className={clsx(
                                selected ? "font-semibold" : "font-normal",
                                "truncate"
                              )}
                            >
                              {course.name}
                            </span>
                          </div>

                          {selected ? (
                            <span
                              className={clsx(
                                focus ? "text-white" : "text-indigo-600",
                                "absolute inset-y-0 left-0 flex items-center pl-4"
                              )}
                            >
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </ListboxOption>
                  ))}

                  <hr />
                  <p className="px-5 py-2 text-gray-500">
                    If there is a course missing, please contact your
                    instructor.
                  </p>
                </ListboxOptions>
              </Transition>
            </div>
          </>
        )}
      </Listbox>
    </>
  )
}

function isDefined<T>(argument: T | false): argument is T {
  return argument !== false
}

export default function SuperAssistantPage() {
  const courseSlug = useCourseSlug()
  const user = useQuery(api.courses.getRegistration, { courseSlug })
  const built = useQuery(api.admin.sadatabase.built, { courseSlug })

  return (
    <>
      <div className="bg-gradient-to-b from-purple-200 via-indigo-200 to-blue-200">
        <div className="flex justify-center p-6 pb-0 sm:p-10 sm:pb-0">
          <div className="max-w-6xl flex-1">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="my-2 flex-1 cursor-default text-3xl font-medium tracking-tight select-none">
                explique.ai
              </div>
              <Login />
            </div>

            <div className="mx-auto mt-8 w-full max-w-2xl rounded-t-2xl bg-white p-2 shadow-[0_-20px_40px_-12px_rgb(0_0_0_/_0.1)] sm:p-8 md:p-14">
              <CourseSelector />
            </div>
          </div>
        </div>
      </div>
      <div className="relative flex justify-center p-6 shadow-[0_-10px_10px_-3px_rgba(0_0_0_/_0.08)] sm:p-10">
        <div className="max-w-6xl flex-1">
          {user && (
            <TabBar
              items={[
                {
                  label: "Super-Assistant",
                  href: `/${courseSlug}/super-assistant`,
                },
                { label: "Exercises", href: `/${courseSlug}` },
                { label: "Lectures", href: `/${courseSlug}/lectures` },
                user.isAdmin && {
                  label: "Admin",
                  href: `/${courseSlug}/admin`,
                },
                user.isSuperadmin && {
                  label: "Superadmin",
                  href: `/superadmin`,
                },
              ].filter(isDefined)}
            />
          )}

          {built === undefined ? (
            <LoadingGrid />
          ) : built ? (
            <SuperAssistant />
          ) : (
            <NoSuperAssistant />
          )}
          <div className="h-10" />
        </div>
      </div>
    </>
  )
}

function NoSuperAssistant() {
  return (
    <div className="flex h-full items-center justify-center">
      <h2 className="text-3xl font-medium tracking-tight">
        There is no Super-Assistant available for this course.
      </h2>
    </div>
  )
}

function EditFeedback({ feedbackId }: { feedbackId: Id<"feedbacks"> }) {
  const [file, setFile] = useState<File | null>(null)
  const courseSlug = useCourseSlug()
  const deleteFeedback = useMutation(api.feedback.deleteFeedback)
  const renameFeedback = useMutation(api.feedback.rename)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const updateFeedback = useMutation(api.feedback.updateFeedback)
  const generateUploadUrl = useMutation(api.feedback.generateUploadUrl)
  const { startUpload } = useFileUpload(() => generateUploadUrl({}))
  const name = useQuery(api.feedback.getName, { feedbackId })
  const [newName, setNewName] = useState(name || "")
  const router = useRouter()

  useEffect(() => {
    if (name) setNewName(name)
  }, [name])

  return (
    <>
      <div className="p-2 pr-4">
        <div className="pointer-events-auto">
          <DropdownMenu variant="ghost" horizontal={true}>
            <DropdownMenuItem
              onClick={() => {
                setIsUpdateModalOpen(true)
              }}
              variant="default"
            >
              Update
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setIsEditNameModalOpen(true)
              }}
              variant="default"
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setIsDeleteModalOpen(true)
              }}
              variant="danger"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete feedback?`}
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Are you sure that you want to delete this feedback? This action
            cannot be undone.
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={() => setIsDeleteModalOpen(false)}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setIsDeleteModalOpen(false)
              deleteFeedback({ id: feedbackId, courseSlug: courseSlug })
            }}
            variant="danger"
            size="sm"
          >
            Delete
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={isEditNameModalOpen}
        onClose={() => setIsEditNameModalOpen(false)}
        title={`Rename feedback?`}
      >
        <div className="mt-4">
          <Input
            label="New name:"
            placeholder="Enter new name"
            value={newName}
            onChange={(value) => setNewName(value)}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={() => {
              setIsEditNameModalOpen(false)
              setNewName(name || "")
            }}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setIsEditNameModalOpen(false)
              if (newName !== name) {
                await renameFeedback({
                  id: feedbackId,
                  newName: newName,
                  courseSlug: courseSlug,
                })
              } else {
                setNewName(name || "")
              }
            }}
            variant="primary"
            size="sm"
          >
            Rename
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title="Upload a new attempt to get feedback."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (file === null) {
              toast.error(
                "You have to upload a tentative solution to get feedback."
              )
            } else {
              const uploaded = await startUpload([file])
              const storageId = (uploaded[0].response as { storageId: string })
                .storageId
              await updateFeedback({
                courseSlug,
                storageId: storageId,
                feedbackId: feedbackId,
              })

              if (feedbackId) {
                router.push(
                  `/${courseSlug}/super-assistant/feedback/${feedbackId}`
                )
              } else {
                toast.error("Failed to generate feedback.")
              }

              setFile(null)
              setIsUpdateModalOpen(false)
            }
          }}
        >
          <UploadWithImage value={file} onChange={(value) => setFile(value)} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsUpdateModalOpen(false)
                setFile(null)
              }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Generate feedback
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function EditChat({ chatId }: { chatId: Id<"chats"> }) {
  const courseSlug = useCourseSlug()
  const deleteChat = useMutation(api.superassistant.chat.deleteChat)
  const renameChat = useMutation(api.superassistant.chat.rename)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false)
  const name = useQuery(api.superassistant.chat.getName, { chatId })
  const [newName, setNewName] = useState(name || "")

  useEffect(() => {
    if (name) setNewName(name)
  }, [name])

  return (
    <>
      <div className="p-2 pr-4">
        <div className="pointer-events-auto">
          <DropdownMenu variant="ghost" horizontal={true}>
            <DropdownMenuItem
              onClick={() => {
                setIsEditNameModalOpen(true)
              }}
              variant="default"
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setIsDeleteModalOpen(true)
              }}
              variant="danger"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete chat?`}
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Are you sure that you want to delete this chat? This action cannot
            be undone.
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={() => setIsDeleteModalOpen(false)}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setIsDeleteModalOpen(false)
              deleteChat({ id: chatId, courseSlug: courseSlug })
            }}
            variant="danger"
            size="sm"
          >
            Delete
          </Button>
        </div>
      </Modal>
      <Modal
        isOpen={isEditNameModalOpen}
        onClose={() => setIsEditNameModalOpen(false)}
        title={`Rename chat?`}
      >
        <div className="mt-4">
          <Input
            label="New name:"
            placeholder="Enter new name"
            value={newName}
            onChange={(value) => setNewName(value)}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={() => {
              setIsEditNameModalOpen(false)
              setNewName(name || "")
            }}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setIsEditNameModalOpen(false)
              if (newName !== name) {
                await renameChat({
                  id: chatId,
                  newName: newName,
                  courseSlug: courseSlug,
                })
              } else {
                setNewName(name || "")
              }
            }}
            variant="primary"
            size="sm"
          >
            Rename
          </Button>
        </div>
      </Modal>
    </>
  )
}

type Row = {
  id: string
  creationTime: number
  lastModified: number
  name: string | undefined
  type: string
}

type RowObject = {
  type: string
  id: string
}

const sortCreationTimeFn: SortingFn<Row> = (rowA, rowB) => {
  const dateA = new Date(rowA.original.creationTime)
  const dateB = new Date(rowB.original.creationTime)
  return dateA < dateB ? -1 : dateA > dateB ? 1 : 0
}

const sortLastModifiedFn: SortingFn<Row> = (rowA, rowB) => {
  const dateA = new Date(rowA.original.lastModified)
  const dateB = new Date(rowB.original.lastModified)
  return dateA < dateB ? -1 : dateA > dateB ? 1 : 0
}

function Table() {
  const courseSlug = useCourseSlug()
  const list: Row[] | undefined = useQuery(api.feedback.data, { courseSlug })
  const [data, setData] = useState(() => (list ? [...list] : []))
  const [sorting, setSorting] = useState<SortingState>([
    { id: "lastModified", desc: true },
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const router = useRouter()
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 })

  useEffect(() => {
    if (list) {
      setData([...list])
    } else {
      setData([])
    }
  }, [list])

  const columnHelper = createColumnHelper<Row>()
  const columns = [
    columnHelper.accessor("type", {
      id: "type",
      cell: (info) => (
        <span className="px-3 text-slate-400">{info.getValue()}</span>
      ),
      header: "",
      meta: {
        filterVariant: "select",
      },
      enableSorting: false,
    }),
    columnHelper.accessor((row) => (row.name ? row.name : ""), {
      id: "name",
      cell: (info) => <span className="px-3">{info.getValue()}</span>,
      header: "Name",
      sortUndefined: "last",
      sortDescFirst: false,
      meta: {
        filterVariant: "text",
      },
    }),
    columnHelper.accessor("creationTime", {
      cell: (info) => (
        <span className="px-3 text-slate-400">
          {formatTimestampHumanFormat(info.getValue())}
        </span>
      ),
      header: "Creation time",
      sortingFn: sortCreationTimeFn,
      enableColumnFilter: false,
    }),
    columnHelper.accessor("lastModified", {
      id: "lastModified",
      cell: (info) => (
        <span className="px-3 text-slate-400">
          {formatTimestampHumanFormat(info.getValue())}
        </span>
      ),
      header: "Last modified",
      sortingFn: sortLastModifiedFn,
      enableColumnFilter: false,
    }),
    columnHelper.accessor(
      (row) => {
        const res: RowObject = { type: row.type, id: row.id }
        return res
      },
      {
        id: "modify",
        cell: (info) => (
          <span
            className="pointer-events-auto text-right"
            onClick={(e) => e.stopPropagation()}
          >
            {info.getValue().type === "feedback" ? (
              <EditFeedback
                feedbackId={info.getValue().id as Id<"feedbacks">}
              />
            ) : (
              <EditChat chatId={info.getValue().id as Id<"chats">} />
            )}
          </span>
        ),
        header: "",
        size: 2,
        enableSorting: false,
        enableColumnFilter: false,
      }
    ),
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnFiltersChange: setColumnFilters,
    filterFns: {},
    state: { sorting, columnFilters, pagination },
    getRowId: (originalRow) => originalRow.id,
  })
  let nameRow: Column<Row, unknown> | undefined

  return (
    <>
      {data.length !== 0 && (
        <div className="p-2">
          <div className="mb-6 flex w-full flex-row">
            {(nameRow = table.getColumn("name")) !== undefined && (
              <div className="mr-4 w-full">
                <Filter column={nameRow} />
              </div>
            )}
            <div className="flex flex-row content-center p-2">
              <p className="mr-3 content-center">Show</p>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value))
                }}
                className="rounded-md border bg-slate-200"
              >
                {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
              <p className="ml-3 content-center">entries</p>
            </div>
          </div>
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-solid border-gray-400"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="p-2 pl-3 text-left text-gray-500"
                    >
                      {header.isPlaceholder ? null : (
                        <>
                          <div
                            className={
                              header.column.getCanSort()
                                ? "cursor-pointer select-none"
                                : ""
                            }
                            onClick={header.column.getToggleSortingHandler()}
                            title={
                              header.column.getCanSort()
                                ? header.column.getNextSortingOrder() === "asc"
                                  ? "Sort ascending"
                                  : header.column.getNextSortingOrder() ===
                                      "desc"
                                    ? "Sort descending"
                                    : "Clear sort"
                                : undefined
                            }
                          >
                            <div className="flex items-center justify-items-center">
                              {{
                                asc: (
                                  <div className="pr-3">
                                    <ChevronUpIcon className="h-6 w-6 rounded-md border bg-gray-500 p-px font-bold text-white" />
                                  </div>
                                ),
                                desc: (
                                  <div className="pr-3">
                                    <ChevronDownIcon className="h-6 w-6 rounded-md border bg-gray-500 p-px font-bold text-white" />
                                  </div>
                                ),
                              }[header.column.getIsSorted() as string] ?? null}
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {header.column.getCanFilter() &&
                              header.id === "type" ? (
                                <div>
                                  <Filter column={header.column} />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  className="border-b border-solid border-gray-200 hover:cursor-pointer hover:bg-sky-300"
                  key={row.id}
                  onClick={() => {
                    router.push(
                      row.original.type === "feedback"
                        ? `/${courseSlug}/super-assistant/feedback/${row.id}`
                        : `/${courseSlug}/super-assistant/chat/${row.id}`
                    )
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-row flex-nowrap items-center justify-center p-4">
            <button
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
              className="mr-2 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-200 text-sky-700 enabled:hover:cursor-pointer enabled:hover:bg-sky-300 enabled:hover:text-sky-950 disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:cursor-default"
              type="button"
              title="Go to the first page"
            >
              <ChevronDoubleLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-200 text-sky-700 enabled:hover:cursor-pointer enabled:hover:bg-sky-300 enabled:hover:text-sky-950 disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:cursor-default"
              type="button"
              title="Go to the previous page"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <div className="content-center justify-center p-4 text-center">
              <p>
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </p>
            </div>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="mr-2 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-200 text-sky-700 enabled:hover:cursor-pointer enabled:hover:bg-sky-300 enabled:hover:text-sky-950 disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:cursor-default"
              type="button"
              title="Go to the next page"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-200 text-sky-700 enabled:hover:cursor-pointer enabled:hover:bg-sky-300 enabled:hover:text-sky-950 disabled:bg-slate-200 disabled:text-slate-600 disabled:hover:cursor-default"
              type="button"
              title="Go to the last page"
            >
              <ChevronDoubleRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: "text" | "select"
  }
}

function Filter({ column }: { column: Column<Row, unknown> }) {
  const columnFilterValue = column.getFilterValue()
  const { filterVariant } = column.columnDef.meta ?? {}

  return filterVariant === "select" ? (
    <select
      onChange={(e) => column.setFilterValue(e.target.value)}
      value={columnFilterValue?.toString()}
      className="rounded-md border bg-slate-200"
    >
      <option value="">both</option>
      <option value="feedback">feedback</option>
      <option value="chat">chat</option>
    </select>
  ) : (
    <DebouncedInput
      className="w-full bg-transparent p-3 focus:outline-0"
      onChange={(value) => column.setFilterValue(value)}
      placeholder={"Search..."}
      type="text"
      value={(columnFilterValue ?? "") as string}
    />
  )
}

function DebouncedInput({
  value: firstVal,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number
  onChange: (value: string | number) => void
  debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  const [value, setValue] = useState(firstVal)

  useEffect(() => {
    setValue(firstVal)
  }, [firstVal])
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value)
    }, debounce)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <form className="flex w-full flex-row items-center rounded-md border border-slate-200 bg-slate-100 text-gray-500">
      <MagnifyingGlassIcon className="h-10 w-10 p-2 pl-3" />
      <input
        {...props}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </form>
  )
}

function SuperAssistant() {
  const [file, setFile] = useState<File | null>(null)
  const courseSlug = useCourseSlug()
  const [isModal1Open, setIsModal1Open] = useState(false)
  const [isModal2Open, setIsModal2Open] = useState(false)
  const [chatName, setChatName] = useState("")
  const [statement, setStatement] = useState("")
  const router = useRouter()
  const generateFeedback = useMutation(api.feedback.generateFeedback)
  const generateUploadUrl = useMutation(api.feedback.generateUploadUrl)
  const { startUpload } = useFileUpload(() => generateUploadUrl({}))
  const generateChat = useMutation(api.superassistant.chat.generateChat)
  const [feedbackName, setFeedbackName] = useState("")
  const weeks = useQuery(api.admin.sadatabase.getWeeks, { courseSlug })
  const [selectedFeedbackWeek, setSelectedFeedbackWeek] = useState<number>(
    weeks === undefined ? NaN : weeks[0]
  )
  const [selectedChatWeek, setSelectedChatWeek] = useState<number>(
    weeks === undefined ? NaN : weeks[0]
  )

  return (
    <>
      <div className="mt-16 mb-16 flex flex-row gap-3 text-3xl font-medium">
        <div className="basis-1/2 justify-items-center">
          <p className="text-center text-xl">Get feedback on an exercise</p>
          <div className="mt-4 grid justify-items-center">
            <button
              className="block rounded-3xl shadow-[inset_0_0_0_2px_#bfdbfe] transition-shadow hover:shadow-[inset_0_0_0_2px_#0084c7]"
              type="button"
              onClick={() => {
                setIsModal1Open(true)
              }}
            >
              <div className="p-8 pr-10 pl-10">
                <div className="flex flex-col items-center justify-center gap-2 text-xl text-sky-700">
                  <PlusIcon className="mb-2 h-6 w-6" />
                  <span>New feedback</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="h-auto w-1 self-stretch bg-gray-400"></div>

        <div className="basis-1/2 justify-items-center">
          <p className="text-center text-xl">
            Still stuck? Chat with the Super-Assistant
          </p>
          <div className="mt-4 grid justify-items-center">
            <button
              className="rounded-3xl shadow-[inset_0_0_0_2px_#bfdbfe] transition-shadow hover:shadow-[inset_0_0_0_2px_#0084c7]"
              type="button"
              onClick={() => {
                setIsModal2Open(true)
              }}
            >
              <div className="p-8 pr-16 pl-16">
                <div className="flex flex-col items-center justify-center gap-2 text-xl text-sky-700">
                  <PlusIcon className="mb-2 h-6 w-6" />
                  <span>New chat</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModal1Open}
        onClose={() => setIsModal1Open(false)}
        title="Upload your tentative solution to get feedback."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (file === null) {
              toast.error(
                "You have to upload your tentative solution to get feedback."
              )
            } else {
              const uploaded = await startUpload([file])
              const storageId = (uploaded[0].response as { storageId: string })
                .storageId
              const feedbackId = await generateFeedback({
                courseSlug,
                storageId: storageId,
                name: feedbackName,
                weekNumber: selectedFeedbackWeek,
              })

              if (feedbackId) {
                router.push(
                  `/${courseSlug}/super-assistant/feedback/${feedbackId}`
                )
              } else {
                toast.error("Failed to generate feedback.")
              }
              setFile(null)
              setIsModal1Open(false)
            }
          }}
        >
          <UploadWithImage value={file} onChange={(value) => setFile(value)} />
          {weeks !== undefined && (
            <>
              <label
                htmlFor="week-number"
                className="block text-sm font-medium text-slate-800"
              >
                Please select the week you are working on:
              </label>
              <select
                name="week"
                id="week-number"
                value={selectedFeedbackWeek}
                onChange={(e) =>
                  setSelectedFeedbackWeek(Number(e.target.value))
                }
                className="form-select mt-1 mb-6 h-10 w-full rounded-md border border-slate-300 p-2 font-sans focus:border-inherit focus:ring-2 focus:ring-inherit focus:outline-none"
              >
                {weeks.map((week) => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            </>
          )}
          <Input
            label="Name this new feedback (optional):"
            placeholder="Name"
            value={feedbackName}
            onChange={(value) => setFeedbackName(value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsModal1Open(false)
                setFile(null)
                setFeedbackName("")
              }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Generate feedback
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModal2Open}
        onClose={() => setIsModal2Open(false)}
        title="Start a chat with the Super-Assistant."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const chatId = await generateChat({
              courseSlug,
              reason: statement,
              name: chatName,
              weekNumber: selectedChatWeek,
            })

            if (chatId) {
              router.push(`/${courseSlug}/super-assistant/chat/${chatId}`)
            } else {
              toast.error("Failed to generate chat.")
            }

            setIsModal2Open(false)
          }}
        >
          <div className="h-6"></div>
          {weeks !== undefined && (
            <>
              <label
                htmlFor="week-number"
                className="block text-sm font-medium text-slate-800"
              >
                Please select the week you are working on:
              </label>
              <select
                name="week"
                id="week-number"
                value={selectedChatWeek}
                onChange={(e) => setSelectedChatWeek(Number(e.target.value))}
                className="form-select mt-1 mb-6 h-10 w-full rounded-md border border-slate-300 p-2 font-sans focus:border-inherit focus:ring-2 focus:ring-inherit focus:outline-none"
              >
                {weeks.map((week) => (
                  <option key={week} value={week}>
                    Week {week}
                  </option>
                ))}
              </select>
            </>
          )}
          <Input
            label="Name this new chat (optional):"
            placeholder="Name"
            value={chatName}
            onChange={(value) => setChatName(value)}
          />
          <Input
            label="Specify the exercise and what clarification you need:"
            placeholder="Reason for new chat"
            value={statement}
            onChange={(value) => setStatement(value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsModal2Open(false)
                setChatName("")
                setStatement("")
              }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Generate new chat
            </Button>
          </div>
        </form>
      </Modal>

      <Table />
    </>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-12">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="animate-pulse" key={i}>
          <div className="flex h-9 flex-wrap">
            <div className="mr-[20%] flex-1 rounded bg-slate-200" />
            <div className="w-36 rounded-full bg-slate-200" />
          </div>

          <div className="my-4 h-6 w-72 rounded bg-slate-200" />

          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-slate-200 pb-[57.14%]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
