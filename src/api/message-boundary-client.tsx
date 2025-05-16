// @ts-nocheck
import { KyjuStore } from "./shared";


let closureAccumulation

kyju.createDependencies({
  schema: Schema,
  db: db,
  closureAccumulation
});

do {
  // console.log + fetch visible from browser via devtools
  fetch("/report-data", {
    method: "POST",
    body: KyjuStore.closureData,
  })
    .then((res) => res.json())
    .then(console.log);
} while (true);
