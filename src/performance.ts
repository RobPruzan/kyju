import { BoundedArray } from "./performance-utils";
import {
  Fiber,
  getDisplayName,
  getTimings,
  isHostFiber,
  traverseFiber,
} from "bippy";
import { not_globally_unique_generateId } from "./utils";
import { performanceEntryChannels } from "./performance-store";

export type PerformanceEntryChannelEvent =
  | {
      kind: "entry-received";
      entry: PerformanceInteraction;
    }
  | {
      kind: "auto-complete-race";
      interactionUUID: string;
      detailedTiming: TimeoutStage;
    };
type InteractionStartStage = {
  kind: "interaction-start";
  interactionType: "pointer" | "keyboard";
  interactionUUID: string;
  interactionStartDetail: number;
  blockingTimeStart: number;
  componentPath: Array<string>;
  componentName: string;
};

type JSEndStage = Omit<InteractionStartStage, "kind"> & {
  kind: "js-end-stage";
  jsEndDetail: number;
};

type RAFStage = Omit<JSEndStage, "kind"> & {
  kind: "raf-stage";
  rafStart: number;
};

export type TimeoutStage = Omit<RAFStage, "kind"> & {
  kind: "timeout-stage";
  commitEnd: number;
  blockingTimeEnd: number;
};

export interface PerformanceInteraction {
  id: string;
  latency: number;
  entries: Array<PerformanceInteractionEntry>;
  target: Element | null;
  type: "pointer" | "keyboard";
  startTime: number;
  endTime: number;
  processingStart: number;
  processingEnd: number;
  duration: number;
  inputDelay: number;
  processingDuration: number;
  presentationDelay: number;
  timestamp: number;
  timeSinceTabInactive: number | "never-hidden";
  visibilityState: DocumentVisibilityState;
  timeOrigin: number;
  referrer: string;
  detailedTiming?: {
    jsHandlersTime: number; // pointerup -> click
    prePaintTime: number; // click -> RAF
    paintTime: number; // RAF -> setTimeout
    compositorTime: number; // remaining duration
  };
}

export interface PerformanceInteractionEntry extends PerformanceEntry {
  interactionId: string;
  target: Element;
  name: string;
  duration: number;
  startTime: number;
  processingStart: number;
  processingEnd: number;
  entryType: string;
}
type Task = {
  completeInteraction: (
    entry: PerformanceEntryChannelEvent
  ) => CompletedInteraction;
  startDateTime: number;
  endDateTime: number;
  type: "keyboard" | "pointer";
  interactionUUID: string;
};
export type CompletedInteraction = {
  detailedTiming: TimeoutStage;
  latency: number;
  completedAt: number;
  flushNeeded: boolean;
};

export const MAX_INTERACTION_TASKS = 25;

const THROW_INVARIANTS = false;

export const invariantError = (message: string | undefined) => {
  if (THROW_INVARIANTS) {
    throw new Error(message);
  }
};

let tasks = new BoundedArray<Task>(MAX_INTERACTION_TASKS);
type UnInitializedStage = {
  kind: "uninitialized-stage";
  // todo: no longer a uuid
  interactionUUID: string;
  interactionType: "pointer" | "keyboard";
};

const getFirstNameFromAncestor = (
  fiber: Fiber,
  accept: (name: string) => boolean = () => true
) => {
  let curr: Fiber | null = fiber;

  while (curr) {
    const currName = getDisplayName(curr.type);
    if (currName && accept(currName)) {
      return currName;
    }

    curr = curr.return;
  }
  return null;
};
type LastInteractionRef = {
  current: (
    | InteractionStartStage
    | JSEndStage
    | RAFStage
    | TimeoutStage
    | UnInitializedStage
  ) & { stageStart: number };
};
interface ReactRootContainer {
  _reactRootContainer?: {
    _internalRoot?: {
      current?: {
        child: Fiber;
      };
    };
  };
}

export const getFiberFromElement = (element: Element): Fiber | null => {
  if ("__REACT_DEVTOOLS_GLOBAL_HOOK__" in window) {
    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook?.renderers) return null;

    for (const [, renderer] of Array.from(hook.renderers)) {
      try {
        const fiber = renderer.findFiberByHostInstance?.(element);
        if (fiber) return fiber;
      } catch {
        // If React is mid-render, references to previous nodes may disappear
      }
    }
  }

  if ("_reactRootContainer" in element) {
    const elementWithRoot = element as unknown as ReactRootContainer;
    const rootContainer = elementWithRoot._reactRootContainer;
    return rootContainer?._internalRoot?.current?.child ?? null;
  }

  for (const key in element) {
    if (
      key.startsWith("__reactInternalInstance$") ||
      key.startsWith("__reactFiber")
    ) {
      const elementWithFiber = element as unknown as ReactInternalProps;
      return elementWithFiber[key];
    }
  }
  return null;
};

interface ReactInternalProps {
  [key: string]: Fiber;
}

const getTargetInteractionDetails = (target: Element) => {
  const associatedFiber = getFiberFromElement(target);
  if (!associatedFiber) {
    return;
  }

  // TODO: if element is minified, squash upwards till first non minified ancestor, and set name as ChildOf(<parent-name>)
  let componentName = associatedFiber
    ? getDisplayName(associatedFiber?.type)
    : "N/A";

  if (!componentName) {
    componentName =
      getFirstNameFromAncestor(associatedFiber, (name) => name.length > 2) ??
      "N/A";
  }

  if (!componentName) {
    return;
  }

  const componentPath = getInteractionPath(associatedFiber);

  // const childrenTree = collectFiberSubtree(associatedFiber, 20); // this can be expensive if not limited

  // const firstChildSvg = Object.entries(childrenTree).find(([name, {isSvg  }]) => isSvg)

  // const firstSvg =
  //   associatedFiber.type === "svg"
  //     ? getFirstNameFromAncestor(associatedFiber)
  //     : Object.entries(childrenTree).find(([name, {isSvg  }]) => isSvg)

  // lowkey i have an idea
  return {
    componentPath,
    childrenTree: {},
    componentName,
  };
};

interface PathFilters {
  skipProviders: boolean;
  skipHocs: boolean;
  skipContainers: boolean;
  skipMinified: boolean;
  skipUtilities: boolean;
  skipBoundaries: boolean;
}

const DEFAULT_FILTERS: PathFilters = {
  skipProviders: true,
  skipHocs: true,
  skipContainers: true,
  skipMinified: true,
  skipUtilities: true,
  skipBoundaries: true,
};

const FILTER_PATTERNS = {
  providers: [/Provider$/, /^Provider$/, /^Context$/],
  hocs: [/^with[A-Z]/, /^forward(?:Ref)?$/i, /^Forward(?:Ref)?\(/],
  containers: [/^(?:App)?Container$/, /^Root$/, /^ReactDev/],
  utilities: [
    /^Fragment$/,
    /^Suspense$/,
    /^ErrorBoundary$/,
    /^Portal$/,
    /^Consumer$/,
    /^Layout$/,
    /^Router/,
    /^Hydration/,
  ],
  boundaries: [/^Boundary$/, /Boundary$/, /^Provider$/, /Provider$/],
};

const shouldIncludeInPath = (
  name: string,
  filters: PathFilters = DEFAULT_FILTERS
): boolean => {
  const patternsToCheck: Array<RegExp> = [];
  if (filters.skipProviders) patternsToCheck.push(...FILTER_PATTERNS.providers);
  if (filters.skipHocs) patternsToCheck.push(...FILTER_PATTERNS.hocs);
  if (filters.skipContainers)
    patternsToCheck.push(...FILTER_PATTERNS.containers);
  if (filters.skipUtilities) patternsToCheck.push(...FILTER_PATTERNS.utilities);
  if (filters.skipBoundaries)
    patternsToCheck.push(...FILTER_PATTERNS.boundaries);
  return !patternsToCheck.some((pattern) => pattern.test(name));
};

const minifiedPatterns = [
  /^[a-z]$/, // Single lowercase letter
  /^[a-z][0-9]$/, // Lowercase letter followed by number
  /^_+$/, // Just underscores
  /^[A-Za-z][_$]$/, // Letter followed by underscore or dollar
  /^[a-z]{1,2}$/, // 1-2 lowercase letters
];

const isMinified = (name: string): boolean => {
  for (let i = 0; i < minifiedPatterns.length; i++) {
    if (minifiedPatterns[i].test(name)) return true;
  }

  const hasNoVowels = !/[aeiou]/i.test(name);
  const hasMostlyNumbers = (name.match(/\d/g)?.length ?? 0) > name.length / 2;
  const isSingleWordLowerCase = /^[a-z]+$/.test(name);
  const hasRandomLookingChars = /[$_]{2,}/.test(name);

  // If more than 2 of the following are true, we consider the name minified
  return (
    Number(hasNoVowels) +
      Number(hasMostlyNumbers) +
      Number(isSingleWordLowerCase) +
      Number(hasRandomLookingChars) >=
    2
  );
};

interface FiberType {
  displayName?: string;
  name?: string;
  [key: string]: unknown;
}

const getCleanComponentName = (component: FiberType): string => {
  const name = getDisplayName(component);
  if (!name) return "";

  return name.replace(
    /^(?:Memo|Forward(?:Ref)?|With.*?)\((?<inner>.*?)\)$/,
    "$<inner>"
  );
};
export const getInteractionPath = (
  initialFiber: Fiber | null,
  filters: PathFilters = DEFAULT_FILTERS
): Array<string> => {
  if (!initialFiber) return [];

  const currentName = getDisplayName(initialFiber.type);
  if (!currentName) return [];

  const stack = new Array<string>();
  let fiber = initialFiber;
  while (fiber.return) {
    const name = getCleanComponentName(fiber.type);
    if (
      name &&
      !isMinified(name) &&
      shouldIncludeInPath(name, filters) &&
      name.toLowerCase() !== name
    ) {
      stack.push(name);
    }
    fiber = fiber.return;
  }
  const fullPath = new Array<string>(stack.length);
  for (let i = 0; i < stack.length; i++) {
    fullPath[i] = stack[stack.length - i - 1];
  }
  return fullPath;
};

const isPerformanceEventAvailable = () => {
  return "PerformanceEventTiming" in globalThis;
};

type ShouldContinue = boolean;
const trackDetailedTiming = ({
  onMicroTask,
  onRAF,
  onTimeout,
  abort,
}: {
  onMicroTask: () => ShouldContinue;
  onRAF: () => ShouldContinue;
  onTimeout: () => void;
  abort?: () => boolean;
}) => {
  queueMicrotask(() => {
    if (abort?.() === true) {
      return;
    }

    if (!onMicroTask()) {
      return;
    }
    requestAnimationFrame(() => {
      if (abort?.() === true) {
        return;
      }
      if (!onRAF()) {
        return;
      }
      setTimeout(() => {
        if (abort?.() === true) {
          return;
        }
        onTimeout();
      }, 0);
    });
  });
};

export const setupDetailedPointerTimingListener = (
  kind: "pointer" | "keyboard",
  options: {
    onStart?: (interactionUUID: string) => void;
    onComplete?: (
      interactionUUID: string,
      finalInteraction: {
        detailedTiming: TimeoutStage;
        latency: number;
        completedAt: number;
        flushNeeded: boolean;
      },
      entry: PerformanceEntryChannelEvent
    ) => void;
    onError?: (interactionUUID: string) => void;
  }
) => {
  let instrumentationIdInControl: string | null = null;

  const getEvent = (
    info: { phase: "start" } | { phase: "end"; target: Element }
  ) => {
    switch (kind) {
      case "pointer": {
        if (info.phase === "start") {
          return "pointerup";
        }
        if (
          info.target instanceof HTMLInputElement ||
          info.target instanceof HTMLSelectElement
        ) {
          return "change";
        }
        return "click";
      }
      case "keyboard": {
        if (info.phase === "start") {
          return "keydown";
        }

        return "change";
      }
    }
  };

  const lastInteractionRef: LastInteractionRef = {
    current: {
      kind: "uninitialized-stage",
      interactionUUID: not_globally_unique_generateId(), // the first interaction uses this
      stageStart: Date.now(),
      interactionType: kind,
    },
  };

  const onInteractionStart = (e: Event) => {
    const path = e.composedPath();
    if (
      path.some(
        (el) => el instanceof Element && el.id === "react-scan-toolbar-root"
      )
    ) {
      return;
    }
    if (Date.now() - lastInteractionRef.current.stageStart > 2000) {
      lastInteractionRef.current = {
        kind: "uninitialized-stage",
        interactionUUID: not_globally_unique_generateId(),
        stageStart: Date.now(),
        interactionType: kind,
      };
    }

    if (lastInteractionRef.current.kind !== "uninitialized-stage") {
      return;
    }

    const pointerUpStart = performance.now();

    options?.onStart?.(lastInteractionRef.current.interactionUUID);
    const details = getTargetInteractionDetails(e.target as HTMLElement);

    if (!details) {
      options?.onError?.(lastInteractionRef.current.interactionUUID);
      return;
    }

    lastInteractionRef.current = {
      ...lastInteractionRef.current,
      interactionType: kind,
      blockingTimeStart: Date.now(),
      componentName: details.componentName,
      componentPath: details.componentPath,
      kind: "interaction-start",
      interactionStartDetail: pointerUpStart,
    };

    const event = getEvent({ phase: "end", target: e.target as Element });
    // biome-ignore lint/suspicious/noExplicitAny: shut up biome
    document.addEventListener(event, onLastJS as any, {
      once: true,
    });

    // this is an edge case where a click event is not fired after a pointerdown
    // im not sure why this happens, but it seems to only happen on non intractable elements
    // it causes the event handler to stay alive until a future interaction, which can break timing (looks super long)
    // or invariants (the start metadata was removed, so now its an end metadata with no start)
    requestAnimationFrame(() => {
      // biome-ignore lint/suspicious/noExplicitAny: shut up biome
      document.removeEventListener(event as any, onLastJS as any);
    });
  };

  document.addEventListener(
    getEvent({ phase: "start" }),
    // biome-ignore lint/suspicious/noExplicitAny: shut up biome
    onInteractionStart as any,
    {
      capture: true,
    }
  );

  /**
   *
   * TODO: IF WE DETECT RENDERS DURING THIS PERIOD WE CAN INCLUDE THAT IN THE RESULT AND THEN BACK THAT OUT OF COMPUTED STYLE TIME AND ADD IT BACK INTO JS TIME
   */
  const onLastJS = (
    e: { target: Element },
    instrumentationId: string,
    abort: () => boolean
  ) => {
    if (
      lastInteractionRef.current.kind !== "interaction-start" &&
      instrumentationId === instrumentationIdInControl
    ) {
      if (kind === "pointer" && e.target instanceof HTMLSelectElement) {
        lastInteractionRef.current = {
          kind: "uninitialized-stage",
          interactionUUID: not_globally_unique_generateId(),
          stageStart: Date.now(),
          interactionType: kind,
        };
        return;
      }

      options?.onError?.(lastInteractionRef.current.interactionUUID);
      lastInteractionRef.current = {
        kind: "uninitialized-stage",
        interactionUUID: not_globally_unique_generateId(),
        stageStart: Date.now(),
        interactionType: kind,
      };
      invariantError("pointer -> click");
      return;
    }

    instrumentationIdInControl = instrumentationId;

    trackDetailedTiming({
      abort,
      onMicroTask: () => {
        if (lastInteractionRef.current.kind === "uninitialized-stage") {
          return false;
        }

        lastInteractionRef.current = {
          ...lastInteractionRef.current,
          kind: "js-end-stage",
          jsEndDetail: performance.now(),
        };
        return true;
      },
      onRAF: () => {
        if (
          lastInteractionRef.current.kind !== "js-end-stage" &&
          lastInteractionRef.current.kind !== "raf-stage"
        ) {
          options?.onError?.(lastInteractionRef.current.interactionUUID);
          invariantError("bad transition to raf");
          lastInteractionRef.current = {
            kind: "uninitialized-stage",
            interactionUUID: not_globally_unique_generateId(),
            stageStart: Date.now(),
            interactionType: kind,
          };
          return false;
        }

        lastInteractionRef.current = {
          ...lastInteractionRef.current,
          kind: "raf-stage",
          rafStart: performance.now(),
        };

        return true;
      },
      onTimeout: () => {
        if (lastInteractionRef.current.kind !== "raf-stage") {
          options?.onError?.(lastInteractionRef.current.interactionUUID);
          lastInteractionRef.current = {
            kind: "uninitialized-stage",
            interactionUUID: not_globally_unique_generateId(),
            stageStart: Date.now(),
            interactionType: kind,
          };
          invariantError("raf->timeout");
          return;
        }
        const now = Date.now();
        const timeoutStage: TimeoutStage = Object.freeze({
          ...lastInteractionRef.current,
          kind: "timeout-stage",
          blockingTimeEnd: now,
          commitEnd: performance.now(),
        });

        lastInteractionRef.current = {
          kind: "uninitialized-stage",
          interactionUUID: not_globally_unique_generateId(),
          stageStart: now,
          interactionType: kind,
        };
        let completed = false;
        const completeInteraction = (event: PerformanceEntryChannelEvent) => {
          completed = true;

          const latency =
            event.kind === "auto-complete-race"
              ? event.detailedTiming.commitEnd -
                event.detailedTiming.interactionStartDetail
              : event.entry.latency;
          const finalInteraction = {
            detailedTiming: timeoutStage,
            latency,
            completedAt: Date.now(),
            flushNeeded: true,
          };

          options?.onComplete?.(
            timeoutStage.interactionUUID,
            finalInteraction,
            event
          );
          const newTasks = tasks.filter(
            (task) => task.interactionUUID !== timeoutStage.interactionUUID
          );
          tasks = BoundedArray.fromArray(newTasks, MAX_INTERACTION_TASKS);

          return finalInteraction;
        };

        const task = {
          completeInteraction,
          endDateTime: Date.now(),
          startDateTime: timeoutStage.blockingTimeStart,
          type: kind,
          interactionUUID: timeoutStage.interactionUUID,
        };
        tasks.push(task);

        // console.log('completed task', task);

        if (!isPerformanceEventAvailable()) {
          const newTasks = tasks.filter(
            (task) => task.interactionUUID !== timeoutStage.interactionUUID
          );
          tasks = BoundedArray.fromArray(newTasks, MAX_INTERACTION_TASKS);
          completeInteraction({
            kind: "auto-complete-race",
            // redundant
            detailedTiming: timeoutStage,
            interactionUUID: timeoutStage.interactionUUID,
          });
        } else {
          setTimeout(() => {
            if (completed) {
              return;
            }
            completeInteraction({
              kind: "auto-complete-race",
              // redundant
              detailedTiming: timeoutStage,
              interactionUUID: timeoutStage.interactionUUID,
            });
            const newTasks = tasks.filter(
              (task) => task.interactionUUID !== timeoutStage.interactionUUID
            );
            tasks = BoundedArray.fromArray(newTasks, MAX_INTERACTION_TASKS);
            // this means the max frame presentation delta we can observe is 300ms, but this should catch >99% of cases, the trade off is to not accidentally miss slowdowns if the user quickly clicked something else while this race was happening
          }, 1000);
        }
      },
    });
  };

  const onKeyPress = (e: { target: Element }) => {
    const id = not_globally_unique_generateId();
    onLastJS(e, id, () => id !== instrumentationIdInControl);
  };

  if (kind === "keyboard") {
    // biome-ignore lint/suspicious/noExplicitAny: shut up biome
    document.addEventListener("keypress", onKeyPress as any);
  }

  return () => {
    document.removeEventListener(
      getEvent({ phase: "start" }),
      // biome-ignore lint/suspicious/noExplicitAny: shut up biome
      onInteractionStart as any,
      {
        capture: true,
      }
    );
    // biome-ignore lint/suspicious/noExplicitAny: shut up biome
    document.removeEventListener("keypress", onKeyPress as any);
  };
};


const getAssociatedDetailedTimingInteraction = (
  entry: PerformanceInteraction,
  activeTasks: Array<Task>
) => {
  let closestTask: Task | null = null;
  for (const task of activeTasks) {
    if (task.type !== entry.type) {
      continue;
    }

    if (closestTask === null) {
      closestTask = task;
      continue;
    }

    const getAbsoluteDiff = (task: Task, entry: PerformanceInteraction) =>
      Math.abs(task.startDateTime) - (entry.startTime + entry.timeOrigin);

    if (getAbsoluteDiff(task, entry) < getAbsoluteDiff(closestTask, entry)) {
      closestTask = task;
    }
  }

  return closestTask;
};


export const listenForPerformanceEntryInteractions = (
  onComplete: (completedInteraction: CompletedInteraction) => void
) => {
  // we make the assumption that the detailed timing will be ready before the performance timing
  const unsubscribe = performanceEntryChannels.subscribe(
    "recording",
    (event) => {
      const associatedDetailedInteraction =
        event.kind === "auto-complete-race"
          ? tasks.find((task) => task.interactionUUID === event.interactionUUID)
          : getAssociatedDetailedTimingInteraction(event.entry, tasks);

      // REMINDME: this likely means we clicked a non interactable thing but our handler still ran
      // so we shouldn't treat this as an invariant, but instead use it to verify if we clicked
      // something interactable
      if (!associatedDetailedInteraction) {
        return;
      }

      const completedInteraction =
        associatedDetailedInteraction.completeInteraction(event);
      onComplete(completedInteraction);
    }
  );

  return unsubscribe;
};