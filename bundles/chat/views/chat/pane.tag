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
            <button class="btn btn-secondary" onclick={ onToggleOpen }>
              <i class="fa fa-{ this.chat.get('closed') ? 'plus' : 'minus' }" />
            </button>
            <button class="btn btn-danger" onclick={ onClose }>
              <i class="fa fa-times" />
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="card-body" show={ !this.chat.get('closed') } ref="messages">
      <ul>
        
        <li each={ message, i in this.messages } data-is="chat-message" class="clearfix" chat={ chat } message={ message } />
        
      </ul>
    </div>
    <div class="card-footer p-2" show={ !this.chat.get('closed') }>
      <div ref="embeds" if={ this.embeds.length } class="mb-2 chat-embeds">
        <div each={ embed, i in this.embeds } class="embed" style="{ embed.type === 'image' ? 'background-image:url(' + embed.thumb + ');' : '' }" title={ embed.name }>
          <i class="fa { embed.icon }" />
          <span class="embed-name">
            { embed.name }
          </span>
          <button class="btn btn-sm btn-danger" onclick={ onRemoveEmbed }>
            <i class="fa fa-times" />
          </button>
        </div>
      </div>
      <div class="form-group m-0">
        <div class="input-group">
        <div class="input-group-prepend">
          <button class="btn btn-file btn-primary">
            <input type="file" ref="upload" onchange={ onFile } multiple />
            <i class="fa fa-plus" />
          </button>
        </div>
          <input class="form-control" type="text" ref="message" onkeyup={ onKeyUp } />
          <div class="input-group-append">
            <button class="btn btn-primary" onclick={ onSend }>
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
    this.mixin('media');

    // set chat
    this.chat     = opts.chat;
    this.embeds   = [];
    this.loading  = [];
    this.messages = this.chat.get('messages') || [];
    
    // require dependencies
    const uuid      = require('uuid');
    const icons     = require('font-awesome-filetypes');
    const moment    = require('moment');
    const Scrollbar = require('perfect-scrollbar');
    
    /**
     * on close
     *
     * @param  {Event} e
     *
     * @return {*}
     */
    onClose(e) {
      // prevent default
      e.preventDefault();
      e.stopPropagation();
      
      // close
      opts.onClose(this.chat);
    }
    
    /**
     * on send
     *
     * @param  {Event} e
     *
     * @return {*}
     */
    async onSend(e) {
      // prevent default
      e.preventDefault();
      e.stopPropagation();
      
      // return no message
      if ((!this.refs.message.value || '').trim().length) {
        return;
      }

      // create message
      const message = {
        from    : this.user.get('id'),
        uuid    : uuid(),
        embeds  : this.embeds,
        message : this.refs.message.value,
      };
      
      // push message
      this.embeds = [];
      this.refs.message.value = '';
      
      // update view
      this.onMessage(message);
      
      // check embeds
      if (message.embeds) {
        // do fetch request
        const images = await Promise.all(message.embeds.map((embed) => {
          // ajax upload
          return this._ajaxUpload(embed, embed.type);
        }));
        
        // update to remove loading
        this.update();
        
        // set chat style
        socket.call('chat.message', this.chat.get('id'), Object.assign({}, message, {
          embeds : images.map((image) => image.id),
        }));
      } else {
        // set chat style
        socket.call('chat.message', this.chat.get('id'), message);
      }
    }
    
    /**
     * on send
     *
     * @param  {Event} e
     *
     * @return {*}
     */
    onFile(e) {      
      // get value
      const files = Array.from(e.target.files || []);
      
      // loop files
      files.forEach(async (file) => {
        // get embed
        const embed = {
          'file'     : file,
          'name'     : file.name,
          'icon'     : icons.getClassNameForExtension(file.name.split('.').pop()),
          'type'     : icons.getClassNameForExtension(file.name.split('.').pop()).includes('image') ? 'image' : 'file',
          'size'     : file.size,
          'temp'     : uuid(),
          'uploaded' : 0
        };
        
        // if image
        if (embed.type === 'image') {
          // create new reader
          const read = new FileReader();

          // onload
          const wait = new Promise((resolve) => {
            // await promise
            read.onload = () => {
              // set result
              embed.thumb = read.result;
              
              // resolve
              resolve();
            };
          });
  
          // read file
          read.readAsDataURL(file);
          
          // wait
          await wait;
        }
        
        // push embed
        this.embeds.push(embed);
        
        // update
        this.update();
      });
    }
    
    /**
     * on remove embed
     *
     * @param  {Event} e
     *
     * @return {*}
     */
    onRemoveEmbed(e) {
      // prevent default
      e.preventDefault();
      e.stopPropagation();
      
      // check stuff
      this.embeds = this.embeds.filter(embed => embed.temp !== e.item.embed.temp);
      
      // update
      this.update();
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
        this.onSend(e);
      }
    }
    
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
      
      // update
      this.parent.update();
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
     * on toggle open
     *
     * @param  {Event} e
     *
     * @return {*}
     */
    onMessage(message) {
      // check found
      const found = this.messages.find(m => m.uuid === message.uuid);
      
      // check found
      if (found) {
        // set stuff
        Object.keys(message).forEach((key) => {
          // set value
          found[key] = message[key];
        });
      } else {
        // push message
        this.messages.push(message);
      }
      
      // update view
      this.update();
      
      // scroll to bottom
      this.refs.messages.scrollTop = this.refs.messages.scrollHeight;
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

    /**
     * remove value from upload
     *
     * @param {Object} val
     *
     * @private
     */
    _remove (val) {
      // let id
      let id = val.id;

      // check uuid
      if (val.temp) id = val.temp;

      // loop values
      for (var i = 0; i < this.value.length; i++) {
        // check value
        if (this.value[i].id === id || this.value[i].temp === id) {
          // set value
          this.value.splice(i, 1);

          // return update
          return this.update();
        }
      }
    }

    /**
     * ajax upload function
     *
     * @param {Object} value
     *
     * @private
     */
    _ajaxUpload (value, type) {
      // require uuid
      const uuid = require('uuid');

      // create form data
    	let data = new FormData();

      // append image
    	data.append('file', value.file);
      data.append('temp', value.temp);
      
      // create promise
      const rtn = new Promise((resolve, reject) => {
        jQuery.ajax({
          'url' : `/media/${type}`,
          'xhr' : () => {
            // get the native XmlHttpRequest object
            var xhr = jQuery.ajaxSettings.xhr();
  
            // set the onprogress event handler
            xhr.upload.onprogress = (evt) => {
              // log progress
              const progress = (evt.loaded / evt.total) * 100;
  
              // set progress
              value.progress = progress;
  
              // update
              this.update();
            };
  
            // return the customized object
            return xhr;
          },
          'data'  : data,
          'type'  : 'post',
          'cache' : false,
          'error' : () => {
            // do error
            eden.alert.alert('error', `Error uploading ${type}`);
  
            // remove from array
            value.error = true;
            
            // update
            this.update();
            
            // reject
            reject();
          },
          'success' : (data) => {  
            // check if error
            if (data.error) {
              // error
              reject(data.message);
              
              // do message
              return eden.alert.alert('error', data.message);
            }
  
            // check if image
            if (data.upload) value.id = data.upload.id;
            
            // resolve
            resolve(data.upload);
          },
          'dataType'    : 'json',
          'contentType' : false,
          'processData' : false
        });
      });

      // submit ajax form
      this.loading.push(rtn);
      
      // return
      return rtn;
    }
    
    /**
     * do scroll
     *
     * @return {*}
     */
    doScroll() {
      // set up scrollbar
      if (!this.scrollbar) {
        // do scrollbar
        this.scrollbar = new Scrollbar(this.refs.messages);
      }
      
      // set scroll height
      this.refs.messages.scrollTop = this.refs.messages.scrollHeight;
      
      // scroll to bottom
      setTimeout(() => {
        // set scroll height
        this.refs.messages.scrollTop = this.refs.messages.scrollHeight;
      }, 100);
      
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
      
      // on created
      socket.on(`chat.${this.chat.get('id')}.message`, this.onMessage);
      
      // scroll to bottom
      this.doScroll();
    });
    
    // on mount
    this.on('mounted', () => {
      // check frontend
      if (!this.eden.frontend || !this.user.exists()) return;
      
      // scroll to bottom
      this.doScroll();
    });
    
    // on mount
    this.on('unmount', () => {
      // check frontend
      if (!this.eden.frontend) return;
      
      // on created
      socket.off(`chat.${this.chat.get('id')}.message`, this.onMessage);
    });
    
    // on mount
    this.on('update', () => {
      // check frontend
      if (!this.eden.frontend) return;
      
      // scroll to bottom
      this.doScroll();
    });
    
    // on mount
    this.on('updated', () => {
      // check frontend
      if (!this.eden.frontend || !this.user.exists()) return;
      
      // scroll to bottom
      this.doScroll();
    });
  </script>
</chat-pane>
