
// require local dependencies
const Model = require('model');

/**
 * create chat model
 */
class ChatMessage extends Model {
  /**
   * construct chat model
   */
  constructor(...args) {
    // run super
    super(...args);

    // bind methods
    this.sanitise = this.sanitise.bind(this);
  }

  /**
   * sanitises chat model
   *
   * @return {*}
   */
  async sanitise(sensitive = false, type) {
    // return object
    const sanitised = {
      id     : this.get('_id') ? this.get('_id').toString() : null,
      from   : this.get('from.id'),
      chat   : this.get('chat.id'),
      uuid   : this.get('uuid'),
      embeds : (await this.get('embeds') || []).map((embed) => {
        // make rich embed
        if (!embed.type) {
          // set values
          embed.tag = 'rich';
          embed.type = 'rich';
        }

        // return embed
        return embed;
      }),
      message    : this.get('message'),
      created_at : this.get('created_at'),
      updated_at : this.get('updated_at'),
    };

    if (sensitive) {
      sanitised.raw = this.get('raw');
    }

    // await hook
    await this.eden.hook('chatmessage.sanitise', {
      sanitised,

      message : this,
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
