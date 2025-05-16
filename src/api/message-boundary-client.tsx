// @ts-nocheck
import { KyjuStore } from "./shared";

kyju.createDependencies({
  schema: Schema,
  db: db,
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
