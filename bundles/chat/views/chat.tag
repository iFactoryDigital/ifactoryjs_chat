<chat>
  <div if={ this.user.exists() } class={ 'chat' : true, 'd-none' : !this.eden.frontend } style="right:{ this.offset || 0 }px">
    <div class="chat-chats { 'is-open' : this.open }">
    
      <div class={ 'card card-chats mb-3' : true, 'd-none' : !this.open }>
        <div class="card-header p-2">
          <div class="form-group m-0">
            <div class="input-group">
              <input class="form-control" type="search" ref="search" onkeyup={ onKeyUp } />
              <div class="input-group-append">
                <button class="btn btn-primary" onclick={ onSearch }>
                  <i class="fa fa-search" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="text-center p-3" if={ this.loading }>
            <i class="fa fa-3x fa-spinner fa-spin" />
          </div>
          <div each={ user, i in this.users } class="chat-user" onclick={ onChat }>
            { user.username }
          </div>
        </div>
      </div>
      
      <button class="btn btn-open btn-primary" onclick={ onToggleOpen }>
        <i class="fa fa-comments" />
      </button>
      
      <div ref="container">
        <chat-pane each={ chat, i in getChats() } if={ !chat.get('style') } on-close={ onCloseChat } chat={ chat } i={ i } class="chat-pane chat-pane-{ i }" data-chat={ chat.get('uuid') } />
        <chat-pane each={ chat, i in getChats(true) } if={ chat.get('style') } on-close={ onCloseChat } chat={ chat } i={ i } class="chat-pane chat-free" data-chat={ chat.get('uuid') } style="top: { chat.get('style.top') }; left: { chat.get('style.left') };" />
      </div>
    </div>
  </div>

  <script>
    // do mixins
    this.mixin('user');
    this.mixin('model');

    // set open
    this.open    = false;
    this.chats   = (opts.chats || []).map(chat => this.model('chat', chat));
    this.users   = [];
    this.actives = [];
    this.loading = true;
    
    /**
     * on chat
     *
     * @param  {Event} e
     */
    async onChat(e) {
      // prevent default
      e.preventDefault();
      e.stopPropagation();
      
      // get user
      const user = e.item.user;
      
      // set loading
      user.loading = true;
      
      // set chat
      this.update();
      
      // create chat
      const chat = await socket.call('chat.create', [this.user.get('id'), user.id]);
      await socket.call('chat.user.set', chat.id, 'opened', true);
      
      // set loading
      user.loading = false;
      
      // set chat
      this.update();
    }
    
    /**
     * on close chat
     *
     * @param  {Chat} chat
     */
    async onCloseChat(chat) {      
      // filter chats
      this.chats = this.chats.filter((c) => c.get('id') !== chat.get('id'));
      
      // set opened
      await socket.call('chat.user.set', chat.get('id'), 'opened', false);
      await socket.call('chat.user.set', chat.get('id'), 'style', null);
      await socket.call('chat.user.set', chat.get('id'), 'closed', false);
    }
    
    /**
     * on send
     *
     * @param  {Event} e
     *
     * @return {*}
     */
    onSearch(e) {
      // prevent default
      e.preventDefault();
      e.stopPropagation();
      
      // load users
      this.loadUsers();
    }
    
    /**
     * on keyup
     *
     * @param  {Event} e
     */
    onKeyUp(e) {
      // enter pressed
      if ((e.keyCode ? e.keyCode : e.which) === 13) {
        // send message
        this.onSearch(e);
      }
    }
    
    /**
     * load users
     *
     * @return {Promise}
     */
    async loadUsers() {
      // set loading
      this.loading = true;
      
      // update view
      this.update();
      
      // load users
      this.users = await socket.call('chat.users', this.refs.search.value);
      
      // set loading
      this.loading = false;
      
      // update view
      this.update();
    }
    
    /**
     * load users
     *
     * @return {Promise}
     */
    async loadChats() {
      // set loading
      this.loading = true;
      
      // update view
      this.update();
      
      // load users
      this.chats = (await socket.call('chat.chats') || []).map(chat => this.model('chat', chat));
      
      // set loading
      this.loading = false;
      
      // update view
      this.update();
    }
    
    /**
     * get chats
     *
     * @param  {Boolean} free
     *
     * @return {*}
     */
    getChats(free) {
      // filter chat
      return this.chats.filter((chat) => {
        // check style
        return free && chat.get('style') || !free && !chat.get('style');
      });
    }
    
    /**
     * on toggle open
     *
     * @param  {Event} e
     */
    onToggleOpen(e) {
      // prevent default
      e.preventDefault();
      e.stopPropagation();
      
      // toggle open
      this.open = !this.open;
      
      // update view
      this.update();
    }
    
    /**
     * on toggle chat
     *
     * @param  {Event} e
     */
    onToggleActive(e) {
      // actives
      if (this.actives.includes(e.item.chat)) {
        // filter out
        this.actives = this.actives.filter((item) => item !== e.item.chat.get('uuid'));
      } else {
        // push active chat
        this.actives.push(e.item.chat.get('uuid'));
      }
      
      // update view
      this.update();
    }
    
    /**
     * set dragula
     *
     * @return {*}
     */
    dragula() {
      // require dragula
      const dragula = require('dragula');
      
      // get elements
      this.drake =  dragula([this.refs.container], {
        moves : function (el, source, handle, sibling) {
          // get parent
          let parent = handle;
          
          // check moves
          while (parent && parent.getAttribute) {
            // return true if has card header
            if ((parent.getAttribute('class') || '').includes('card-header')) return true;
            if ((parent.getAttribute('class') || '').includes('btn')) return false;
            
            // set parent
            parent = parent.parentNode;
          }
        },
      }).on('drag', (el, source) => {
        // set opacity
        el.style.opacity = 0;
      }).on('cancel', (el, target, source, sibling) => {
        // get style element
        const clone = document.querySelector('.gu-mirror[data-chat="' + el.getAttribute('data-chat') + '"]');
        
        // get styleW
        const chat = this.chats.find((chat) => chat.get('uuid') === el.getAttribute('data-chat'));
        
        // set style
        chat.set('style', {
          top  : clone.style.top,
          left : clone.style.left,
        });
        
        // set chat style
        socket.call('chat.user.set', chat.get('id'), 'style', chat.get('style'));
        
        // update view
        this.update();
      });
    }
    
    /**
     * on created chat
     *
     * @param  {Object} chat
     */
    onCreated(chat) {
      // check chat exists
      if (this.chats.find(c => c.get('uuid') === chat.uuid)) {
        return;
      }
      
      // push chat
      this.chats.push(this.model('chat', chat));
      
      // update view
      this.update();
    }
    
    // on mount
    this.on('unmount', () => {
      // check frontend
      if (!this.eden.frontend) return;
      
      // on created
      socket.off('chat.create', this.onCreated);
    });
    
    // on mount
    this.on('mount', () => {
      // check frontend
      if (!this.eden.frontend || !this.user.exists()) return;
      
      // get sidebar width
      this.offset = this.root.parentNode.offsetWidth - this.root.parentNode.clientWidth;
      this.update();
      
      // setup dragula
      this.dragula();
      
      // load users
      this.loadUsers();
      this.loadChats();
      
      // on created
      socket.on('chat.create', this.onCreated);
    });
  </script>
</chat>
