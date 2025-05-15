
import { useState } from "react";

export const Toolbar = () => {
 

  const [count, setCount] = useState(0);
  return (
    <button
      onClick={() => {
        setCount(count + 1);
      }}
    >
    count woo:  {count}
    </button>
  );
};
