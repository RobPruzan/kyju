import { message } from "./function";

export const shared = <T>(state: T) => {
  const id = crypto.randomUUID();
  return {
    id,
    state,
    set: (data: T) => {
      message("set_" + id, data);
    },
  };
};

const messageListener = (id: string, state: any, injectedLocalState: any) => {
  injectedLocalState[id] = state;
};
