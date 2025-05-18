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
  kind: "ws", // iframe also  supported
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
      // and hypothetically push data back to the browser from playwright events
      setCount((count) => count + 1);
      const pid = dependencies.process.pid;
      return count + pid; // why not
    },
  });
  // can render to kyju toolbar, or to an external iframe
  // what if entrypoints are just leaf nodes
  // wait why can't they communicate back and fourth that should be fine?
  // so u have a "iframe" entrypoint, which you define it in a trpc like router,
  // and render here. 2 way holes? that would allow you to entrypoint iframe
  // components too just to get minimal data from iframe environment. Hmmmm.
  // which do you want more? Then it must be interleave-able, you should be able
  // to transition between both.
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

export const Devtool = ({ weirdPid }: any) => {
  // live synced with parent state
  const { count } = kyju.useDistributedContext<typeof IdkContext>("IdkContext");

  return (
    <div>
      count:{count}
      weird pid: {weirdPid}
      <kyju.IFrame name="iframe-controlled" />
    </div>
  );
};

// another file boundary

export const IFrameEntrypoint = () => {
  return (
    <kyju.Controlled name="iframe-controlled">
      <IFrameDevtool />
    </kyju.Controlled>
  );
};
// this wont render in the iframe, needs
const IFrameDevtool = () => {
  const { count } = kyju.useDistributedContext<typeof IdkContext>("IdkContext");
  return <kyju.IFrame count={count} name="leaf" />;
};

// another file boundary

// below technically needs to be in a different file
export const LeafWindowApp = () => {
  return (
    <kyju.Controlled name="leaf">
      <Devtool />
    </kyju.Controlled>
  );
};

export const LeafDevtool = ({ weirdPid }: any) => {
  const { count } = kyju.useDistributedContext<typeof IdkContext>("IdkContext");

  return (
    <div>
      count:{count}
      weird pid: {weirdPid}
    </div>
  );
};
