import { CloudArrowUpIcon } from "@heroicons/react/24/outline";


export default function Upload({
  value,
  onChange,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  
    const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files ? event.target.files[0] : null;
        onChange(file);
    }

    return (
        <div className="flex flex-col justify-center items-center mt-10 mb-6">
            <div className="w-80 h-40 max-w-md rounded border-blue-900 border-dashed border-2 bg-blue-10 text-blue-900 hover:bg-blue-50 items-center content-center">
                <input type="file" id="fileInput" className="hidden" onChange={handleFileInput} />
                <label htmlFor="fileInput" className="flex justify-center items-center w-full h-full rounded cursor-pointer">
                    <CloudArrowUpIcon className="w-20 h-20"/>
                </label>
            </div>
            {value && (
                <div className="mt-2">
                    <p className="text-blue-900 text-sm font-medium">{value.name}</p>
                </div>
            )}
        </div>
    );
}