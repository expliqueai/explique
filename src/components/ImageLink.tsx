import clsx from "clsx";
import Link from "next/link";

export function ImageLink({
  href,
  name,
  image,
  corner,
}: {
  href: string;
  name: string;
  image: {
    thumbnails: { type: string; sizes?: string; src: string }[];
  } | null;
  corner?: React.ReactNode;
}) {
  return (
    <div className="block shadow-lg transition hover:scale-105 hover:shadow-2xl group rounded-3xl">
      <div className="relative pb-[57.14%]">
        <div
          className={clsx(
            "rounded-3xl overflow-hidden absolute inset-0 focus-within:ring-8",
            image && "bg-slate-500",
            !image && "bg-slate-600",
          )}
        >
          {image && (
            <picture>
              {image.thumbnails.map((t, tIndex) => (
                <source
                  key={tIndex}
                  srcSet={t.src}
                  type={t.type}
                  sizes={t.sizes}
                />
              ))}
              <img
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform object-center"
                src={
                  image.thumbnails.find((t) => t.type === "image/avif")?.src ??
                  undefined
                }
                alt={""}
              />
            </picture>
          )}

          <Link
            href={href}
            className={clsx(
              "absolute inset-0 flex p-4 text-white items-end focus:outline-none",
              image && "bg-gradient-to-t via-black/25 from-black/70",
            )}
          >
            <h2 className="font-semibold text-2xl text-shadow-lg [text-wrap:balance]">
              {name}
            </h2>
          </Link>
        </div>

        {corner && (
          <div className="absolute top-0 right-0 pointer-events-none">
            {corner}
          </div>
        )}
      </div>
    </div>
  );
}
