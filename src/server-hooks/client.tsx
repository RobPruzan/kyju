import { Dispatch, SetStateAction, useState } from "react";
import * as kyju from "./api";

export const IdkContext = kyju.createDistributedContext<{
  count: number;
  setCount: Dispatch<SetStateAction<number>>;
}>("IdkContext");

export const Example = () => {
  const weirdPid = kyju.useServerHook({
    fn: ({ dependencies }) => {
      // you could just spin up a playwright browser here
      const { count } = dependencies.someFunction();
      const { setCount } =
        kyju.useDistributedContext<typeof IdkContext>("IdkContext");
      // and hypothetically push data back to the browser from playwright events!
      setCount((count) => count + 1);
      const pid = dependencies.process.pid;
      return count + pid; // why not
    },
  });

  return <kyju.IFrame>{weirdPid}</kyju.IFrame>;
};

export const App = () => {
  const [count, setCount] = useState();

  return (
    <IdkContext.Provider
      value={{
        count,
        setCount,
      }}
    >
      <Example />
    </IdkContext.Provider>
  );
};
