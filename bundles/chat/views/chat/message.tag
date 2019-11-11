<chat-message>
  <div class="message-data { message.from === this.user.get('id') ? 'text-left' : 'text-right' }">
    { getFrom(message) ? getFrom(message).username : '' }, <small class="text-muted">{ getDate(message) }</small>
  </div>

  <div class="message { message.from === this.user.get('id') ? 'my-message' : 'other-message float-right text-right' }">
    <raw data={ { 'html' : message.message } } />
  </div>

  <div ref="embeds" if={ (message.embeds || []).length } class="mb-2 chat-embeds { message.from !== this.user.get('id') ? 'text-right' : '' }">
    <a each={ embed, i in message.embeds } class="embed text-body" style="{ embed.type === 'image' ? 'background-image:url(' + (embed.data ? this.media.url(embed.data, '2x') : embed.thumb) + ');' : '' }" title={ embed.name } target={ embed.id ? '_blank' : null } href={ embed.data ? this.media.url(embed.data) : '#' }>
      <i class="fa { embed.data ? embed.data.icon : embed.icon }" />
      <span class="embed-name">
        { embed.data ? embed.data.name : embed.name }
      </span>
      <div class="progress" if={ !embed.data }>
        <div class="progress-bar" role="progressbar" aria-valuenow={ embed.progress } aria-valuemin="0" aria-valuemax="100" style="width: { embed.progress }%;"></div>
      </div>
    </a>
  </div>

  <script>
    // do mixins
    this.mixin('user');
    this.mixin('media');

    // require dependencies
    const moment    = require('moment');
    const Scrollbar = require('perfect-scrollbar');

    /**
     * gets from
     *
     * @param  {Object} message
     *
     * @return {Object}
     */
    getFrom(message) {
      // return usernames
      return opts.chat.get('members').find((member) => member.id === message.from);
    }

    /**
     * get date
     *
     * @param  {Object} message
     *
     * @return {String}
     */
    getDate(message) {
      // from now
      return moment(message.created_at).fromNow();
    }

    /**
     * do scroll
     *
     * @return {*}
     */
    doScroll() {
      // check embeds
      if (this.refs.embeds && !this.embedScroll) {
        // set embed scrollbar
        this.embedScroll = new Scrollbar(this.refs.embeds);
      } else if (!this.refs.embeds) {
        // reset
        this.embedScroll = null;
      }
    }

    // on mount
    this.on('mount', () => {
      // check frontend
      if (!this.eden.frontend || !this.user.exists()) return;

      // scroll to bottom
      this.doScroll();
    });
  </script>
</chat-message>
