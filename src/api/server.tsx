// @ts-nocheck
import { ClientStore } from "./shared";

let closureAccumulationRef = { current: 0 };

export const ServerStore = kyju.createDependencies(
  {
    schema: Schema,
    db: db,
    os: os,
  },
  {
    // all values here are accessible on client
    // can think of this like an RPC, but u can access variables too
    closureAccumulationRef,
  }
);
while (true) {
  kyju.message({
    destination: currentTabId,
    fn: (dependencies) => {
      console.log(dependencies.window.getElementById("data").value);
    },
  });
  // console.log + fetch visible from browser via devtools
  await fetch("/report-data", {
    method: "POST",
    body: ClientStore.clientClosure + closureAccumulationRef.current,
  })
    .then((res) => res.json())
    .then(console.log);
}
