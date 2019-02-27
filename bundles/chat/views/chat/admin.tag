<chat-admin-page>
  <div class="page page-fundraiser">

    <admin-header title="Manage Chats">
      <yield to="right">
        <a href="/admin//chat/chat/create" class="btn btn-lg btn-success">
          <i class="fa fa-plus ml-2"></i> Create Chat
        </a>
      </yield>
    </admin-header>
    
    <div class="container-fluid">
    
      <grid ref="grid" grid={ opts.grid } table-class="table table-striped table-bordered" title="Chat Grid" />
    
    </div>
  </div>
</chat-admin-page>
