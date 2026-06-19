"use client";

import type {
  EditorObject,
  EditorObjectBox,
} from "../../hooks/useEditor";
import { ImageTool } from "./ImageTool";

type StampToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

export function StampTool(props: StampToolProps) {
  return <ImageTool {...props} />;
}
