import SrcMarkdown, { Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import clsx from "clsx";

export default function Markdown({
  text,
  className,
  components,
}: {
  text: string;
  className?: string;
  components?: Partial<Components> | null;
}) {
  return (
    <SrcMarkdown
      className={clsx("prose prose-sm sm:prose-base", className)}
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {text}
    </SrcMarkdown>
  );
}
