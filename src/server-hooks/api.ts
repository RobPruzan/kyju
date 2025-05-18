import React from "react";
import { ServerDependency } from "./server-dependency";

export const useServerHook = <T>({
  fn,
}: {
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
export function useDistributedContext<T>(name: string): T extends idk<infer R> ? R : never;
export function useDistributedContext<T>(arg: any): T {
  return null as T;
}

export const useDistributedState = <T>(initialState: T) => {
  return [initialState, () => null] as const;
};

export const createDistributedContext = <T>(name: string): idk<T> => ({
  Provider: ({ children }) => children,
});

export const IFrame = ({ children }: { children: React.ReactNode }) => children;
