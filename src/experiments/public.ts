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
  const contextMeta = useRemote({
    // api obviously isn't expressive enough but i want this internally
    fn: () => {
      const contextMeta = useReadInternalContext(tag);
      return contextMeta;
    },
  });
  /** */
};

export const useEffectImpl = (fn: () => void, deps: any[]) => {};
