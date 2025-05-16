// @ts-nocheck
export const clientClosure = kyju.state(2, {
  mode: "persist",
  storage: localStorage, // because devtool state should persist when the user wants to reload to-debug website
  // automatic MCP configuration (minimal info passed to create an MPC from state)
  mcpOptions: { ...null },
});

export const ClientStore = kyju.createDependencies(null, {
  window,
  clientClosure,
});

const Component = () => {
  const iframeFn = kyju.useMessage({
    destination: Destination.IFrame,
    fn: (dependencies) => {
      "use remote";
      dependencies.iframeAccRef.current += clientClosure;
      return window.iframeData;
    },
  });
  // if your query/mutation is slow, you can let react query take control
  const serverMutation = kyju.useQueryMessage({
    destination: Destination.Server,
    fn: async (dependencies) => {
      "use remote";
      dependencies.closureAccumulationRef.current += clientClosure;
      console.log(dependencies.os.cwd());
      await dependencies.db.insert(dependencies.Schema.accumulations).values({
        dependencies,
      });
    },
  });
  // these can also run in parallel to avoid waterfall
  const { closureAccumulationRef } = kyju.server.use();
  const { iframeAccRef } = kyju.iframe.use();
  // cross browser support for tracking interactions made by user
  // can automatically access interactions from remote iframes
  const interactions = useInteractions();
  const route = useRouter(); // non url based router, supports transitions + activity enabled
  const loaderData = useLoader(); // typed loaders

  // composable allows other kyju devtools to merge together
  return (
    <KyjuToolbar
      onMessage={(event) => {
        // an event from another kyju toolbar
      }}
      morph
      dnd
      magnetic
      hidable
      peekable
      composable
    >
      {/* extended canvas for efficient devtool visualizations */}
      {/* 3.js or custom 3d renderer here would be sick */}
      <Canvas
        onMount={(ctx, canvas) => {
          ctx.stroke();
        }}
      />
      <button
        onClick={() => {
          clientClosure += 1;
          serverMutation.mutate();
          console.log(await iframeFn()); // logs 69, await only needed when accessing data;
          kyju.server.setClosureAccumulation((prev) => prev + 1);
          // efficient async layout calculations
          // kyju ships a customer profiler for devtool related operations so you can see how long this takes
          console.log(
            await kyju.queryLayout(document.getElementsByTagName("div"))
          );
        }}
      >
        client accumulation: {clientClosure}
        server accumulation: {closureAccumulationRef.current}
        iframe accumulation: {iframeAccRef.current}
      </button>
      {JSON.stringify(interactions)}
      {/* react query wrapper */}
      {contentMutation.error && <>{serverMutation.error}</>}
    </KyjuToolbar>
  );
};
