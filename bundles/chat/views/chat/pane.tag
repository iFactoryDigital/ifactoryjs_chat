<chat-pane>
  <div class="card card-chat{ this.chat.get('closed') ? ' chat-closed' : ' chat-open' }">
    <div class="card-header">
      <div class="row row-eq-height">
        <div class="col-7 d-flex align-items-center">
          <div class="w-100 text-overflow">
            { getUsernames() }
          </div>
        </div>
        <div class="col-5">
          <div class="btn-group btn-group-sm float-right">
            <button class="btn btn-secondary" if={ this.chat.get('style') } onclick={ onReturn }>
              <i class="fa fa-undo" />
            </button>
            <button class="btn btn-secondary btn-move">
              <i class="fa fa-arrows" />
            </button>
            <button class="btn btn-secondary" onclick={ onToggleOpen }>
              <i class="fa fa-{ this.chat.get('closed') ? 'plus' : 'minus' }" />
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="card-body" show={ !this.chat.get('closed') }>
      <ul>
      
        <li class="clearfix">
          <div class="message-data text-right">
            Vincent, <small class="text-muted">10:10 AM, Today</small>
          </div>
          
          <div class="message other-message float-right">
            Hi Vincent, how are you? How is the project coming along?
          </div>
        </li>
        
        <li class="clearfix">
          <div class="message-data text-left">
            Olia, <small class="text-muted">10:10 AM, Today</small>
          </div>
          
          <div class="message my-message left-right">
            Hi Vincent, how are you? How is the project coming along?
          </div>
        </li>
        
      </ul>
    </div>
    <div class="card-footer p-2" show={ !this.chat.get('closed') }>
      <div class="form-group m-0">
        <div class="input-group">
          <input class="form-control" type="text" />
          <div class="input-group-append">
            <button class="btn btn-primary">
              <i class="fa fa-paper-plane" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // do mixin
    this.mixin('user');

    // set chat
    this.chat = opts.chat;
    
    /**
     * on toggle open
     *
     * @param  {Event} e
     *
     * @return {*}
     */
    onReturn(e) {
      // prevent default
      e.preventDefault();
      e.stopPropagation();
      
      // set style
      this.chat.set('style', null);
      
      // set chat style
      socket.call('chat.user.set', this.chat.get('id'), 'style', this.chat.get('style'));
    }
    
    /**
     * on toggle open
     *
     * @param  {Event} e
     *
     * @return {*}
     */
    onToggleOpen(e) {
      // prevent default
      e.preventDefault();
      e.stopPropagation();
      
      // on toggle open
      this.chat.set('closed', !this.chat.get('closed'));
      
      // set chat style
      socket.call('chat.user.set', this.chat.get('id'), 'closed', this.chat.get('closed'));
      
      // update view
      this.update();
    }
    
    /**
     * gets usernames
     *
     * @return {*}
     */
    getUsernames() {
      // return usernames
      return this.chat.get('users').filter((user) => user.id !== this.user.get('id')).map((user) => user.username).join(', ');
    }
  </script>
</chat-pane>
