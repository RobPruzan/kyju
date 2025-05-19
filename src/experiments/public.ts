import { useEffect, useId } from "react";
import { packRemote, sendToRemote } from "./internal";

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

export const createDistributedContext = () => {
  /** */
};

export const useDistributedContext = () => {
  /** */
};

export const useEffectImpl = (fn: () => void, deps: any[]) => {};
