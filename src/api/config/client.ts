// @ts-nocheck
const client = config({
  ClientStore,
});
// allows for typed rpc
export type FrontendClient = typeof client;
