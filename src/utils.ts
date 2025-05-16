import { createStore } from "./create-store";
import { interactionStore, MAX_INTERACTION_BATCH } from "./interaction-store";
import {
  listenForPerformanceEntryInteractions,
  PerformanceEntryChannelEvent,
  PerformanceInteraction,
  PerformanceInteractionEntry,
  setupDetailedPointerTimingListener,
  TimeoutStage,
} from "./performance";
import {
  MAX_CHANNEL_SIZE,
  performanceEntryChannels,
} from "./performance-store";
import { BoundedArray } from "./performance-utils";
/**
 * we just need to extract the part that lets us track interactions and then
 * show them here
 *
 *
 * we can even do the frame things
 *
 * then network things
 */
let unsubscribeTrackVisibilityChange: (() => void) | undefined;
let lastVisibilityHiddenAt: number | "never-hidden" = "never-hidden";

const trackVisibilityChange = () => {
  unsubscribeTrackVisibilityChange?.();
  const onVisibilityChange = () => {
    if (document.hidden) {
      lastVisibilityHiddenAt = Date.now();
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  unsubscribeTrackVisibilityChange = () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
};

const getInteractionType = (
  eventName: string
): "pointer" | "keyboard" | null => {
  // todo: track pointer down, but tends to not house expensive logic so not very high priority
  if (["pointerup", "click"].includes(eventName)) {
    return "pointer";
  }
  if (eventName.includes("key")) {
  }
  if (["keydown", "keyup"].includes(eventName)) {
    return "keyboard";
  }
  return null;
};

let onEntryAnimationId: number | null = null;

const setupPerformanceListener = (
  onEntry: (interaction: PerformanceInteraction) => void
) => {
  trackVisibilityChange();
  const interactionMap = new Map<string, PerformanceInteraction>();
  const interactionTargetMap = new Map<string, Element>();

  const processInteractionEntry = (entry: PerformanceInteractionEntry) => {
    if (!entry.interactionId) return;

    if (
      entry.interactionId &&
      entry.target &&
      !interactionTargetMap.has(entry.interactionId)
    ) {
      interactionTargetMap.set(entry.interactionId, entry.target);
    }
    if (entry.target) {
      let current: Element | null = entry.target;
      while (current) {
        if (
          current.id === "react-scan-toolbar-root" ||
          current.id === "react-scan-root"
        ) {
          return;
        }
        current = current.parentElement;
      }
    }

    const existingInteraction = interactionMap.get(entry.interactionId);

    if (existingInteraction) {
      if (entry.duration > existingInteraction.latency) {
        existingInteraction.entries = [entry];
        existingInteraction.latency = entry.duration;
      } else if (
        entry.duration === existingInteraction.latency &&
        entry.startTime === existingInteraction.entries[0].startTime
      ) {
        existingInteraction.entries.push(entry);
      }
    } else {
      const interactionType = getInteractionType(entry.name);
      if (!interactionType) {
        return;
      }

      const interaction: PerformanceInteraction = {
        id: entry.interactionId,
        latency: entry.duration,
        entries: [entry],
        target: entry.target,
        type: interactionType,
        startTime: entry.startTime,
        endTime: Date.now(),
        processingStart: entry.processingStart,
        processingEnd: entry.processingEnd,
        duration: entry.duration,
        inputDelay: entry.processingStart - entry.startTime,
        processingDuration: entry.processingEnd - entry.processingStart,
        presentationDelay:
          entry.duration - (entry.processingEnd - entry.startTime),
        // componentPath:
        timestamp: Date.now(),
        timeSinceTabInactive:
          lastVisibilityHiddenAt === "never-hidden"
            ? "never-hidden"
            : Date.now() - lastVisibilityHiddenAt,
        visibilityState: document.visibilityState,
        timeOrigin: performance.timeOrigin,
        referrer: document.referrer,
      };
      //
      interactionMap.set(interaction.id, interaction);

      /**
       * This seems odd, but it gives us determinism that we will receive an entry AFTER our detailed timing collection
       * runs because browser semantics (raf(() => setTimeout) will always run before a doubleRaf)
       *
       * this also handles the case where multiple entries are dispatched for semantically the same interaction,
       * they will get merged into a single interaction, where the largest latency is recorded, which is what
       * we are interested in this application
       */

      if (!onEntryAnimationId) {
        onEntryAnimationId = requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // biome-ignore lint/style/noNonNullAssertion: invariant
            onEntry(interactionMap.get(interaction.id)!);
            onEntryAnimationId = null;
          });
        });
      }
    }
  };

  const po = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    for (let i = 0, len = entries.length; i < len; i++) {
      const entry = entries[i];
      processInteractionEntry(entry as PerformanceInteractionEntry);
    }
  });

  try {
    po.observe({
      type: "event",
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
    po.observe({
      type: "first-input",
      buffered: true,
    });
  } catch {
    /* Should collect error logs*/
  }

  return () => po.disconnect();
};

export const setupPerformancePublisher = () => {
  return setupPerformanceListener((entry) => {
    performanceEntryChannels.publish(
      {
        kind: "entry-received",
        entry,
      },
      "recording"
    );
  });
};
let taskDirtyAt: null | number = null;
let taskDirtyOrigin: null | number = null;

let previousTrackCurrentMouseOverElementCallback:
  | ((e: MouseEvent) => void)
  | null = null;

let overToolbar: boolean | null;

const trackCurrentMouseOverToolbar = (toolbarId?: string) => {
  const callback = (e: MouseEvent) => {
    overToolbar = e
      .composedPath()
      .map((path) => (path as Element).id)
      .filter(Boolean)
      .includes(toolbarId);
  };

  document.addEventListener("mouseover", callback);
  previousTrackCurrentMouseOverElementCallback = callback;

  return () => {
    if (previousTrackCurrentMouseOverElementCallback) {
      document.removeEventListener(
        "mouseover",
        previousTrackCurrentMouseOverElementCallback
      );
    }
  };
};

type ToolbarEventStoreState = {
  state: {
    events: Array<SlowdownEvent>;
  };
  actions: {
    addEvent: (event: SlowdownEvent) => void;
    addListener: (listener: (event: SlowdownEvent) => void) => () => void;
    clear: () => void;
  };
};
export const toolbarEventStore = createStore<ToolbarEventStoreState>()(
  (set, get) => {
    const listeners = new Set<(event: SlowdownEvent) => void>();

    return {
      state: {
        events: [],
      },

      actions: {
        addEvent: (event: SlowdownEvent) => {
          listeners.forEach((listener) => listener(event));

          const events = [...get().state.events, event];
          const applyOverlapCheckToLongRenderEvent = (
            longRenderEvent: LongRenderPipeline & { id: string },
            onOverlap: (overlapsWith: InteractionEvent & { id: string }) => void
          ) => {
            const overlapsWith = events.find((event) => {
              if (event.kind === "long-render") {
                return;
              }

              if (event.id === longRenderEvent.id) {
                return;
              }

              /**
               * |---x-----------x------ (interaction)
               * |x-----------x          (long-render)
               */

              if (
                longRenderEvent.data.startAt <= event.data.startAt &&
                longRenderEvent.data.endAt <= event.data.endAt &&
                longRenderEvent.data.endAt >= event.data.startAt
              ) {
                return true;
              }

              /**
             * |x-----------x---- (interaction)
             * |--x------------x  (long-render)
             *

             */

              if (
                event.data.startAt <= longRenderEvent.data.startAt &&
                event.data.endAt >= longRenderEvent.data.startAt
              ) {
                return true;
              }

              /**
               *
               * |--x-------------x    (interaction)
               * |x------------------x (long-render)
               *
               */

              if (
                longRenderEvent.data.startAt <= event.data.startAt &&
                longRenderEvent.data.endAt >= event.data.endAt
              ) {
                return true;
              }
            }) as undefined | (InteractionEvent & { id: string }); // invariant: because we early check the typechecker does not know it must be the case that when it finds something, it will be an interaction it overlaps with

            if (overlapsWith) {
              onOverlap(overlapsWith);
            }
          };

          const toRemove = new Set<string>();

          events.forEach((event) => {
            if (event.kind === "interaction") return;
            applyOverlapCheckToLongRenderEvent(event, () => {
              toRemove.add(event.id);
            });
          });

          const withRemovedEvents = events.filter(
            (event) => !toRemove.has(event.id)
          );

          set(() => ({
            state: {
              events: withRemovedEvents,
            },
          }));
        },

        addListener: (listener: (event: SlowdownEvent) => void) => {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },

        clear: () => {
          set({
            state: {
              events: [],
            },
          });
        },
      },
    };
  }
);
type InteractionEvent = {
  kind: "interaction";
  data: {
    startAt: number;
    endAt: number;
    meta: {
      detailedTiming: TimeoutStage;
      latency: number;
      kind: PerformanceEntryChannelEvent["kind"];
    };
  };
};

type LongRenderPipeline = {
  kind: "long-render";
  data: {
    startAt: number;
    endAt: number;
    meta: {
      latency: number;
      fps: number;
    };
  };
};
export type SlowdownEvent = (InteractionEvent | LongRenderPipeline) & {
  id: string;
};
export const IS_CLIENT = typeof window !== "undefined";
export const not_globally_unique_generateId = () => {
  if (!IS_CLIENT) {
    return "0";
  }

  // @ts-expect-error
  if (window.reactScanIdCounter === undefined) {
    // @ts-expect-error
    window.reactScanIdCounter = 0;
  }
  // @ts-expect-error
  return `${++window.reactScanIdCounter}`;
};
export const startDirtyTaskTracking = () => {
  const onVisibilityChange = () => {
    taskDirtyAt = performance.now();
    taskDirtyOrigin = performance.timeOrigin;
  };

  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
};
let framesDrawnInTheLastSecond: Array<number> = [];
export const HIGH_SEVERITY_FPS_DROP_TIME = 150;
export function startLongPipelineTracking() {
  let rafHandle: number;
  let timeoutHandle: ReturnType<typeof setTimeout>;

  function measure() {
    let unSub: (() => void) | null = null;
    const startOrigin = performance.timeOrigin;
    const startTime = performance.now();
    rafHandle = requestAnimationFrame(() => {
      // very low overhead, on the order of dozens of microseconds to run
      timeoutHandle = setTimeout(() => {
        const endNow = performance.now();
        const duration = endNow - startTime;
        const endOrigin = performance.timeOrigin;
        framesDrawnInTheLastSecond.push(endNow + endOrigin);

        const framesInTheLastSecond = framesDrawnInTheLastSecond.filter(
          (frameAt) => endNow + endOrigin - frameAt <= 1000
        );

        const fps = framesInTheLastSecond.length;
        framesDrawnInTheLastSecond = framesInTheLastSecond;

        const taskConsideredDirty =
          taskDirtyAt !== null && taskDirtyOrigin !== null
            ? endNow + endOrigin - (taskDirtyOrigin + taskDirtyAt) < 100
            : null;
        // not useful to report slowdowns caused by things like outlines (can get expensive not fully optimized)
        const wasTaskInfluencedByToolbar = overToolbar !== null && overToolbar;

        if (
          duration > HIGH_SEVERITY_FPS_DROP_TIME &&
          !taskConsideredDirty &&
          document.visibilityState === "visible" &&
          !wasTaskInfluencedByToolbar
        ) {
          const endAt = endOrigin + endNow;
          const startAt = startTime + startOrigin;

          toolbarEventStore.getState().actions.addEvent({
            kind: "long-render",
            id: not_globally_unique_generateId(),
            data: {
              endAt: endAt,
              startAt: startAt,
              meta: {
                // biome-ignore lint/style/noNonNullAssertion: invariant: this will exist by this point
                latency: duration,
                fps,
              },
            },
          });
        }

        taskDirtyAt = null;
        taskDirtyOrigin = null;

        unSub?.();
        measure();
      }, 0);
    });
    return unSub;
  }

  const measureUnSub = measure();

  return () => {
    measureUnSub();
    cancelAnimationFrame(rafHandle);
    clearTimeout(timeoutHandle);
  };
}
type FinalInteraction = {
  detailedTiming: TimeoutStage;
  latency: number;
  completedAt: number;
};

export const startTimingTracking = () => {
  const unSubPerformance = setupPerformancePublisher();
  const unSubMouseOver = trackCurrentMouseOverToolbar();
  const unSubDirtyTaskTracking = startDirtyTaskTracking();
  const unSubLongPipelineTracking = startLongPipelineTracking();

  const onComplete = async (
    _: string,
    finalInteraction: FinalInteraction,
    event: PerformanceEntryChannelEvent
  ) => {
    toolbarEventStore.getState().actions.addEvent({
      kind: "interaction",
      id: not_globally_unique_generateId(),
      data: {
        startAt: finalInteraction.detailedTiming.blockingTimeStart,
        endAt: performance.now() + performance.timeOrigin,
        meta: { ...finalInteraction, kind: event.kind }, // TODO, will need interaction specific metadata here
      },
    });

    const existingCompletedInteractions =
      performanceEntryChannels.getChannelState("recording");

    if (existingCompletedInteractions.length) {
      // then performance entry and our detailed timing handlers are out of sync, we disregard that entry
      // it may be possible the performance entry returned before detailed timing. If that's the case we should update
      // assumptions and deal with mapping the entry back to the detailed timing here
      performanceEntryChannels.updateChannelState(
        "recording",
        () => new BoundedArray(MAX_CHANNEL_SIZE)
      );
    }
  };
  const unSubDetailedPointerTiming = setupDetailedPointerTimingListener(
    "pointer",
    {
      onComplete,
      onStart: () => {},
    }
  );
  const unSubDetailedKeyboardTiming = setupDetailedPointerTimingListener(
    "keyboard",
    {
      onComplete,
    }
  );

  const unSubInteractions = listenForPerformanceEntryInteractions(
    (completedInteraction) => {
      interactionStore.setState(
        BoundedArray.fromArray(
          interactionStore.getCurrentState().concat(completedInteraction),
          MAX_INTERACTION_BATCH
        )
      );
    }
  );

  return () => {
    unSubMouseOver();
    unSubDirtyTaskTracking();
    unSubLongPipelineTracking();
    unSubPerformance();
    unSubDetailedPointerTiming();
    unSubInteractions();
    unSubDetailedKeyboardTiming();
  };
};
