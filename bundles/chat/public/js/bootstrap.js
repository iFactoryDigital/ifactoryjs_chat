
// Require local dependencies
const store = require('default/public/js/store');

/**
 * Build socket class
 */
class ChatStore {
  /**
   * Construct socket class
   */
  constructor() {
    // Bind private methods
    this.build = this.build.bind(this);

    // set building
    this.building = this.build();
  }

  /**
   * build socket store
   *
   * @return {Promise}
   */
  async build() {
    // Pre user
    store.pre('set', (data) => {
      // Check key
      if (data.key !== 'chat') return;

      // Set val
      data.val = this;
    });
  }
}

/**
 * Export built socket class
 *
 * @type {ChatStore}
 */
exports = module.exports = window.eden.chat = new ChatStore();
