import type { EditorToolbarItemId } from "./editor-tool-registry";

export type EditorAnalyticsEvent =
  | {
      readonly type: "tool_selected" | "tool_placement_started" | "tool_placement_completed";
      readonly toolId: EditorToolbarItemId;
      readonly pageNumber?: number;
    }
  | {
      readonly type: "tool_error";
      readonly toolId: EditorToolbarItemId;
      readonly errorCode: string;
    }
  | {
      readonly type: "ocr_started" | "ocr_completed" | "ocr_cancelled";
      readonly scope: "current" | "all";
      readonly pageCount: number;
    }
  | {
      readonly type: "find_performed";
      readonly resultCount: number;
      readonly includedOcr: boolean;
    }
  | {
      readonly type: "translate_attempted";
      readonly mode: "selection" | "page";
      readonly configured: boolean;
    }
  | {
      readonly type: "page_added";
      readonly pageNumber: number;
      readonly size: "a4" | "letter" | "same";
    }
  | {
      readonly type: "pages_reordered";
      readonly pageCount: number;
    }
  | {
      readonly type: "page_rotated";
      readonly pageNumber: number;
      readonly direction: "clockwise" | "counter-clockwise";
    }
  | {
      readonly type: "pages_numbered";
      readonly pageCount: number;
    }
  | {
      readonly type: "export_started" | "export_completed" | "export_failed";
      readonly pageCount: number;
      readonly objectCount: number;
    };

export type EditorAnalyticsAdapter = {
  readonly track: (event: EditorAnalyticsEvent) => void;
};

const noOpAdapter: EditorAnalyticsAdapter = {
  track() {
    // Intentionally empty until a privacy-reviewed analytics provider is connected.
  },
};

let activeAdapter: EditorAnalyticsAdapter = noOpAdapter;

export function setEditorAnalyticsAdapter(adapter: EditorAnalyticsAdapter | null) {
  activeAdapter = adapter ?? noOpAdapter;
}

export function trackEditorEvent(event: EditorAnalyticsEvent) {
  activeAdapter.track(event);
}
