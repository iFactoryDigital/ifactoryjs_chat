
// Require dependencies
const Controller = require('controller');

// Require models
const Chat = model('chat');

// require helpers
const modelHelper = helper('model');
const chatHelper = helper('chat');

/**
 * Build chat controller
 *
 * @acl   admin
 * @fail  next
 * @mount /chat
 */
class ChatController extends Controller {
  /**
   * Construct chat controller
   */
  constructor() {
    // Run super
    super();

    // bind build methods
    this.build = this.build.bind(this);

    // set building
    this.building = this.build();
  }

  // ////////////////////////////////////////////////////////////////////////////
  //
  // BUILD METHODS
  //
  // ////////////////////////////////////////////////////////////////////////////

  /**
   * builds chat controller
   */
  build() {

  }

  // ////////////////////////////////////////////////////////////////////////////
  //
  // MODEL LISTEN METHODS
  //
  // ////////////////////////////////////////////////////////////////////////////


  /**
   * socket listen action
   *
   * @param  {String} id
   * @param  {Object} opts
   *
   * @call   model.listen.chat
   * @return {Async}
   */
  async listenAction(id, uuid, opts) {
    // / return if no id
    if (!id) return;

    // join room
    opts.socket.join(`chat.${id}`);

    // add to room
    return await modelHelper.listen(opts.sessionID, await Chat.findById(id), uuid, true);
  }

  /**
   * socket listen action
   *
   * @param  {String} id
   * @param  {Object} opts
   *
   * @call   model.deafen.chat
   * @return {Async}
   */
  async deafenAction(id, uuid, opts) {
    // / return if no id
    if (!id) return;

    // join room
    opts.socket.leave(`chat.${id}`);

    // add to room
    return await modelHelper.deafen(opts.sessionID, await Chat.findById(id), uuid, true);
  }
}

/**
 * Export chat controller
 *
 * @type {ChatController}
 */
module.exports = ChatController;
