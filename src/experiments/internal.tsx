// need to be available in module
import { useContext, useEffect, useState } from "react";
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
    e: MessageEvent<
      | {
          kind: "context-return";
          ctx: any;
          returnTo: {
            fiberId: string;
            index: number;
          };
        }
      | {
          kind: "use-remote";
          message: unknown;
          fiberId: string;
        }
    >
  ) => {
    switch (e.data.kind) {
      case "use-remote": {
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
        return;
      }
      case "context-return": {
        const fiber = fiberMap.get(e.data.returnTo.fiberId);
        const associatedContext = fiber.hooks[e.data.returnTo.index];
        // just a concept haven't decided how setting + resolving will work, probably just a promise/use interface
        associatedContext.current = e.data.ctx;
        associatedContext.resolve();
        return;
      }
    }
  }
);

export const sendToParent = (args: { kind: "ctx-return"; message: any }) => {
  window.parent.postMessage(args, "*");
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

export const useReadInternalContext = (tag: string) => {
  const context = contextTagMap.get(tag);

  if (!context) {
    throw new Error("invariant for now");
  }

  return context;
};

export const HookManager = () => {
  const [contextLookups, setContextLookups] = useState<
    Array<{
      tag: string;
      returnTo: {
        fiberId: string;
        index: number;
      };
    }>
  >([]);

  contextLookups.map((ctxMeta) => {
    const ctx = contextTagMap.get(ctxMeta.tag) as any;
    const distributedCtx = useContext(ctx);

    sendToParent({
      kind: "ctx-return",
      message: {
        ctx: distributedCtx,
        returnTo: ctxMeta.returnTo,
      },
    });
  });

  useEffect(() => {
    const iframe = document.getElementById("iframe") as HTMLIFrameElement;

    if (!iframe.contentWindow) {
      return;
    }

    iframe.contentWindow.addEventListener("message", () => {});
  }, []);

  return null;
};
