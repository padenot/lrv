window.Perf = {
  mark: (name: string) => {
    performance.mark(name);
  },
  measure: (name: string, start: string, end: string) => {
    performance.measure(name, { start, end });
  },
  recordFileSwitchStart: () => {
    performance.mark('fileSwitchStart');
  },
  recordFileSwitchEnd: () => {
    performance.mark('fileSwitchEnd');
    performance.measure('fileSwitch', { start: 'fileSwitchStart', end: 'fileSwitchEnd' });
  },
  recordAppInitStart: () => {
    performance.mark('appInitStart');
  },
  recordAppInitEnd: () => {
    performance.mark('appInitEnd');
    performance.measure('appInit', { start: 'appInitStart', end: 'appInitEnd' });
  },
  getMetrics: () => {
    const toDurations = (name: string) => performance.getEntriesByName(name).map((e) => e.duration);
    return { fileSwitch: toDurations('fileSwitch'), appInit: toDurations('appInit') };
  },
  clear: () => {
    performance.clearMarks();
    performance.clearMeasures();
  },
};
