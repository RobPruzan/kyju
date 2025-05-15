import { motion } from "framer-motion";
import { useState } from "react";
import "./styles.css";



export const Toolbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      className="flex justify-center items-center bg-blue-500 absolute bottom-1 right-1 rounded p-[5px]"
      style={{
        height: open ? 350 : 40,
        width: open ? 400 : 200,
      }}
      transition={{
        duration: 0.25,
        bounce: 0.25,
        type: "spring",
      }}
      layout
    >
      <motion.button
        layout
        style={{
          color: "white",
        }}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? "close " : "open "} me
      </motion.button>
    </motion.div>
  );
};
