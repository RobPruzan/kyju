type NetworkRequest = {
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
};

export const getRequests = (): NetworkRequest[] => {
  if (typeof window === "undefined") return [];

  const entries = window.performance.getEntriesByType("resource");
  const timeOrigin = performance.timeOrigin;
  return entries.map((entry) => ({
    url: entry.name,
    startTime: timeOrigin + entry.startTime,
    endTime: timeOrigin + entry.startTime + entry.duration,
    duration: entry.duration,
  }));
};

export const observeRequests = (
  callback: (request: PerformanceResourceTiming) => void
) => {
  if (typeof window === "undefined") return;

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      callback(entry as PerformanceResourceTiming);
    });
  });

  observer.observe({ entryTypes: ["resource"] });

  return () => {
    observer.disconnect();
  };
};
