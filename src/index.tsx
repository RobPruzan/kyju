import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import "./styles.css";

export const Toolbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className="flex flex-col justify-center items-center bg-black absolute bottom-1 right-1 rounded p-[5px]"
      style={{
        height: open ? 350 : 40,
        width: open ? 400 : 200,
      }}
      transition={{
        duration: 0.25,
        // bounce: 0.25,
        bounce: 0,
        type: "spring",
      }}
      layout
    >
      <motion.div className="h-[calc(100%-30px)] w-full"></motion.div>
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
