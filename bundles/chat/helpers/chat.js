
// import dependencies
const Helper = require('helper');

/**
 * extend chat helper
 *
 * @extends {helper}
 */
class ChatHelper extends Helper {
  /**
   * construct notification helper
   */
  constructor() {
    // run super
    super();
  }
}

/**
 * export built chat helper
 *
 * @type {chatHelper}
 */
module.exports = new ChatHelper();
