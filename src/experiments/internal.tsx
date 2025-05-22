// need to be available in module
// import { useEffect } from "react";
import { useEffectImpl, useDistributedContext } from "./public";
export const packRemote = (fn: Function) => {
  return fn.toString();
};

// export const unpackRemote = (fnString: string) => {

//   return fn;
// };

export const readRemoteContext = () => {};

const useState = <T,>(initial: any) => [{} as any, () => null];
const useContext = (args: any) => ({} as any);
export const contextTagMap = new Map<any, any>();

export const fiberMap = new Map<
  string,
  {
    currentHookIndex: number;
    hooks: any[];
  }
>();
export const setupIframeListener = () => {
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
            message: string;
            fiberId: string;
          }
      >
    ) => {
      switch (e.data.kind) {
        case "use-remote": {
          const data = e.data;
          console.log("fn", data.message);
          const fn = new Function(
            `return (${data.message
              .replace(/use([A-Z][a-zA-Z0-9]*)\d+/g, "use$1")
              .replace(/_s\d+\(\);?/g, "")})`
          )();

          function useEffect(fn: () => void, deps: any[]) {
            console.log("running useEffect");

            let existingEffectMaybe = fiberMap.get(data.fiberId);
            if (!existingEffectMaybe) {
              const newFiber = {
                currentHookIndex: 0,
                hooks: [],
              };
              existingEffectMaybe = newFiber;
              fiberMap.set(data.fiberId, newFiber);
            }
            useEffectImpl(() => {}, []);
          }
          fn({ useEffect });
          return;
        }
        case "context-return": {
          const fiber = fiberMap.get(e.data.returnTo.fiberId);
          if (!fiber) {
            throw new Error("todo");
          }
          const associatedContext = fiber.hooks[e.data.returnTo.index];
          // just a concept haven't decided how setting + resolving will work, probably just a promise/use interface
          associatedContext.current = e.data.ctx;
          associatedContext.resolve();
          return;
        }
      }
    }
  );
};

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
  console.log("sending to remote");

  switch (args.kind) {
    case "use-remote": {
      const iframe = document.getElementById("iframe") as
        | HTMLIFrameElement
        | undefined;
      if (!iframe) {
        console.log("no iframe found");

        return;
      }
      if (!iframe.contentWindow) {
        return;
      }
      iframe.contentWindow.postMessage(
        {
          kind: "use-remote",
          message: args.message,
          fiberId: args.fiberId,
        },
        "*"
      );
      return;
    }
    case "effect": {
      let fiber = fiberMap.get(args.fiberId);
      if (!fiber) {
        fiber = {
          currentHookIndex: 0,
          hooks: [],
        };
        fiberMap.set(args.fiberId, fiber);
      }
      fiber.hooks.map((hook) => {
        // effect stuff todo
      });

      return;
    }
  }
};

export const IFrame = () => {
  return (
    <iframe
      id="iframe"
      srcDoc={`
        <!DOCTYPE html>
        <html>
        <script>
        console.log("iframe running")
        </script>
          <body>
            <script src="http://localhost:7001"></script>
          </body>
        </html>
      `}
    />
  );
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

  // todo
  // contextLookups.map((ctxMeta) => {
  //   const ctx = contextTagMap.get(ctxMeta.tag) as any;
  //   const distributedCtx = useContext(ctx);

  //   sendToParent({
  //     kind: "ctx-return",
  //     message: {
  //       ctx: distributedCtx,
  //       returnTo: ctxMeta.returnTo,
  //     },
  //   });
  // });

  // useEffect(() => {
  //   const iframe = document.getElementById("iframe") as
  //     | HTMLIFrameElement
  //     | undefined;

  //   if (!iframe) {
  //     return;
  //   }
  //   if (!iframe.contentWindow) {
  //     return;
  //   }

  //   iframe.contentWindow.addEventListener("message", () => {});
  // }, []);

  return null;
};
