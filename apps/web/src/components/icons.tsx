"use client"

// Phosphor icons re-exported under the names previously used from
// `lucide-react`, with a thin wrapper that accepts the lucide-style
// `size` / `strokeWidth` / `className` props so call sites don't need to change
// their prop API.
//
// IMPORTANT: this is the only icon module in the app. Do not import from
// any other icon library. Add new icons here by re-exporting the appropriate
// Phosphor component.

import * as React from "react";
import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";
import {
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  ArrowUp as PhArrowUp,
  Brain as PhBrain,
  CaretDown as PhCaretDown,
  CaretRight as PhCaretRight,
  CaretUp as PhCaretUp,
  CaretUpDown as PhCaretUpDown,
  ChatCircle as PhChatCircle,
  ChatCentered as PhChatCentered,
  Chats as PhChats,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  Copy as PhCopy,
  Cpu as PhCpu,
  DotsThree as PhDotsThree,
  FileDashedIcon as PhFileDiff,
  FilePlus as PhFilePlus,
  FileText as PhFileText,
  Folder as PhFolder,
  GearSix as PhGearSix,
  Globe as PhGlobe,
  HardDrive as PhHardDrive,
  Info as PhInfo,
  MagicWand as PhMagicWand,
  MagnifyingGlass as PhMagnifyingGlass,
  Monitor as PhMonitor,
  Moon as PhMoon,
  PencilSimple as PhPencilSimple,
  Plus as PhPlus,
  Robot as PhRobot,
  Sparkle as PhSparkle,
  Square as PhSquare,
  SidebarSimple as PhSidebarSimple,
  Sun as PhSun,
  Terminal as PhTerminal,
  Trash as PhTrash,
  TreeStructure as PhTreeStructure,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  Question as PhQuestion,
  Wrench as PhWrench,
  X as PhX,
} from "@phosphor-icons/react";

type PhosphorComponent = React.ForwardRefExoticComponent<
  PhosphorIconProps & React.RefAttributes<SVGSVGElement>
>;

export type IconProps = Omit<PhosphorIconProps, "size"> & {
  size?: number | string;
  width?: number | string;
  height?: number | string;
  /** Accepted for lucide-compatibility. Phosphor uses weights instead. */
  strokeWidth?: number | string;
};

export type Icon = React.ForwardRefExoticComponent<
  IconProps & React.RefAttributes<SVGSVGElement>
>;

export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
} as const;

// Compatibility alias for code that imported `LucideIcon` as a type.
export type LucideIcon = Icon;

function wrap(Component: PhosphorComponent, displayName: string): Icon {
  const Wrapped = React.forwardRef<SVGSVGElement, IconProps>(
    ({ size, strokeWidth: _strokeWidth, width, height, ...rest }, ref) => {
      const hasExplicitSize = size != null || width != null || height != null;
      const resolvedSize = size ?? width ?? height ?? 16;
      const w = width ?? resolvedSize;
      const h = height ?? resolvedSize;
      const iconSize = resolvedSize;
      const style = hasExplicitSize
        ? { ...(rest.style ?? {}), width: w, height: h }
        : rest.style;
      return (
        <Component
          ref={ref}
          size={iconSize}
          width={w}
          height={h}
          style={style}
          {...rest}
        />
      );
    },
  );
  Wrapped.displayName = displayName;
  return Wrapped;
}

export const ArrowLeft = wrap(PhArrowLeft, "ArrowLeft");
export const ArrowRight = wrap(PhArrowRight, "ArrowRight");
export const ArrowUp = wrap(PhArrowUp, "ArrowUp");
export const ChevronUp = wrap(PhCaretUp, "ChevronUp");
export const Copy = wrap(PhCopy, "Copy");
export const Square = wrap(PhSquare, "Square");
export const Bot = wrap(PhRobot, "Bot");
export const Brain = wrap(PhBrain, "Brain");
export const Check = wrap(PhCheck, "Check");
export const ChevronsUpDown = wrap(PhCaretUpDown, "ChevronsUpDown");
export const ChevronDown = wrap(PhCaretDown, "ChevronDown");
export const ChevronRight = wrap(PhCaretRight, "ChevronRight");
export const CircleAlert = wrap(PhWarningCircle, "CircleAlert");
export const CircleCheck = wrap(PhCheckCircle, "CircleCheck");
export const Cpu = wrap(PhCpu, "Cpu");
export const FileDiff = wrap(PhFileDiff, "FileDiff");
export const FilePlus = wrap(PhFilePlus, "FilePlus");
export const FileText = wrap(PhFileText, "FileText");
export const Folder = wrap(PhFolder, "Folder");
export const FolderTree = wrap(PhTreeStructure, "FolderTree");
export const Globe = wrap(PhGlobe, "Globe");
export const HardDrive = wrap(PhHardDrive, "HardDrive");
export const Info = wrap(PhInfo, "Info");
export const Message = wrap(PhChatCentered, "Message");
export const MessageCircle = wrap(PhChatCircle, "MessageCircle");
export const MessagesSquare = wrap(PhChats, "MessagesSquare");
export const Moon = wrap(PhMoon, "Moon");
export const Monitor = wrap(PhMonitor, "Monitor");
export const MoreHorizontal = wrap(PhDotsThree, "MoreHorizontal");
export const Pencil = wrap(PhPencilSimple, "Pencil");
export const Question = wrap(PhQuestion, "Question");
export const Plus = wrap(PhPlus, "Plus");
export const Search = wrap(PhMagnifyingGlass, "Search");
export const Settings = wrap(PhGearSix, "Settings");
export const Sidebar = wrap(PhSidebarSimple, "Sidebar");
export const Sparkles = wrap(PhSparkle, "Sparkles");
export const Sun = wrap(PhSun, "Sun");
export const Terminal = wrap(PhTerminal, "Terminal");
export const Trash2 = wrap(PhTrash, "Trash2");
export const TriangleAlert = wrap(PhWarning, "TriangleAlert");
export const Wand2 = wrap(PhMagicWand, "Wand2");
export const Wrench = wrap(PhWrench, "Wrench");
export const X = wrap(PhX, "X");
