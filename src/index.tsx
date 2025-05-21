import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./styles.css";
import { iife, startTimingTracking, toolbarEventStore } from "./utils";
import { observeRequests } from "./network/network";
import { useRemote } from "./experiments/public";
import { IFrame, setupIframeListener } from "./experiments/internal";
export { useRemote, setupIframeListener };

if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = styles;
  document.head.append(style);
}

export const TestIFrame = () => {
  return <IFrame />;
};

export const Toolbar = () => {
  const [open, setOpen] = useState(false);

  const toolbarState = useSyncExternalStore(
    toolbarEventStore.subscribe,
    toolbarEventStore.getState
  );

  console.log("state ", toolbarState);

  useEffect(() => {
    const unSub = startTimingTracking();

    return () => {
      unSub();
    };
  }, []);

  const [requests, setRequests] = useState<Array<PerformanceResourceTiming>>(
    []
  );

  useEffect(() => {
    /**
     * tings I need for interaction -> network request
     *
     * just map it?
     */
    const unSub = observeRequests((data) => {
      setRequests((prev) => [...prev, data]);
      console.log("req", data, performance.timeOrigin);
    });
    return unSub;
  }, []);
  console.log("requests", requests);

  return (
    <motion.div
      className="flex flex-col justify-center items-center bg-black absolute bottom-1 right-1 rounded p-[5px]"
      style={{
        height: open ? 350 : 40,
        width: open ? 400 : 200,
      }}
      transition={{
        duration: 0.25,
        bounce: 0,
        type: "spring",
      }}
      layout
    >
      <motion.div className="h-[calc(100%-30px)] w-full text-white">
        {open && (
          <div className="flex flex-col">
            {toolbarState.state.events.map((event) => (
              <div>
                {iife(() => {
                  switch (event.kind) {
                    case "interaction": {
                      const associatedRequests = requests.filter(
                        (req) =>
                          req.startTime >=
                            event.data.meta.detailedTiming.start &&
                          req.startTime <=
                            event.data.meta.detailedTiming.jsEndDetail
                      );
                      return (
                        <div>
                          {event.data.meta.detailedTiming.componentName}:{" "}
                          {event.data.meta.latency.toFixed(2)}ms
                          {associatedRequests.length !== 0 && (
                            <div className="border-t w-full ml-4">
                              <span className="font-bold">Requests</span>

                              {associatedRequests.map((req) => (
                                <div>
                                  <span>url: {req.name}</span>
                                  <span>
                                    duration: {req.duration.toFixed(2)}ms{" "}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    case "long-render": {
                      return <div>fps: {event.data.meta.fps}</div>;
                    }
                  }
                })}
              </div>
            ))}
          </div>
        )}
      </motion.div>
      <motion.div className="h-[30px] w-full border-t flex justify-end">
        <AnimatePresence mode="wait">
          <motion.button
            transition={{
              duration: 0.2,
            }}
            layoutId="bruh"
            key={String(open)}
            style={{
              color: "white",
            }}
            onClick={() => setOpen((prev) => !prev)}
          >
            <motion.span>{open ? "close " : "open "} me</motion.span>
          </motion.button>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
