import * as kyju from "./api";
import { IdkContext } from "./client";
export const someFunction = () => {
  const data = kyju.useDistributedContext(IdkContext);
  data.setCount(100)
  return data;
};
// really would need to be passed to an RPC central object for type defs shared with client
export type ServerDependency = typeof someFunction
