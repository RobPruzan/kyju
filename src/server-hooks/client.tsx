import { Dispatch, SetStateAction, useState } from "react";
import * as kyju from "./api";

export const IdkContext = kyju.createDistributedContext<{
  count: number;
  setCount: Dispatch<SetStateAction<number>>;
}>("IdkContext");

export const ExampleApp = () => {
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

const remoteConfig = {
  kind: "ws", // iframe also supported
  // url: custom, or default
};

export const Example = () => {
  // might explore this as a component, since that feels more like a "Server",
  // but idk need to play with it, idk but do u want that? the 2 explicit case
  // are initialization, and functions, both of which work fine with this interface
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
  return <kyju.IFrame weirdPid={weirdPid} name="idk" />;
};

// below technically needs to be in a different file
export const ParentWindowApp = () => {
  return (
    <kyju.Controlled name="idk">
      <Devtool />
    </kyju.Controlled>
  );
};

const Devtool = ({ weirdPid }: any) => {
  // live synced with parent state
  const { count } = kyju.useDistributedContext<typeof IdkContext>("IdkContext");

  return (
    <div>
      count:{count}
      weird pid: {weirdPid}
    </div>
  );
};
