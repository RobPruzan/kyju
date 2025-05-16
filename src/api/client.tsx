// @ts-nocheck
export const clientClosure = kyju.shared(2);

const Component = () => {
  const iframeFn = kyju.useMessage({
    destination: Destination.IFrame,
    fn: (dependencies) => {
      "use remote";
      dependencies.iframeAccRef.current += clientClosure;
      return window.iframeData;
    },
  });
  const serverMutation = kyju.useQueryMessage({
    destination: Destination.Server,
    fn: async (dependencies) => {
      "use remote";
      dependencies.closureAccumulationRef.current += clientClosure;

      await dependencies.db.insert(dependencies.Schema.accumulations).values({
        dependencies,
      });
    },
  });
  // these can also run in parallel to avoid waterfall
  const { closureAccumulationRef } = kyju.server.use();
  const { iframeAccRef } = kyju.iframe.use();
  // cross browser support for tracking interactions made by user
  // can access automatically access interactions from remote iframes
  const interactions = useInteractions(); 

  return (
    <KyjuToolbar mode="morph">
      <button
        onClick={() => {
          clientClosure += 1;
          serverMutation.mutate();
          console.log(await iframeFn()); // logs 69, await only needed when accessing data;
          kyju.server.setClosureAccumulation((prev) => prev + 1);
        }}
      >
        client accumulation: {clientClosure}
        server accumulation: {closureAccumulationRef.current}
        iframe accumulation: {iframeAccRef.current}
      </button>
      {JSON.stringify(interactions)}

      {contentMutation.error && <>{serverMutation.error}</>}
    </KyjuToolbar>
  );
};
