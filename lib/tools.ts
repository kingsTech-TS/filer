import { AppWindow, Package, PackageOpen, Repeat, WandSparkles, type LucideIcon } from "lucide-react"

export type ToolId = "convert" | "remove-bg" | "zip" | "unzip" | "favicon"

export interface Tool {
  id: ToolId
  label: string
  icon: LucideIcon
  /** Middle step in the Upload → X → Download tracker. */
  step: string
  description: string
}

export const TOOLS: Tool[] = [
  {
    id: "convert",
    label: "Convert",
    icon: Repeat,
    step: "Convert",
    description: "Docs, slides, sheets, images, audio & video",
  },
  {
    id: "remove-bg",
    label: "Remove BG",
    icon: WandSparkles,
    step: "Remove BG",
    description: "Cut out the subject into a transparent PNG",
  },
  {
    id: "zip",
    label: "Zip",
    icon: Package,
    step: "Compress",
    description: "Bundle up to 50 files into one archive",
  },
  {
    id: "unzip",
    label: "Unzip",
    icon: PackageOpen,
    step: "Extract",
    description: "Open a .zip and grab the files inside",
  },
  {
    id: "favicon",
    label: "Favicon",
    icon: AppWindow,
    step: "Generate",
    description: "Icons for every device from text, emoji or an image",
  },
]

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, Tool>
