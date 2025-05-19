import { useContext, useEffect, useId } from "react";
import {
  contextTagMap,
  packRemote,
  sendToRemote,
  useReadInternalContext,
} from "./internal";

export const useRemote = ({ fn }: { fn: () => void }) => {
  const fiberId = useId();
  const _ = packRemote(fn);

  useEffect(() => {
    sendToRemote({
      kind: "effect",
      fiberId,
    });
  }, []);

  sendToRemote({
    kind: "use-remote",
    message: _,
    fiberId,
  });
};

export const createDistributedContext = <T>(tag: string) => {
  const contextMeta = {};
  contextTagMap.set(tag, contextMeta);

  /** */
};

export const useDistributedContext = (tag: string) => {
  // internally needs to `use`
  const contextData = useRemote({
    // api obviously isn't expressive enough but i want this internally
    fn: () => {
      const contextData = useReadInternalContext(tag);
      return contextData;
    },
  });
  return contextData;
};

export const useEffectImpl = (fn: () => void, deps: any[]) => {};
