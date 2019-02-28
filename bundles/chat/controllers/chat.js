
// Require dependencies
const uuid        = require('uuid');
const socket      = require('socket');
const toText      = require('html-to-text');
const autolinker  = require('autolinker');
const Controller  = require('controller');
const escapeRegex = require('escape-string-regexp');

// Require models
const Chat    = model('chat');
const File    = model('file');
const User    = model('user');
const Image   = model('image');
const Message = model('chatMessage');

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
    const chats = await Chat.where({
      [`${opts.user.get('_id').toString()}.opened`] : true,
    }).find();

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

    // load chat
    const chat = await Chat.where({
      hash : users.map(user => user.get('_id').toString()).sort().join(':'),
    }).findOne() || new Chat({
      users,

      uuid    : uuid(),
      hash    : users.map(user => user.get('_id').toString()).sort().join(':'),
      creator : opts.user,
    });

    // set data
    const data = {};

    // await hook
    await this.eden.hook('eden.chat.create', {
      ids, chat, data, opts,
    }, async () => {
      // save message
      if (!data.prevent) await chat.save();
    });

    // hooks
    if (!chat.get('_id')) return null;

    // emit created
    users.forEach(async (user) => {
      // emit
      socket.user(user, 'chat.create', await chat.sanitise(user));
    });

    // emit
    this.eden.emit('eden.chat.create', await chat.sanitise(), true);

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

    // set style
    chat.set(`${opts.user.get('_id').toString()}.${key}`, value);

    // set data
    const data = {};

    // await hook
    await this.eden.hook('eden.chat.set', {
      chat, data, key, value, opts,
    }, async () => {
      // save message
      if (!data.prevent) await chat.save();
    });

    // hooks
    if (!chat.get('_id')) return null;

    // emit to socket
    socket.user(opts.user, `model.update.chat.${chat.get('_id').toString()}`, {
      [key] : chat.get(`${opts.user.get('_id').toString()}.${key}`),
    });

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

    // create message
    const message = new Message({
      chat,

      from    : opts.user,
      uuid    : data.uuid,
      message : autolinker.link(toText.fromString(data.message)),
    });

    // check embeds
    if (data.embeds) {
      // loop embeds
      const embeds = (await Promise.all(data.embeds.map(async (embed) => {
        try {
          // await
          return await File.findById(embed) || await Image.findById(embed);
        } catch (e) {}

        // return null
        return null;
      }))).filter(e => e);

      // set embeds
      message.set('embeds', embeds);
    }

    // await hook
    await this.eden.hook('eden.chat.message', {
      data, message, id, opts,
    }, async () => {
      // save message
      if (!data.prevent) await message.save();
    });

    // check id
    if (!message.get('_id')) return null;

    // sanitise message
    const sanitised = await message.sanitise();

    // emit
    this.eden.emit('eden.chat.message', sanitised, true);

    // emit to socket
    socket.room(`chat.${chat.get('_id').toString()}`, `chat.${chat.get('_id').toString()}.message`, sanitised);

    // return chat
    return await message.sanitise();
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
