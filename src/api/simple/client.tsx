import { useState } from "react";
import * as kyju from "./api";

const context = kyju.createContext<{ input: string }>();

const mount = kyju.once({
  key: "init",
  fn: (contextValue: { input: string }) => {
    const currentInput = contextValue.input;

    document.addEventListener("mousemove", () => {
      if (currentInput) {
        return;
      }

      // do something
    });
  },
  context,
});

export const Wrapper = () => {
  return (
    <context.Provider value={{ input: "" }}>
      <Simple />
    </context.Provider>
  );
};

export const Simple = () => {
  const [lastKey, setLastKey] = kyju.useLiveState<null | string>(null);

  kyju.useMount(mount);

  const _ = kyju.useQuery({
    destination: "iframe",
    fn: ({ context }) => {
      context.window.addEventListener("keydown", (e) => {
        setLastKey(e.key);
      });
      return context.window.location.href;
    },
    key: "stuff",
  });

  const __ = kyju.useQuery({
    destination: "server",
    fn: ({ context }) => {
      return context.process.pid;
    },
    key: "stuff again",
  });

  const iframeMessage = kyju.useMessage({
    destination: "iframe",
    fn: (track: string, context) => {
      window.removeEventListener("keydown", context.existingListener);
      window.addEventListener("keydown", (e) => {
        if (e.key === track) {
          alert("woo");
        }
      });
    },
  });

  return (
    <kyju.KyjuToolbar>
      <button
        onClick={() => {
          iframeMessage.message("Enter");
        }}
      ></button>
      {lastKey}
    </kyju.KyjuToolbar>
  );
};
