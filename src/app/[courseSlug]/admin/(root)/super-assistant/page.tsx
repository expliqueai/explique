"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@/usingSession";
import { PlusIcon } from "@heroicons/react/20/solid";
import { TrashIcon } from "@heroicons/react/24/outline";
import { api } from "../../../../../../convex/_generated/api";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import Title from "@/components/typography";
import Input from "@/components/Input";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";
import Upload from "@/components/Upload";
import PdfToImg from "pdftoimg-js/browser";
import { useUploadFiles } from "@xixixao/uploadstuff/react";


export default function AdminSuperAssistantPage() {
  const courseSlug = useCourseSlug();
  const files = useQuery(api.admin.sadatabase.list, {
    courseSlug,
  });
  const deleteFile = useMutation(api.admin.sadatabase.deleteFile);

  return (
    <>
      <Title>
        <span className="flex-1">Super-Assistant Files</span>
        <UploadFile />
      </Title>

      <table className="text-sm w-full divide-y divide-slate-300">
        <thead>
          <tr>
            <th scope="col" className="px-2 py-3 align-bottom text-left">
              Filename
            </th>
            <th scope="col" className="px-2 py-3 align-bottom text-left">
              Week
            </th>
            <th scope="col" className="px-2 py-3 align-bottom text-left">
              Creation time
            </th>
            <th scope="col" className="px-2 py-3 align-bottom justify-end">
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {files?.map((file) => (
            <tr key={file.name}>
              <td className="px-2 py-3">
                <OpenFile filename={file.name} />
              </td>
              <td className="px-2 py-3">{(file.week === -1) ? "No week assigned" : "Week " + file.week}</td>
              <td className="px-2 py-3">{file.creationTime}</td>
              <td>
                <button
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white"
                  type="button"
                  title="Delete"
                  onClick={async (e) => {
                    e.preventDefault();
                  }}
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}


function UploadFile({}: {}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const uploadFile = useMutation(api.admin.sadatabase.uploadFile);
  const generateUploadUrl = useMutation(api.admin.sadatabase.generateUploadUrl);
  const { startUpload } = useUploadFiles(generateUploadUrl);
  const [week, setWeek] = useState("");
  const courseSlug = useCourseSlug();
  const [file, setFile] = useState<File | null>(null);

  async function handleUploadFile() {
    const storageIds = [];

    if (file !== null) {
      const uploaded = await startUpload([file]);
      const storageId = uploaded.map(({response}) => ((response as any).storageId))[0];
      storageIds.push({
        pageNumber: 0, 
        storageId: storageId,
      });

      const filename = file.name.split(".")[0];
      const pages = await PdfToImg(file, {imgType: "png", pages:"all", returnType:"buffer"});
      for (let index in pages) {
        const page = new File([pages[index]], `${filename}_page${index}.png`, {type:"image/png"});
        const pageUploaded = await startUpload([page]);
        const pageStorageId = pageUploaded.map(({response}) => ((response as any).storageId))[0];
        storageIds.push({
          pageNumber: Number(index)+1,
          storageId: pageStorageId,
        });
      }
    }

    return storageIds;
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => { setIsModalOpen(true); }}
        >
          <PlusIcon className="w-5 h-5" />
          Upload file
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload a new file to the knowledge database."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (file === null) return;
            setIsModalOpen(false);
            const weekNumber = (week === "" ? -1 : Number(week));
            const storageIds = await handleUploadFile();
            setWeek("");
            setFile(null);
            await uploadFile({ courseSlug:courseSlug, week:(!isNaN(weekNumber) && weekNumber >= 0 ? weekNumber : -1), name:file?file.name:"", storageIds:storageIds });
            toast.success("The file has been uploaded. Thank you!");
          }}
        >
          <Upload
            value={file}
            onChange={(value) => setFile(value)}
          />
          <Input
            label="Specify week (optional):"
            placeholder="Week number"
            value={week}
            onChange={(value) => setWeek(value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setWeek("");
                setFile(null);
              }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add file
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function OpenFile({
  filename
}: {
  filename: string
}) {
  const courseSlug = useCourseSlug();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const getUrl = useQuery(api.admin.sadatabase.getUrl, { courseSlug:courseSlug, name:filename });

  return (
    <>
      <button
        className="text-blue-600 underline"
        onClick={() => setIsModalOpen(true)}
        >
          {filename}
      </button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        {getUrl &&
          <img src={getUrl} height="300px" width="auto" />
        }
      </Modal>
    </>
  );
}