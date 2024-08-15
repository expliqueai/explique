"use client";

import Title from "@/components/typography";
import React from "react";
import { api } from "../../../../../../convex/_generated/api";
import { useQuery } from "@/usingSession";
import Link from "next/link";
import { ChatBubbleBottomCenterTextIcon } from "@heroicons/react/24/outline";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { Id } from "../../../../../../convex/_generated/dataModel";


type Report = {
  id: string
  type: "exercise" | "chat" | "feedback"
  attemptId: string
  reason: string
  message: string | undefined
}

export default function ReportsPage() {
  const courseSlug = useCourseSlug();
  const reports : Report[] | undefined = useQuery(api.admin.reports.list, { courseSlug });

  return (
    <>
      <Title>Reports</Title>
      <table className="text-sm w-full divide-y divide-slate-300">
        <thead>
          <tr>
            <th scope="col" className="px-2 py-3 align-bottom text-left">
              Reported message
            </th>
            <th scope="col" className="px-2 py-3 align-bottom text-left">
              Reason
            </th>
            <th scope="col" className="px-2 py-3 align-bottom text-left">
              Type of conversation
            </th>
            <th
              scope="col"
              className="px-2 py-3 align-bottom text-left whitespace-nowrap"
            >
              Go to the conversation
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {reports?.map((report) => (
            <tr key={report.id}>
              <td className="px-2 py-3">{report.message}</td>
              <td className="px-2 py-3">{report.reason}</td>
              <td className="px-2 py-3">{report.type}</td>
              <td className="px-2 py-3">
                <Link
                  href={report.type === "exercise" ? `/a/${report.attemptId}` : 
                        report.type === "chat" ? `/${courseSlug}/super-assistant/chat/${report.attemptId}` :
                        `/${courseSlug}/super-assistant/feedback/${report.attemptId}`}
                  className="flex [&>svg]:w-6 [&>svg]:h-6 [&>svg]:mr-2 items-center justify-center h-12 px-4 transition-colors rounded-full text-blue-800 "
                >
                  <ChatBubbleBottomCenterTextIcon />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
