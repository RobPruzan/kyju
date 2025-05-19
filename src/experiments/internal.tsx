// need to be available in module
import { useEffect, useState } from "react";
import { useEffectImpl, useDistributedContext } from "./public";
export const packRemote = (fn: () => void) => {};

export const unpackRemote = (data: unknown) => {};

export const readRemoteContext = () => {};

export const contextTagMap = new Map<any, any>();

export const fiberMap = new Map<
  string,
  {
    currentHookIndex: number;
    hooks: any[];
  }
>();

window.addEventListener(
  "message",
  (
    e: MessageEvent<{
      kind: "use-remote";
      message: unknown;
      fiberId: string;
    }>
  ) => {
    const data = e.data;

    const useEffect = () => {
      let existingEffectMaybe = fiberMap.get(data.fiberId);
      if (!existingEffectMaybe) {
        const newFiber = {
          currentHookIndex: 0,
          hooks: [],
        };
        existingEffectMaybe = newFiber;
        fiberMap.set(data.fiberId, newFiber);
      }
      // useEffectImpl(() => {}, []);
    };

    const _ = unpackRemote(data.message);
  }
);

export const sendToParent = (message: any) => {
  window.parent.postMessage(message, "*");
};

export const sendToRemote = (
  args:
    | {
        kind: "use-remote";
        message: unknown;
        fiberId: string;
      }
    | {
        kind: "effect";
        fiberId: string;
      }
) => {
  switch (args.kind) {
    case "use-remote": {
      const iframe = document.getElementById("iframe") as HTMLIFrameElement;
      if (!iframe.contentWindow) {
        return;
      }
      iframe.contentWindow.postMessage(args.message, "*");
      return;
    }
    case "effect": {
      const fiber = fiberMap.get(args.fiberId);
      fiber.hooks.map((hook) => {
        // effect stuff todo
      });

      return;
    }
  }
};

export const createIframe = () => {
  const iframe = document.createElement("iframe");

  iframe.id = "test-iframe";
  iframe.srcdoc = html`
    <html>
      <script>
        /**
         * stuff
         */
      </script>
    </html>
  `;
};

export const html = (strings: TemplateStringsArray, ...values: any[]) =>
  String.raw({ raw: strings }, ...values);

type todo = any;
export const RemoteComponentCallManager = () => {
  const [components, setComponents] = useState<Array<todo>>();

  useEffect(() => {
    const iframe = document.getElementById("iframe") as HTMLIFrameElement;

    if (!iframe.contentWindow) {
      return;
    }

    iframe.contentWindow.addEventListener("message", () => {});
  }, []);

  return components.map((component) => <></>);
};

export const useReadInternalContext = (tag: string) => {
  const context = contextTagMap.get(tag);

  if (!context) {
    throw new Error("invariant for now");
  }

  return context;
};
