
// require local dependencies
const Model = require('model');

/**
 * create chat model
 */
class ChatMessage extends Model {
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
  async sanitise() {
    // return object
    const sanitised = {
      id         : this.get('_id') ? this.get('_id').toString() : null,
      created_at : this.get('created_at'),
      updated_at : this.get('updated_at'),
    };

    // await hook
    await this.eden.hook('chatmessage.sanitise', {
      sanitised,
      chat : this,
    });

    // return sanitised
    return sanitised;
  }
}

/**
 * export ChatMessage model
 *
 * @type {ChatMessage}
 */
module.exports = ChatMessage;
