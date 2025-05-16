import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useSyncExternalStore } from "react";
import "./styles.css";
import { iife, startTimingTracking, toolbarEventStore } from "./utils";

export const Toolbar = () => {
  const [open, setOpen] = useState(false);

  const toolbarState = useSyncExternalStore(
    toolbarEventStore.subscribe,
    toolbarEventStore.getState
  );

  useEffect(() => {
    const unSub = startTimingTracking();

    return () => {
      unSub();
    };
  }, []);

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
                      return (
                        <div>
                          {event.data.meta.detailedTiming.componentName}:{" "}
                          {event.data.meta.latency.toFixed(2)}ms
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
