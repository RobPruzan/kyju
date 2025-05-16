// @ts-nocheck
export const clientClosure = kyju.shared(2);

const Component = () => {
  const iframeMutation = kyju.useMessage({
    destination: Destination.IFrame,
    fn: (dependencies) => {
      "use remote";
      dependencies.closureAccumulationRef.current += clientClosure;
    },
  });
  const serverMutation = kyju.useMessage({
    destination: Destination.Server,
    fn: async (dependencies) => {
      "use remote";
      dependencies.closureAccumulationRef.current += clientClosure;

      await dependencies.db.insert(dependencies.Schema.accumulations).values({
        dependencies,
      });
    },
  });
  const {closureAccumulationRef} = kyju.server.use()

  return (
    <div>
      <button
        onClick={() => {
          clientClosure += 1
          serverMutation.mutate();
          iframeMutation.mutate();
          kyju.server.setClosureAccumulation(prev => prev + 1)
        }}
      >
        client accumulation: {closureData}
        server accumulation: {kyju.closureAccumulationRef.current}
      </button>

      {contentMutation.error && <>{serverMutation.error}</>}
    </div>
  );
};
