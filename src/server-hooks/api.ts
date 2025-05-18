import React from "react";
import { ServerDependency } from "./server-dependency";

export const useRemoteHook = <T>({
  fn,
  remoteConfig
}: {
  remoteConfig: any
  fn: ({
    dependencies,
  }: {
    dependencies: { someFunction: ServerDependency; process: { pid: number } };
    
  }) => T;
}): T => {
  // Implementation would go here
  return undefined as unknown as T;
};

type idk<T> = {
  Provider: ({
    value,
    children,
  }: {
    value: T;
    children: React.ReactNode;
  }) => React.ReactNode;
};
export function useDistributedContext<T>(Context: idk<T>): T;
export function useDistributedContext<T>(
  name: string
): T extends idk<infer R> ? R : never;
export function useDistributedContext<T>(arg: any): T {
  return null as T;
}

export const useDistributedState = <T>(initialState: T) => {
  return [initialState, () => null] as const;
};

export const createDistributedContext = <T>(name: string): idk<T> => ({
  Provider: ({ children }) => children,
});
// can render to external target by making clients browser an "ssr engine", and
// sending it to a local server that can distribute the html, and then maps
// event handlers back to ones defined in runtime (application code)

// this can allow for automatically synced devtools that move between website and vscode/cursor boundary, since
// webview in electron would be reading from the same source, and they are connected to a hot reloader
export const IFrame = ({
  children,
  context,
}: {
  children: React.ReactNode;
  context: any;
}) => children;
