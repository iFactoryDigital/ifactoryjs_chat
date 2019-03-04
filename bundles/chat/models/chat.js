
// require local dependencies
const Model = require('model');

// require messages
const CUser   = model('chatUser');
const Message = model('chatMessage');

/**
 * create chat model
 */
class Chat extends Model {
  /**
   * construct chat model
   */
  constructor() {
    // run super
    super(...arguments);

    // bind methods
    this.sanitise = this.sanitise.bind(this);
  }

  /**
   * sanitises chat model
   *
   * @return {*}
   */
  async sanitise(user) {
    // return object
    const sanitised = {
      id       : this.get('_id') ? this.get('_id').toString() : null,
      uuid     : this.get('uuid'),
      hash     : this.get('hash'),
      members  : await Promise.all((await this.get('members') || []).map(u => u.sanitise())),
      messages : (await Promise.all((await Message.where({
        'chat.id' : this.get('_id') ? this.get('_id').toString() : null,
      }).sort('created_at', -1).limit(25).find()).map((message) => {
        // sanitise message
        return message.sanitise();
      }))).reverse(),
      created_at : this.get('created_at'),
      updated_at : this.get('updated_at'),
    };

    // if user
    if (user && this.get('_id')) {
      // user stuff
      const userStuff = await CUser.findOne({
        'chat.id' : this.get('_id').toString(),
        'user.id' : user.get('_id').toString(),
      }) || new CUser();

      // loop user stuff
      Object.keys(userStuff.get()).filter(key => !['chat', 'user', 'created_at', 'updated_at'].includes(key)).forEach((key) => {
        sanitised[key] = userStuff.get(key);
      });
    }

    // typing
    sanitised.typing = Object.keys(this.get('typing') || {}).filter((id) => {
      // return date greater than 5 secons
      return this.get(`typing.${id}`) > new Date((new Date()).getTime() - (5 * 1000));
    }).map((id) => {
      // return typing
      return {
        when   : new Date(this.get(`typing.${id}`)),
        member : id,
      };
    });

    // await hook
    await this.eden.hook('chat.sanitise', {
      sanitised,
      chat : this,
    });

    // return sanitised
    return sanitised;
  }
}

/**
 * export Chat model
 *
 * @type {Chat}
 */
module.exports = Chat;
