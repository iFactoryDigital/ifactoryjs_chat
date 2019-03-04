
// Require dependencies
const Controller  = require('controller');
const escapeRegex = require('escape-string-regexp');

// Require models
const Chat  = model('chat');
const User  = model('user');
const CUser = model('chatUser');

// require helpers
const chatHelper = helper('chat');
const modelHelper = helper('model');

/**
 * Build chat controller
 *
 * @acl   true
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
  // CRUD METHODS
  //
  // ////////////////////////////////////////////////////////////////////////////


  /**
   * socket listen action
   *
   * @param  {String} id
   * @param  {Object} opts
   *
   * @call   chat.users
   * @return {Async}
   */
  async usersAction(search, opts) {
    // set query
    let users = [];
    const query = User;

    // hook
    await this.eden.hook('chat.users', { search, query, opts }, async () => {
      // find users
      users = await query.match('username', new RegExp(escapeRegex(search.toString().toLowerCase()), 'i')).sort('active', -1).limit(20).find();
    });

    // sanitise users
    return await Promise.all(users.map(user => user.sanitise()));
  }

  /**
   * socket listen action
   *
   * @param  {String} id
   * @param  {Object} opts
   *
   * @call   chat.chats
   * @return {Async}
   */
  async chatsAction(opts) {
    // search users
    const chats = await chatHelper.all(opts.user);

    // sanitise users
    return await Promise.all(chats.map(chat => chat.sanitise(opts.user)));
  }

  /**
   * create action
   *
   * @param  {Array}  ids
   * @param  {Object} opts
   *
   * @call   chat.create
   * @return {Promise}
   */
  async createAction(ids, opts) {
    // get users
    const users = await Promise.all(ids.map(user => User.findById(user)));

    // create chat
    const chat = await chatHelper.create(opts.user, users);

    // return chat
    return await chat.sanitise(opts.user);
  }

  /**
   * update chat action
   *
   * @param  {String} id
   * @param  {String} key
   * @param  {*}      value
   * @param  {Object} opts
   *
   * @call   chat.user.set
   * @return {Promise}
   */
  async userSetAction(id, key, value, opts) {
    // load chat
    const chat = await Chat.findById(id);

    // cuser
    await chatHelper.member.set(opts.user, chat, key, value);

    // return chat
    return await chat.sanitise(opts.user);
  }

  /**
   * update chat action
   *
   * @param  {String} id
   * @param  {String} key
   * @param  {*}      value
   * @param  {Object} opts
   *
   * @call   chat.message
   * @return {Promise}
   */
  async messageAction(id, data, opts) {
    // load chat
    const chat = await Chat.findById(id);

    // send message
    const message = await chatHelper.message.send(opts.user, chat, data);

    // return chat
    return await message.sanitise();
  }

  /**
   * update chat action
   *
   * @param  {String} id
   * @param  {String} key
   * @param  {*}      value
   * @param  {Object} opts
   *
   * @call   chat.read
   * @return {Promise}
   */
  async readAction(id, read, opts) {
    // load chat
    const chat = await Chat.findById(id);

    // set read
    await chatHelper.member.read(opts.user, chat, read);

    // return sanitised
    return await chat.sanitise(opts.user);
  }

  /**
   * update chat action
   *
   * @param  {String}  id
   * @param  {Boolean} isTyping
   * @param  {*}       value
   * @param  {Object}  opts
   *
   * @call   chat.typing
   * @return {Promise}
   */
  async typingAction(id, isTyping, opts) {
    // load chat
    const chat = await Chat.findById(id);

    // await typing
    await chatHelper.member.typing(opts.user, chat, isTyping);

    // return typing
    return chat.get(`typing.${opts.user.get('_id').toString()}`);
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
