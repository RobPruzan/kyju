type RemoteFunctionArgs = {
  args: any[];
  dependencies: any;
};
export const remote = (fn: () => RemoteFunctionArgs, args: any[]) => {
  return {
    value: new Promise((res) => {
      message("server", serializeFunction(fn, args), (data) => res(data));
    }),
  };
};

export const message = (id: string, data: any, ack?: (result: any) => void) => {};

export const serializeFunction = (
  fn: () => RemoteFunctionArgs,
  args: any[]
) => {
  const functionString = fn.toString();

  return {
    functionString,
    args,
  };
};

export const unpackFunction = (packed: {
  functionString: string;
  args: any[];
}) => {
  const functionArgs = {
    args: packed.args,
    dependencies: {}, // todo
  };

  const fn = new Function(`return (${packed.functionString})`)();

  const result = fn(functionArgs);

  return result;
};
