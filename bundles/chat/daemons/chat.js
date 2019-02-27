
// import dependencies
const Daemon = require('daemon');

// require helpers
const chatHelper = helper('chat');

/**
 * extend chat Daemon
 *
 * @compute
 *
 * @extends {Daemon}
 */
class ChatDaemon extends Daemon {
  /**
   * construct Chat Daemon
   */
  constructor() {
    // run super
    super();

    // bind build method
    this.build = this.build.bind(this);

    // build
    this.building = this.build();
  }

  /**
   * build Chat Daemon
   */
  async build() {

  }
}

/**
 * export built chat daemon
 *
 * @type {chatDaemon}
 */
module.exports = ChatDaemon;
