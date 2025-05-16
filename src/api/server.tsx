// @ts-nocheck
import { KyjuStore } from "./shared";

let closureAccumulationRef = { current: 0 };

kyju.createDependencies(
  {
    schema: Schema,
    db: db,
  },
  {
    // all values here are accessible on client
    // can think of this like an RPC, but u can access variables too
    closureAccumulationRef,
  }
);
while (true) {
  // console.log + fetch visible from browser via devtools
  await fetch("/report-data", {
    method: "POST",
    body: KyjuStore.clientClosure + closureAccumulationRef.current,
  })
    .then((res) => res.json())
    .then(console.log);
}
