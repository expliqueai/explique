import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";


export default function UploadWithImage({
  value,
  onChange,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
    const [fileUrl, setFileUrl] = useState("");
  
    const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null;
        if (file !== null) setFileUrl(URL.createObjectURL(file));
        onChange(file);
    }

    return (
        <div className="flex flex-col justify-items-center items-center mt-10 mb-6">
            {!value ? (
                <div className="w-80 h-40 max-w-md rounded border-blue-900 border-dashed border-2 bg-blue-10 text-blue-900 hover:bg-blue-50 items-center content-center">
                    <input type="file" id="fileInput" className="hidden" onChange={handleFileInput} />
                    <label htmlFor="fileInput" className="flex justify-center items-center w-full h-full rounded cursor-pointer">
                        <ArrowUpTrayIcon className="w-10 h-10"/>
                    </label>
                </div>
            ) : (    
                <picture className="relative inline-flex">
                    <img className="max-w-80 max-h-40 p-2" src={fileUrl} alt={""}/>
                    <button className="text-white bg-red-700 rounded-full absolute top-0 right-0 z-1" onClick={() => onChange(null)}>
                        <XMarkIcon className="w-5 h-5 p-1" />
                    </button>
                </picture>
            )}
        </div>
    );
}