import clsx from "clsx"
import Link from "next/link"

export function ImageLink({
  href,
  name,
  image,
  corner,
}: {
  href: string
  name: string
  image: {
    thumbnails: { type: string; sizes?: string; src: string }[]
  } | null
  corner?: React.ReactNode
}) {
  return (
    <div className="group block overflow-hidden rounded-3xl shadow-lg transition hover:scale-105 hover:shadow-2xl">
      <div className="relative pb-[57.14%]">
        <div
          className={clsx(
            "absolute inset-0",
            image && "bg-slate-500",
            !image && "bg-slate-600"
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
                className="absolute inset-0 h-full w-full object-cover object-center transition-transform group-hover:scale-105"
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
              "absolute inset-0 flex items-end p-4 text-white focus:outline-none",
              image && "bg-gradient-to-t from-black/70 via-black/25"
            )}
          >
            <h2 className="text-2xl font-semibold text-balance text-shadow-lg">
              {name}
            </h2>
          </Link>
        </div>

        {corner && (
          <div className="pointer-events-none absolute top-0 right-0">
            {corner}
          </div>
        )}
      </div>
    </div>
  )
}
