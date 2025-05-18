import { Dispatch, SetStateAction, useState } from "react";
import * as kyju from "./api";

export const IdkContext = kyju.createDistributedContext<{
  count: number;
  setCount: Dispatch<SetStateAction<number>>;
}>("IdkContext");

const remoteConfig = {
  kind: "ws", // iframe supported
  // url: custom, or default
};

export const Example = () => {
  const weirdPid = kyju.useRemoteHook({
    remoteConfig,
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
  // can render to kyju toolbar, or to an external iframe
  return (
    <kyju.IFrame
      context={{
        weirdPid,
      }}
    >
      <MillionLint />
    </kyju.IFrame>
  );
};

const MillionLint = () => {
  // live synced with parent state
  const { weirdPid } = kyju.useDistributedContext("$parent-window");

  return <div>{weirdPid}</div>;
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
