
// import dependencies
const uuid        = require('uuid');
const icons       = require('font-awesome-filetypes');
const socket      = require('socket');
const Helper      = require('helper');
const toText      = require('html-to-text');
const autolinker  = require('autolinker');

// require models
const Chat    = model('chat');
const File    = model('file');
const Image   = model('image');
const CUser   = model('chatUser');
const Message = model('chatMessage');

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

    // bind CRUD methods
    this.all = this.all.bind(this);
    this.create = this.create.bind(this);

    // bind member methods
    this.member = {
      set    : this.memberSet.bind(this),
      read   : this.memberRead.bind(this),
      typing : this.memberTyping.bind(this),
    };

    // send message
    this.message = {
      set         : this.messageSet.bind(this),
      send        : this.messageSend.bind(this),
      react       : this.messageReact.bind(this),
      remove      : this.messageRemove.bind(this),
      buttonPress : this.messageButtonPress.bind(this),
    };
  }

  // ////////////////////////////////////////////////////////////////////////////
  //
  // CRUD METHODS
  //
  // ////////////////////////////////////////////////////////////////////////////

  /**
   * creates or finds existing chat
   *
   * @param  {*} member
   *
   * @return {*}
   */
  async all(member) {
    // return chats by member
    return (await Promise.all((await CUser.where({
      'member.id' : member.get('_id'),
    }).ne('opened', false).find()).map(cUser => cUser.get('chat')))).filter(chat => chat);
  }

  /**
   * creates or finds existing chat
   *
   * @param  {*}     member
   * @param  {Array} members
   *
   * @return {*}
   */
  async create(member, members, opts = {}, hash = null, updates = null, passthrough = false) {
    // no chats with one or no users
    if (members.length < 2) return null;

    if (hash === null) hash = members.map(m => m.id || m.get('_id')).sort().join(':');

    // load chat
    const chat = await Chat.findOne({ hash }) || new Chat({
      type    : 'public',
      uuid    : uuid(),
      creator : member,
      hash,
    });

    // update chat members
    chat.set('members', members);

    // update chat with all provided options
    if (opts) chat.set(opts);

    // set data
    const data = {};

    // await hook
    await this.eden.hook('eden.chat.create', {
      chat, data, member,
    }, async () => {
      // save message
      if (!data.prevent) await chat.save();
    });

    // stop here if a hook stopped a save
    if (!chat.get('_id')) return null;

    // emit
    this.eden.emit('eden.chat.create', await chat.sanitise(), true);

    // emit
    if (member) socket.user(member, 'chat.create', await chat.sanitise(member));

    const membersWithUpdates = [];
    const membersWithoutUpdates = [];

    for (const m of members) {
      if (updates[m.get('_id')] && updates[m.get('_id')].length > 0) {
        membersWithUpdates.push(m);
      } else {
        membersWithoutUpdates.push(m);
      }
    }

    (async () => {
      for (const m of membersWithUpdates) {
        await this.memberSets(m, chat, updates[m.get('_id')], passthrough);
      }

      const unlock = await this.eden.lock(`chat.addingcusers.${hash}`);

      try {
        if (await this.eden.get(`chat.addcusers.${hash}`)) {
          return;
        }

        for (const m of membersWithoutUpdates) {
          const cUserExists = (await CUser.where({
            'member.id' : m.get('_id'),
            'chat.id'   : chat.get('_id'),
          }).count()) > 0;

          if (!cUserExists) {
            const cUser = new CUser({
              member : m,
              chat,
            });

            await cUser.save();
          }
        }

        await this.eden.set(`chat.addcusers.${hash}`);
      } catch (err) {
        unlock();
        global.printError(err);
      }

      unlock();
    })();

    return chat;
  }

  // ////////////////////////////////////////////////////////////////////////////
  //
  // MEMBER METHODS
  //
  // ////////////////////////////////////////////////////////////////////////////

  /**
   * member set action
   */
  async memberSets(member, chat, updates, passthrough = false) {
    const unlock = passthrough ? await member.lock() : null;

    let cUser = null;

    try {
      let alreadyDone = null;

      if (passthrough) {
        alreadyDone = true;

        for (const [key, value] of updates) {
          if (chat.get(key) !== value) {
            alreadyDone = false;
            return;
          }
        }
      } else {
        alreadyDone = (await CUser.where({
          'member.id' : member.get('_id'),
          'chat.id'   : chat.get('_id'),

          ...updates.reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {}),
        }).count()) > 0;
      }

      if (!alreadyDone) {
        cUser = await CUser.findOne({
          'chat.id'   : chat.get('_id'),
          'member.id' : member.get('_id'),
        }) || new CUser({
          chat,
          member,
        });

        for (const [key, value] of updates) {
          cUser.set(key, value);
          if (passthrough) member.set(`chat.${key}`, value);
        }

        const data = {};

        await this.eden.hook('eden.chat.member.sets', {
          chat, data, updates, member, cUser,
        }, async () => {
          if (!data.prevent) {
            await cUser.save();
            if (passthrough) await member.save();
          }
        });
      }
    } catch (err) {
      if (unlock !== null) unlock();
      throw err;
    }

    // can chat id really ever be null?
    if (cUser && chat.get('_id')) {
      socket.user(member, `model.update.chat.${chat.get('_id')}`, updates.map(([key]) => {
        return cUser.get(key);
      }).reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {}));
    }
  }

  /**
   * member set action
   *
   * @param  {*}      member
   * @param  {Chat}   chat
   * @param  {String} key
   * @param  {*}      value
   *
   * @return {Promise}
   */
  async memberSet(member, chat, key, value, passthrough = false) {
    return await this.memberSets(member, chat, [{ [key] : value }], passthrough);
  }

  /**
   * member set action
   *
   * @param  {*}    member
   * @param  {Chat} chat
   * @param  {Date} read
   *
   * @return {Promise}
   */
  async memberRead(member, chat, read) {
    // get chat user
    const cUser = await CUser.findOne({
      'chat.id'   : chat.get('_id'),
      'member.id' : member.get('_id'),
    }) || new CUser({
      chat,
      member,
    });

    // set read
    cUser.set('read', new Date(read));
    cUser.set('unread', await Message.where({
      'chat.id' : chat.get('_id'),
    }).ne('from.id', member.get('_id')).gt('created_at', new Date(cUser.get('read') || 0)).count());

    // save chat
    await cUser.save();

    // emit to socket
    socket.user(member, `model.update.chat.${chat.get('_id')}`, {
      unread : cUser.get('unread'),
    });

    // emit read
    this.eden.emit('eden.chat.member.read', {
      id     : chat.get('_id'),
      when   : cUser.get('read'),
      member : member.get('_id'),
    }, true);

    // return cuser
    return cUser;
  }

  /**
   * member set action
   *
   * @param  {*}       member
   * @param  {Chat}    chat
   * @param  {Boolean} isTyping
   *
   * @return {Promise}
   */
  async memberTyping(member, chat, isTyping) {
    // set typing
    if (isTyping) {
      // set typing
      chat.set(`typing.${member.get('_id')}`, new Date());
    } else {
      // unset typing
      chat.unset(`typing.${member.get('_id')}`);
    }

    // save chat
    await chat.save();

    // sanitise chat
    const sanitised = await chat.sanitise();

    // emit to socket
    socket.room(`chat.${chat.get('_id')}`, `chat.${chat.get('_id')}.typing`, sanitised.typing.map((item) => {
      // return item
      return {
        when   : item.when.getTime() - ((new Date()).getTime() - 5 * 1000),
        member : item.member,
      };
    }));

    // emit read
    this.eden.emit('eden.chat.member.typing', {
      id       : chat.get('_id'),
      member   : member.get('_id'),
      isTyping : chat.get(`typing.${member.get('_id')}`),
    }, true);

    // return typing
    return chat;
  }


  // ////////////////////////////////////////////////////////////////////////////
  //
  // MESSAGE METHODS
  //
  // ////////////////////////////////////////////////////////////////////////////

  /**
   * message send method
   *
   * @param  {*}      member
   * @param  {Chat}   chat
   * @param  {Object} data
   *
   * @return {Promise}
   */
  async messageSend(member, chat, data) {
    // create message
    const message = new Message({
      chat,

      raw     : data.message,
      from    : member,
      meta    : data.meta || {},
      react   : data.react || {},
      uuid    : data.uuid || uuid(),
      message : autolinker.link(toText.fromString(data.message)),
      embeds  : (data.embed || data.embeds) || [{
        url       : data.url || null,
        tag       : data.tag || 'rich',
        type      : data.type || 'rich',
        color     : data.color || null,
        title     : data.title || null,
        image     : data.image || null,
        fields    : data.fields || [],
        buttons   : data.buttons || [],
        primary   : data.embed && typeof data.primary === 'undefined' ? true : (data.primary || false),
        thumbnail : data.thumbnail || null,
      }],
    });

    // check embeds
    if (data.embeds) {
      // allow one
      if (!Array.isArray(data.embeds)) data.embeds = [data.embeds];

      // loop embeds
      const embeds = (await Promise.all(data.embeds.map(async (embed) => {
        // get embeds
        if (typeof embed === 'string') {
          // try/catch
          try {
            // await
            const image = await File.findById(embed) || await Image.findById(embed);

            // set embed
            if (image) {
              // return image
              return {
                tag  : image.constructor.name.toLowerCase(),
                icon : icons.getClassNameForExtension(image.get('name').split('.').pop()),
                type : image.constructor.name.toLowerCase(),
                data : await image.sanitise(),
              };
            }
          } catch (err) { global.printError(err); }
        }

        // return null
        return embed;
      }))).filter(e => e);

      // set embeds
      message.set('embeds', embeds);
    }

    // await hook
    await this.eden.hook('eden.chat.message', {
      data, message, chat, member,
    }, async () => {
      // save message
      if (!data.prevent) await message.save();
    });

    // check id
    if (!message.get('_id')) return null;

    // save chat
    await chat.save();

    // emit
    this.eden.emit('eden.chat.message', await message.sanitise(true), true);

    // emit to socket
    socket.room(`chat.${chat.get('_id')}`, `chat.${chat.get('_id')}.message`, await message.sanitise());

    // return message
    return message;
  }

  /**
   * message set action
   *
   * @param  {Chat}   message
   * @param  {String} key
   * @param  {*} value
   *
   * @return {Promise}
   */
  async messageSet(message, key, value) {
    // set value
    message.set(key, value);

    const data = {};

    await this.eden.hook('eden.chat.message.set', {
      data, key, value, message,
    }, async () => {
      // save message
      if (!data.prevent) await message.save();
    });

    // emit to socket
    socket.room(`chat.${message.get('chat.id')}`, `model.update.message.${message.get('_id')}`, {
      [key] : message.get(key),
    });
  }

  /**
   * message react action
   *
   * @param  {*}      member
   * @param  {Chat}   message
   * @param  {String} react
   *
   * @return {Promise}
   */
  async messageReact(member, message, react) {
    // check reaction
    if (message.get(`react.${react}.${member.id || member.get('_id')}`)) {
      // unset reaction
      message.unset(`react.${react}.${member.id || member.get('_id')}`);
    } else {
      // set reaction
      message.set(`react.${react}.${member.id || member.get('_id')}`, new Date());
    }

    // set data
    const data = {};

    // do hook
    await this.eden.hook('eden.chat.message.react', {
      data, react, message, member,
    }, async () => {
      // save message
      if (!data.prevent) await message.save();
    });

    // emit to socket
    socket.room(`chat.${message.get('chat.id')}`, `chat.${message.get('chat.id')}.react`, {
      [`react.${react}.${member.id || member.get('_id')}`] : message.get(`react.${react}.${member.id || member.get('_id')}`),
    });
  }

  /**
   * message react action
   *
   * @param  {Chat} message
   *
   * @return {Promise}
   */
  async messageRemove(message) {
    // set data
    const data = {};

    // hook
    await this.eden.hook('eden.chat.message.remove', {
      data, message,
    }, async () => {
      // save message
      if (!data.prevent) await message.save();
    });

    // emit to socket
    socket.room(`chat.${message.get('chat.id')}`, `chat.${message.get('chat.id')}.remove`, {
      'message.remove' : message.get('uuid'),
    });

    // remove message
    await message.remove();
  }

  /**
   * message button press action
   *
   * @param  {*}      member
   * @param  {Chat}   message
   * @param  {String} button
   *
   * @return {Promise}
   */
  async messageButtonPress(member, message, button) {
    const evtData = {
      button,
      message : await message.sanitise(true),
      member  : member.id || member.get('_id'),
    };

    this.eden.emit('eden.chat.message.buttonPress', evtData, true);
    this.eden.emit(`eden.chat.message.buttonPress.${message.get('_id')}`, evtData, true);
  }
}

/**
 * export built chat helper
 *
 * @type {chatHelper}
 */
module.exports = new ChatHelper();
