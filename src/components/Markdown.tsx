import SrcMarkdown, { Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
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
    <div className={clsx("prose prose-sm sm:prose-base", className)}>
      <SrcMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {text}
      </SrcMarkdown>
    </div>
  );
}
