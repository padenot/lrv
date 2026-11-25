import type { SearchfoxTarget } from './searchfox';
import type { AppContext } from './types/app';

export class SearchfoxMethods {
  declare context: AppContext['context'];

  // Stub: implemented by the Monaco/shared-UI work.
  async searchfoxLookup(
    _target: SearchfoxTarget,
    _mode: 'definition' | 'uses',
    _newTab: boolean,
  ): Promise<void> {}
}
