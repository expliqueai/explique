import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

function TabBarLink({ href, label }: { href: string; label: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center justify-center px-4 py-1 relative font-medium text-lg tracking-tight text-slate-700 rounded-full  focus:outline-none",
      )}
      aria-selected={isActive}
    >
      <span className="select-none pointer-events-none opacity-0" aria-hidden>
        {label}
      </span>
      <span
        className={clsx(
          "absolute flex items-center justify-center inset-0 transition-all",
          isActive && "font-semibold text-slate-700",
        )}
      >
        <div className="w-full text-center truncate">{label}</div>
      </span>
    </Link>
  );
}

export function TabBar({
  items,
}: {
  items: {
    label: string;
    href: string;
  }[];
}) {
  const pathName = usePathname();
  const selectedIndex = items.findIndex((item) => item.href === pathName);

  return (
    <div className="mb-7 flex justify-center">
      <nav className="bg-slate-200 p-1.5 rounded-full overflow-hidden">
        <div className="relative grid grid-flow-col auto-cols-fr">
          {selectedIndex !== -1 && (
            <span
              className="absolute rounded-full h-full bg-white transition-transform shadow-md"
              role="presentation"
              style={{
                width: `calc(100% / ${items.length})`,
                transform: `translateX(calc(${selectedIndex}00%))`,
              }}
            ></span>
          )}
          {items.map((item) => (
            <TabBarLink key={item.href} href={item.href} label={item.label} />
          ))}
        </div>
      </nav>
    </div>
  );
}
