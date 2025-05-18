type QueryOptions<T, C> =
  | {
      // this should be general
      destination: "iframe";
      fn: (idk: {
        closureVariables: C;
        context: {
          window: typeof window;
        };
      }) => T;
      closureVariables?: C;
      key: string;
    }
  | {
      destination: "server";
      fn: (idk: {
        closureVariables: C;
        context: {
          process: { pid: number; env: Record<string, string> };
        };
      }) => T;
      closureVariables?: C;
      key: string;
    };

type MessageOptions<A, B> = {
  destination: "iframe";
  fn: (
    args: A,
    context: {
      window: typeof window;
      existingListener: () => void;
    }
  ) => B;
};

export const createContext = <T>() => ({
  Provider: ({ children, value }: { children: React.ReactNode; value: T }) =>
    children,
  value: null as T,
});

export const once = <R, T extends { value: R }>({
  fn,
  key,
}: {
  key: string;
  fn: (context: R) => void;

  context: T;
}) => {};

export const useMount = (data: any) => null;

export const useMessage = <A, B>(
  options: MessageOptions<A, B>
): { message: (args: A) => B } => {
  // destination: "iframe"

  return null as { message: (args: A) => B };
};
export const useQuery = <T, C>({ destination, fn }: QueryOptions<T, C>) => {};

export const useLiveState = <T>(initial: T) =>
  [initial, (data: T) => null] as const;

export const KyjuToolbar = ({ children }: { children: React.ReactNode }) =>
  children;
