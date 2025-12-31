import { MoreHorizontal } from "lucide-react";

type TableHeaderCellProps = {
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
  showRightBorder?: boolean;
};

export const TableHeaderCell = ({
  title,
  width,
  align = "center",
  showRightBorder = true,
}: TableHeaderCellProps) => {
  return (
    <th
      className={`relative p-4 font-medium group/column-header ${
        showRightBorder ? "border-r border-border" : ""
      }`}
      style={width ? { width } : undefined}
    >
      {/* Left icon */}
      {/* <div className="absolute left-2 top-1/2 -translate-y-1/2">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover/column-header:opacity-100 transition-opacity" />
      </div> */}

      {/* Title */}
      <div
        className={
          align === "left"
            ? "text-left pl-6"
            : align === "right"
            ? "text-right pr-6"
            : "text-center"
        }
      >
        {title}
      </div>

      {/* Right icon */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <MoreHorizontal className="h-4 w-4 text-muted-foreground opacity-0 group-hover/column-header:opacity-100 transition-opacity" />
      </div>
    </th>
  );
};
