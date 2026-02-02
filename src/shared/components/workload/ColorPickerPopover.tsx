import { useState, useEffect } from "react";
import { Palette } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Input } from "@/shared/components/ui/input";

const PRESET_COLORS = [
  "#16a249", // green
  "#3c83f6", // blue
  "#a855f7", // purple
  "#dc2828", // red
  "#facc14", // yellow
  "#ff8400", // orange
  "#ec4899", // pink
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#8b5cf6", // violet
  "#f59e0b", // amber
  "#ef4444", // rose
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#f97316", // orange-600
  "#84cc16", // lime
];

interface ColorPickerPopoverProps {
  color: string;
  onColorChange: (color: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  size?: string;
  disableHexInput?: boolean;
}

export function ColorPickerPopover({
  color,
  onColorChange,
  isOpen,
  onOpenChange,
  size = "w-6 h-6",
  disableHexInput = false,
}: ColorPickerPopoverProps) {
  const [tempColor, setTempColor] = useState(color);

  useEffect(() => {
    setTempColor(color);
  }, [color, isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div
          className={`relative ${size} rounded flex-shrink-0 cursor-pointer hover:opacity-80 border border-border flex items-center justify-center`}
          style={{ backgroundColor: color }}
          title="Click to change color"
        >
          <Palette className="h-3 w-3 text-white opacity-70 drop-shadow pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-3 bg-card border border-border shadow-lg rounded-lg z-[250]"
        style={{ width: "400px" }}
        align="start"
      >
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Select Color</h4>
          {/* Preset Colors + Custom Color in Grid */}
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                onClick={() => {
                  onColorChange(presetColor);
                  onOpenChange(false);
                }}
                className={`h-10 rounded border-2 ${
                  color === presetColor
                    ? "border-foreground"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: presetColor }}
                title={presetColor}
              />
            ))}
            {/* Custom Color Picker Button */}
            <div className="flex flex-col gap-1 items-center justify-center relative">
              <input
                type="color"
                value={tempColor}
                onChange={(e) => {
                  setTempColor(e.target.value);
                  onColorChange(e.target.value);
                }}
                className="w-full h-10 rounded cursor-pointer border border-border"
              />
              <Palette className="h-6 w-6 text-white absolute pointer-events-none" />
            </div>
          </div>
          {/* Hex Input for Custom Color */}
          <div className="flex gap-2 items-center">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Hex:
            </label>
            <Input
              value={tempColor}
              onChange={(e) => {
                if (!disableHexInput) {
                  setTempColor(e.target.value);
                  onColorChange(e.target.value);
                }
              }}
              disabled={disableHexInput}
              className="h-8 text-xs flex-1"
              placeholder="#000000"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
