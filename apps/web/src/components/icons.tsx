// SF Symbols (via symbols-react) re-exported under the names previously used
// from `lucide-react`, with a thin wrapper that accepts the lucide-style
// `size` / `strokeWidth` / `className` props so call sites don't need to change
// their prop API.
//
// IMPORTANT: this is the only icon module in the app. Do not import from
// `lucide-react` or any other icon library. Add new icons here by re-exporting
// the appropriate `Icon*` component from `symbols-react`.

import * as React from "react";
import {
  IconAppleTerminal,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconAtom,
  IconBrain,
  IconBubbleLeft,
  IconCheckmark,
  IconCheckmarkCircle,
  IconChevronDown,
  IconChevronRight,
  IconChevronUp,
  IconCpu,
  IconDisplay,
  IconDocumentOnClipboard,
  IconDocumentBadgePlus,
  IconDocumentOnDocument,
  IconTextDocument,
  IconEllipsis,
  IconExclamationmarkCircle,
  IconExclamationmarkTriangle,
  IconExternaldrive,
  IconFolder,
  IconGear,
  IconGlobe,
  IconHammer,
  IconInfoCircle,
  IconListBulletIndent,
  IconMagnifyingglass,
  IconMessage,
  IconMoon,
  IconPencil,
  IconPlus,
  IconSparkles,
  IconSquare,
  IconSunMax,
  IconTrash,
  IconWandAndRays,
  IconXmark,
} from "symbols-react";

type SymbolComponent = React.ForwardRefExoticComponent<
  React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>
>;

export type IconProps = Omit<
  React.SVGProps<SVGSVGElement>,
  "width" | "height"
> & {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  /** Accepted for lucide-compatibility. SF Symbols are filled glyphs, so this is ignored. */
  strokeWidth?: number | string;
};

export type Icon = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

// Compatibility alias for code that imported `LucideIcon` as a type.
export type LucideIcon = Icon;

function wrap(Component: SymbolComponent, displayName: string): Icon {
  const Wrapped = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size, strokeWidth: _strokeWidth, fill, width, height, ...rest }, ref) => {
      const w = width ?? size ?? "1em";
      const h = height ?? size ?? "1em";
      return (
        <Component
          ref={ref}
          fill={fill ?? "currentColor"}
          width={w}
          height={h}
          {...rest}
        />
      );
    },
  );
  Wrapped.displayName = displayName;
  return Wrapped;
}

export const ArrowLeft = wrap(IconArrowLeft, "ArrowLeft");
export const ArrowRight = wrap(IconArrowRight, "ArrowRight");
export const ArrowUp = wrap(IconArrowUp, "ArrowUp");
export const ChevronUp = wrap(IconChevronUp, "ChevronUp");
export const Copy = wrap(IconDocumentOnClipboard, "Copy");
export const Square = wrap(IconSquare, "Square");
export const Bot = wrap(IconAtom, "Bot");
export const Brain = wrap(IconBrain, "Brain");
export const Check = wrap(IconCheckmark, "Check");
export const ChevronDown = wrap(IconChevronDown, "ChevronDown");
export const ChevronRight = wrap(IconChevronRight, "ChevronRight");
export const CircleAlert = wrap(IconExclamationmarkCircle, "CircleAlert");
export const CircleCheck = wrap(IconCheckmarkCircle, "CircleCheck");
export const Cpu = wrap(IconCpu, "Cpu");
export const FileDiff = wrap(IconDocumentOnDocument, "FileDiff");
export const FilePlus = wrap(IconDocumentBadgePlus, "FilePlus");
export const FileText = wrap(IconTextDocument, "FileText");
export const Folder = wrap(IconFolder, "Folder");
export const FolderTree = wrap(IconListBulletIndent, "FolderTree");
export const Globe = wrap(IconGlobe, "Globe");
export const HardDrive = wrap(IconExternaldrive, "HardDrive");
export const Info = wrap(IconInfoCircle, "Info");
export const Message = wrap(IconMessage, "Message");
export const MessagesSquare = wrap(IconBubbleLeft, "MessagesSquare");
export const Moon = wrap(IconMoon, "Moon");
export const Monitor = wrap(IconDisplay, "Monitor");
export const MoreHorizontal = wrap(IconEllipsis, "MoreHorizontal");
export const Pencil = wrap(IconPencil, "Pencil");
export const Plus = wrap(IconPlus, "Plus");
export const Search = wrap(IconMagnifyingglass, "Search");
export const Settings = wrap(IconGear, "Settings");
export const Sparkles = wrap(IconSparkles, "Sparkles");
export const Sun = wrap(IconSunMax, "Sun");
export const Terminal = wrap(IconAppleTerminal, "Terminal");
export const Trash2 = wrap(IconTrash, "Trash2");
export const TriangleAlert = wrap(IconExclamationmarkTriangle, "TriangleAlert");
export const Wand2 = wrap(IconWandAndRays, "Wand2");
export const Wrench = wrap(IconHammer, "Wrench");
export const X = wrap(IconXmark, "X");
