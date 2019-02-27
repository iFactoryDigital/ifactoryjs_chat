<element-chat>
  <span each={ item, i in this.chats }>
    <a href="/admin//chat/chat/{ item.id }/update">{ item.name }</a>
    { i === this.chats.length - 1 ? '' : ', ' }
  </span>
  
  <script>
    // set chats
    this.chats = (Array.isArray(opts.data.value) ? opts.data.value : [opts.data.value]).filter(v => v);
    
  </script>
</element-chat>
