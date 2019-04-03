
// require local dependencies
const icons = require('font-awesome-filetypes');
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
      embeds : await Promise.all((await this.get('embeds') || []).map(async (embed) => {
        // sanitise embed
        const s = await embed.sanitise();

        // set type
        s.type = embed.constructor.name.toLowerCase();
        s.icon = icons.getClassNameForExtension(s.name.split('.').pop());

        // return sanitised
        return s;
      })),
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
