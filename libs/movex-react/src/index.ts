export { MovexProviderClass as MovexProvider } from './lib/MovexProviderClass';

// This is only needed for movex-react-local-master
// so something else might be done there but for now it's ok!
export {
  MovexContext as MovexReactContext,
  initialMovexContext as initialReactMovexContext,
  type MovexContextProps as MovexReactContextProps,
  type MovexContextPropsConnected as MovexReactContextPropsConnected,
  type MovexContextPropsNotConnected as MovexReactContextPropsNotConnected,
} from './lib/MovexContext';

export { MovexBoundResourceComponent as MovexBoundResource } from './lib/MovexBoundResourceComponent';
export { ResourceObservablesRegistry as MovexResourceObservablesRegistry } from './lib/ResourceObservableRegistry';
export * from './lib/MovexConnection';
export * from './lib/hooks';
