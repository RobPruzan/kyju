// @ts-nocheck
import { KyjuStore } from "./shared";

let closureAccumulation = 0;

kyju.createDependencies(
  {
    schema: Schema,
    db: db,
  },
  {
    // all values here are accessible on client
    closureAccumulation,
  }
);
while (true) {
  // console.log + fetch visible from browser via devtools
  await fetch("/report-data", {
    method: "POST",
    body: KyjuStore.clientClosure + closureAccumulation,
  })
    .then((res) => res.json())
    .then(console.log);
}
