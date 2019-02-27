
// require local dependencies
const Model = require('model');

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
      id         : this.get('_id') ? this.get('_id').toString() : null,
      uuid       : this.get('uuid'),
      hash       : this.get('hash'),
      users      : await Promise.all((await this.get('users') || []).map(u => u.sanitise())),
      created_at : this.get('created_at'),
      updated_at : this.get('updated_at'),
    };

    // if user
    if (user) {
      // user stuff
      const userStuff = this.get(user.get('_id').toString()) || {};

      // loop user stuff
      Object.keys(userStuff).forEach((key) => {
        sanitised[key] = userStuff[key];
      });
    }

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
