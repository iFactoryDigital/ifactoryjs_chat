
// require local dependencies
const Model = require('model');

/**
 * create chat model
 */
class ChatUser extends Model {
  /**
   * construct chat model
   */
constructor(...args) {
    // Run super
    super(...args);

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
      id : this.get('_id') ? this.get('_id').toString() : null,
    };

    // await hook
    await this.eden.hook('chatuser.sanitise', {
      sanitised,

      message : this,
    });

    // return sanitised
    return sanitised;
  }
}

/**
 * export ChatUser model
 *
 * @type {ChatUser}
 */
module.exports = ChatUser;
