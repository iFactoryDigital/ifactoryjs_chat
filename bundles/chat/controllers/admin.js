
// Require dependencies
const Grid        = require('grid');
const config      = require('config');
const Controller  = require('controller');
const escapeRegex = require('escape-string-regexp');

// Require models
const Chat = model('chat');
const Block = model('block');

// require helpers
const formHelper = helper('form');
const fieldHelper = helper('form/field');
const blockHelper = helper('cms/block');
const chatHelper = helper('chat');

/**
 * Build chat controller
 *
 * @acl   admin
 * @fail  next
 * @mount /admin/chat
 */
class ChatAdminController extends Controller {
  /**
   * Construct chat Admin Controller
   */
  constructor() {
    // run super
    super();

    // bind build methods
    this.build = this.build.bind(this);

    // bind methods
    this.gridAction = this.gridAction.bind(this);
    this.indexAction = this.indexAction.bind(this);
    this.createAction = this.createAction.bind(this);
    this.updateAction = this.updateAction.bind(this);
    this.removeAction = this.removeAction.bind(this);
    this.createSubmitAction = this.createSubmitAction.bind(this);
    this.updateSubmitAction = this.updateSubmitAction.bind(this);
    this.removeSubmitAction = this.removeSubmitAction.bind(this);

    // bind private methods
    this._grid = this._grid.bind(this);

    // set building
    this.building = this.build();
  }


  // ////////////////////////////////////////////////////////////////////////////
  //
  // BUILD METHODS
  //
  // ////////////////////////////////////////////////////////////////////////////

  /**
   * build chat admin controller
   */
  build() {
    //
    // REGISTER BLOCKS
    //

    // register simple block
    blockHelper.block('admin.chat.grid', {
      acl         : ['admin.chat'],
      for         : ['admin'],
      title       : 'Chat Grid',
      description : 'Chat Grid block',
    }, async (req, block) => {
      // get notes block from db
      const blockModel = await Block.findOne({
        uuid : block.uuid,
      }) || new Block({
        uuid : block.uuid,
        type : block.type,
      });

      // create new req
      const fauxReq = {
        query : blockModel.get('state') || {},
      };

      // return
      return {
        tag   : 'grid',
        name  : 'Chat',
        grid  : await (await this._grid(req)).render(fauxReq),
        class : blockModel.get('class') || null,
        title : blockModel.get('title') || '',
      };
    }, async (req, block) => {
      // get notes block from db
      const blockModel = await Block.findOne({
        uuid : block.uuid,
      }) || new Block({
        uuid : block.uuid,
        type : block.type,
      });

      // set data
      blockModel.set('class', req.body.data.class);
      blockModel.set('state', req.body.data.state);
      blockModel.set('title', req.body.data.title);

      // save block
      await blockModel.save(req.user);
    });

    //
    // REGISTER FIELDS
    //

    // register simple field
    fieldHelper.field('admin.chat', {
      for         : ['admin'],
      title       : 'Chat',
      description : 'Chat Field',
    }, async (req, field, value) => {
      // set tag
      field.tag = 'chat';
      field.value = value ? (Array.isArray(value) ? await Promise.all(value.map(item => item.sanitise())) : await value.sanitise()) : null;
      // return
      return field;
    }, async (req, field) => {
      // save field
    }, async (req, field, value, old) => {
      // set value
      try {
        // set value
        value = JSON.parse(value);
      } catch (e) {}

      // check value
      if (!Array.isArray(value)) value = [value];

      // return value map
      return await Promise.all((value || []).filter(val => val).map(async (val, i) => {
        // run try catch
        try {
          // buffer chat
          const chat = await Chat.findById(val);

          // check chat
          if (chat) return chat;

          // return null
          return null;
        } catch (e) {
          // return old
          return old[i];
        }
      }));
    });
  }


  // ////////////////////////////////////////////////////////////////////////////
  //
  // CRUD METHODS
  //
  // ////////////////////////////////////////////////////////////////////////////

  /**
   * Index action
   *
   * @param {Request}  req
   * @param {Response} res
   *
   * @icon     fa fa-building
   * @menu     {ADMIN} Chats
   * @title    Chat Administration
   * @route    {get} /
   * @layout   admin
   * @priority 10
   */
  async indexAction(req, res) {
    // Render grid
    res.render('chat/admin', {
      grid : await (await this._grid(req)).render(req),
    });
  }

  /**
   * Add/edit action
   *
   * @param {Request}  req
   * @param {Response} res
   *
   * @route    {get} /create
   * @layout   admin
   * @return   {*}
   * @priority 12
   */
  createAction(req, res) {
    // Return update action
    return this.updateAction(req, res);
  }

  /**
   * Update action
   *
   * @param {Request} req
   * @param {Response} res
   *
   * @route   {get} /:id/update
   * @layout  admin
   */
  async updateAction(req, res) {
    // Set website variable
    let chat = new Chat();
    let create = true;

    // Check for website model
    if (req.params.id) {
      // Load by id
      chat = await Chat.findById(req.params.id);
      create = false;
    }

    // get form
    const form = await formHelper.get('admin.chat');

    // digest into form
    const sanitised = await formHelper.render(req, form, await Promise.all(form.get('fields').map(async (field) => {
      // return fields map
      return {
        uuid  : field.uuid,
        value : await chat.get(field.name || field.uuid),
      };
    })));

    // get form
    if (!form.get('_id')) res.form('admin.chat');

    // Render page
    res.render('chat/admin/update', {
      item   : await chat.sanitise(),
      form   : sanitised,
      title  : create ? 'Create chat' : `Update ${chat.get('_id').toString()}`,
      fields : config.get('schedule.chat.fields'),
    });
  }

  /**
   * Create submit action
   *
   * @param {Request} req
   * @param {Response} res
   *
   * @route   {post} /create
   * @return  {*}
   * @layout  admin
   * @upload  {single} image
   */
  createSubmitAction(req, res) {
    // Return update action
    return this.updateSubmitAction(req, res);
  }

  /**
   * Add/edit action
   *
   * @param {Request}  req
   * @param {Response} res
   * @param {Function} next
   *
   * @route   {post} /:id/update
   * @layout  admin
   */
  async updateSubmitAction(req, res, next) {
    // Set website variable
    let create = true;
    let chat = new Chat();

    // Check for website model
    if (req.params.id) {
      // Load by id
      chat = await Chat.findById(req.params.id);
      create = false;
    }

    // get form
    const form = await formHelper.get('admin.chat');

    // digest into form
    const fields = await formHelper.submit(req, form, await Promise.all(form.get('fields').map(async (field) => {
      // return fields map
      return {
        uuid  : field.uuid,
        value : await chat.get(field.name || field.uuid),
      };
    })));

    // loop fields
    for (const field of fields) {
      // set value
      chat.set(field.name || field.uuid, field.value);
    }

    // Save chat
    await chat.save(req.user);

    // set id
    req.params.id = chat.get('_id').toString();

    // return update action
    return this.updateAction(req, res, next);
  }

  /**
   * Delete action
   *
   * @param {Request} req
   * @param {Response} res
   *
   * @route   {get} /:id/remove
   * @layout  admin
   */
  async removeAction(req, res) {
    // Set website variable
    let chat = false;

    // Check for website model
    if (req.params.id) {
      // Load user
      chat = await Chat.findById(req.params.id);
    }

    // Render page
    res.render('chat/admin/remove', {
      item  : await chat.sanitise(),
      title : `Remove ${chat.get('_id').toString()}`,
    });
  }

  /**
   * Delete action
   *
   * @param {Request} req
   * @param {Response} res
   *
   * @route   {post} /:id/remove
   * @title   Remove Chat
   * @layout  admin
   */
  async removeSubmitAction(req, res) {
    // Set website variable
    let chat = false;

    // Check for website model
    if (req.params.id) {
      // Load user
      chat = await Chat.findById(req.params.id);
    }

    // Alert Removed
    req.alert('success', `Successfully removed ${chat.get('_id').toString()}`);

    // Delete website
    await chat.remove(req.user);

    // Render index
    return this.indexAction(req, res);
  }


  // ////////////////////////////////////////////////////////////////////////////
  //
  // QUERY METHODS
  //
  // ////////////////////////////////////////////////////////////////////////////

  /**
   * index action
   *
   * @param req
   * @param res
   *
   * @acl   admin
   * @fail  next
   * @route {GET} /query
   */
  async queryAction(req, res) {
    // find children
    let chats = await Chat;

    // set query
    if (req.query.q) {
      chats = chats.where({
        name : new RegExp(escapeRegex(req.query.q || ''), 'i'),
      });
    }

    // add roles
    chats = await chats.skip(((parseInt(req.query.page, 10) || 1) - 1) * 20).limit(20).sort('name', 1)
      .find();

    // get children
    res.json((await Promise.all(chats.map(chat => chat.sanitise()))).map((sanitised) => {
      // return object
      return {
        text  : sanitised.name,
        data  : sanitised,
        value : sanitised.id,
      };
    }));
  }


  // ////////////////////////////////////////////////////////////////////////////
  //
  // GRID METHODS
  //
  // ////////////////////////////////////////////////////////////////////////////

  /**
   * User grid action
   *
   * @param {Request} req
   * @param {Response} res
   *
   * @route  {post} /grid
   * @return {*}
   */
  async gridAction(req, res) {
    // Return post grid request
    return (await this._grid(req)).post(req, res);
  }

  /**
   * Renders grid
   *
   * @param {Request} req
   *
   * @return {grid}
   */
  async _grid(req) {
    // Create new grid
    const chatGrid = new Grid();

    // Set route
    chatGrid.route('/admin/chat/chat/grid');

    // get form
    const form = await formHelper.get('admin.chat');

    // Set grid model
    chatGrid.id('admin.chat');
    chatGrid.model(Chat);
    chatGrid.models(true);

    // Add grid columns
    chatGrid.column('_id', {
      sort     : true,
      title    : 'Id',
      priority : 100,
    });

    // branch fields
    await Promise.all((form.get('_id') ? form.get('fields') : config.get('chat.fields').slice(0)).map(async (field, i) => {
      // set found
      const found = config.get('chat.fields').find(f => f.name === field.name);

      // add config field
      await formHelper.column(req, form, chatGrid, field, {
        hidden   : !(found && found.grid),
        priority : 100 - i,
      });
    }));

    // add extra columns
    chatGrid.column('updated_at', {
      tag      : 'grid-date',
      sort     : true,
      title    : 'Updated',
      priority : 4,
    }).column('created_at', {
      tag      : 'grid-date',
      sort     : true,
      title    : 'Created',
      priority : 3,
    }).column('actions', {
      tag      : 'chat-actions',
      type     : false,
      width    : '1%',
      title    : 'Actions',
      priority : 1,
    });

    // branch filters
    config.get('schedule.chat.fields').slice(0).filter(field => field.grid).forEach((field) => {
      // add config field
      chatGrid.filter(field.name, {
        type  : 'text',
        title : field.label,
        query : (param) => {
          // Another where
          chatGrid.match(field.name, new RegExp(escapeRegex(param.toString().toLowerCase()), 'i'));
        },
      });
    });

    // Set default sort order
    chatGrid.sort('created_at', 1);

    // Return grid
    return chatGrid;
  }
}

/**
 * Export chat controller
 *
 * @type {ChatAdminController}
 */
module.exports = ChatAdminController;
