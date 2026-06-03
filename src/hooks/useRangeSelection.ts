"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";

type PageClickEvent =
  | ReactMouseEvent<HTMLElement>
  | {
      shiftKey?: boolean;
      ctrlKey?: boolean;
      metaKey?: boolean;
    };

type UseRangeSelectionOptions = {
  maxHistory?: number;
};

function normalizePages(pages: number[]) {
  return Array.from(new Set(pages))
    .filter((pageNumber) => Number.isInteger(pageNumber) && pageNumber > 0)
    .sort((a, b) => a - b);
}

function createPageRange(start: number, end: number) {
  const rangeStart = Math.min(start, end);
  const rangeEnd = Math.max(start, end);

  return Array.from({ length: rangeEnd - rangeStart + 1 }, (_, index) => rangeStart + index);
}

function arePageListsEqual(first: number[], second: number[]) {
  if (first.length !== second.length) return false;

  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) return false;
  }

  return true;
}

function validateMaxPage(max: number) {
  return Number.isInteger(max) && max > 0;
}

function parsePageRangeInput(input: string, max: number) {
  const trimmedInput = input.trim();

  if (!validateMaxPage(max)) {
    throw new Error("Upload a PDF first.");
  }

  if (!trimmedInput) {
    throw new Error("Enter page ranges like 1-5, 10, 15-20.");
  }

  const parts = trimmedInput.split(",");
  const pages: number[] = [];

  for (const rawPart of parts) {
    const part = rawPart.trim();

    if (!part) {
      throw new Error("Invalid range format. Use values like 1-5, 10, 15-20.");
    }

    if (part.includes("-")) {
      const [rawStart, rawEnd, extra] = part.split("-");

      if (extra !== undefined || !rawStart?.trim() || !rawEnd?.trim()) {
        throw new Error("Invalid range format. Use values like 1-5, 10, 15-20.");
      }

      const start = Number(rawStart.trim());
      const end = Number(rawEnd.trim());

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error("Page ranges must contain whole numbers only.");
      }

      if (start < 1 || end < 1 || start > max || end > max) {
        throw new Error(`Page range must be between 1 and ${max}.`);
      }

      if (start > end) {
        throw new Error("Range start cannot be greater than range end.");
      }

      pages.push(...createPageRange(start, end));
    } else {
      const pageNumber = Number(part);

      if (!Number.isInteger(pageNumber)) {
        throw new Error("Page numbers must be whole numbers only.");
      }

      if (pageNumber < 1 || pageNumber > max) {
        throw new Error(`Page number must be between 1 and ${max}.`);
      }

      pages.push(pageNumber);
    }
  }

  return normalizePages(pages);
}

export function useRangeSelection(options: UseRangeSelectionOptions = {}) {
  const maxHistory = options.maxHistory ?? 10;

  const lastClickedRef = useRef<number | null>(null);

  const [selected, setSelected] = useState<number[]>([]);
  const [history, setHistory] = useState<number[][]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const canUndo = history.length > 0;

  const pushSelection = useCallback(
    (nextPages: number[], shouldTrackHistory = true) => {
      setSelected((current) => {
        const normalizedCurrent = normalizePages(current);
        const normalizedNext = normalizePages(nextPages);

        if (arePageListsEqual(normalizedCurrent, normalizedNext)) {
          return current;
        }

        if (shouldTrackHistory) {
          setHistory((currentHistory) => [
            ...currentHistory.slice(-(maxHistory - 1)),
            normalizedCurrent,
          ]);
        }

        return normalizedNext;
      });

      setLastError(null);
    },
    [maxHistory],
  );

  const isSelected = useCallback(
    (pageNumber: number) => selectedSet.has(pageNumber),
    [selectedSet],
  );

  const togglePage = useCallback(
    (pageNumber: number, event?: PageClickEvent) => {
      if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        setLastError("Invalid page number.");
        return;
      }

      const isShiftClick = Boolean(event?.shiftKey);
      const isCtrlOrCmdClick = Boolean(event?.ctrlKey || event?.metaKey);

      if (isShiftClick && lastClickedRef.current !== null) {
        const rangePages = createPageRange(lastClickedRef.current, pageNumber);

        pushSelection([...selected, ...rangePages]);
        lastClickedRef.current = pageNumber;
        return;
      }

      if (isCtrlOrCmdClick) {
        const nextPages = selectedSet.has(pageNumber)
          ? selected.filter((selectedPage) => selectedPage !== pageNumber)
          : [...selected, pageNumber];

        pushSelection(nextPages);
        lastClickedRef.current = pageNumber;
        return;
      }

      const nextPages = selectedSet.has(pageNumber)
        ? selected.filter((selectedPage) => selectedPage !== pageNumber)
        : [...selected, pageNumber];

      pushSelection(nextPages);
      lastClickedRef.current = pageNumber;
    },
    [pushSelection, selected, selectedSet],
  );

  const selectRange = useCallback(
    (start: number, end: number) => {
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) {
        setLastError("Page range must contain valid page numbers.");
        return;
      }

      const rangePages = createPageRange(start, end);
      pushSelection([...selected, ...rangePages]);
      lastClickedRef.current = end;
    },
    [pushSelection, selected],
  );

  const selectAll = useCallback(
    (max: number) => {
      if (!validateMaxPage(max)) {
        setLastError("Upload a PDF first.");
        return;
      }

      pushSelection(createPageRange(1, max));
      lastClickedRef.current = max;
    },
    [pushSelection],
  );

  const selectOdd = useCallback(
    (max: number) => {
      if (!validateMaxPage(max)) {
        setLastError("Upload a PDF first.");
        return;
      }

      const oddPages = createPageRange(1, max).filter((pageNumber) => pageNumber % 2 === 1);

      pushSelection(oddPages);
      lastClickedRef.current = oddPages.at(-1) ?? null;
    },
    [pushSelection],
  );

  const selectEven = useCallback(
    (max: number) => {
      if (!validateMaxPage(max)) {
        setLastError("Upload a PDF first.");
        return;
      }

      const evenPages = createPageRange(1, max).filter((pageNumber) => pageNumber % 2 === 0);

      pushSelection(evenPages);
      lastClickedRef.current = evenPages.at(-1) ?? null;
    },
    [pushSelection],
  );

  const invertSelection = useCallback(
    (max: number) => {
      if (!validateMaxPage(max)) {
        setLastError("Upload a PDF first.");
        return;
      }

      const invertedPages = createPageRange(1, max).filter(
        (pageNumber) => !selectedSet.has(pageNumber),
      );

      pushSelection(invertedPages);
      lastClickedRef.current = invertedPages.at(-1) ?? null;
    },
    [pushSelection, selectedSet],
  );

  const clearSelection = useCallback(() => {
    pushSelection([]);
    lastClickedRef.current = null;
  }, [pushSelection]);

  const applyRangeInput = useCallback(
    (input: string, max: number) => {
      try {
        const parsedPages = parsePageRangeInput(input, max);

        pushSelection(parsedPages);
        lastClickedRef.current = parsedPages.at(-1) ?? null;
        setLastError(null);

        return true;
      } catch (error) {
        setLastError(error instanceof Error ? error.message : "Invalid range input.");
        return false;
      }
    },
    [pushSelection],
  );

  const undoSelection = useCallback(() => {
    setHistory((currentHistory) => {
      if (currentHistory.length === 0) return currentHistory;

      const previousSelection = currentHistory[currentHistory.length - 1];

      setSelected(previousSelection);
      setLastError(null);
      lastClickedRef.current = previousSelection.at(-1) ?? null;

      return currentHistory.slice(0, -1);
    });
  }, []);

  const resetSelection = useCallback(() => {
    setSelected([]);
    setHistory([]);
    setLastError(null);
    lastClickedRef.current = null;
  }, []);

  return {
    selected,
    selectedSet,
    isSelected,
    togglePage,
    selectRange,
    selectAll,
    selectOdd,
    selectEven,
    invertSelection,
    clearSelection,
    applyRangeInput,
    undoSelection,
    resetSelection,
    canUndo,
    lastError,
  };
}
