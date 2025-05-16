// @ts-nocheck
export const closureData = kyju.shared(2);

const Component = () => {
  const iframeMutation = kyju.useMessage({
    destination: Destination.IFrame,
    fn: (dependencies) => {
      "use remote";
      dependencies.closureAccumulation += closureData;
    },
  });
  const serverMutation = kyju.useMessage({
    destination: Destination.Server,
    fn: async (dependencies) => {
      "use remote";
      dependencies.closureAccumulation += closureData;

      await dependencies
        .db
        .insert(dependencies.Schema.accumulations)
        .values({
        dependencies,
      });
    },
  });

  return (
    <div>
      <button
        onClick={() => {
          serverMutation.mutate();
          iframeMutation.mutate();
        }}
      >
        accumulation: {closureData}
      </button>

      {contentMutation.error && <>{serverMutation.error}</>}
      {contentMutation.error && <>{iframeMutation.error}</>}
    </div>
  );
};
