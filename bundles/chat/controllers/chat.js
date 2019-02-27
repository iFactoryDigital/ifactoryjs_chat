
// Require dependencies
const uuid        = require('uuid');
const socket      = require('socket');
const Controller  = require('controller');
const escapeRegex = require('escape-string-regexp');

// Require models
const User = model('user');
const Chat = model('chat');

// require helpers
const chatHelper = helper('chat');
const modelHelper = helper('model');

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
    // search users
    const users = await User.match('username', new RegExp(escapeRegex(search.toString().toLowerCase()), 'i')).sort('active', -1).limit(20).find();

    // sanitise users
    return await Promise.all(users.map(user => user.sanitise()));
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

    // load chat
    const chat = await Chat.where({
      hash : users.map(user => user.get('_id').toString()).sort().join(':'),
    }).findOne() || new Chat({
      users,

      uuid    : uuid(),
      hash    : users.map(user => user.get('_id').toString()).sort().join(':'),
      creator : opts.user,
    });

    // save chat
    await chat.save();

    // emit created
    users.forEach(async (user) => {
      // emit
      socket.user(user, 'chat.create', await chat.sanitise());
    });

    // return chat
    return true;
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

    // set style
    chat.set(`${opts.user.get('_id').toString()}.${key}`, value);

    // save chat
    await chat.save();

    // emit to socket
    socket.user(opts.user, `model.update.chat.${chat.get('_id').toString()}`, {
      [key] : chat.get(`${opts.user.get('_id').toString()}.${key}`),
    });

    // return chat
    return await chat.sanitise(opts.user);
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
