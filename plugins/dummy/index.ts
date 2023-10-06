export default function plugin1() {
  return {
    apply: (templateVars: any) => {
      // Modify templateVars here
      templateVars.samplePluginData = 'Hello from Sample Plugin 1';
    },
  };
}