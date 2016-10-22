webix.ready(function () {

  var webixStateRenderer = WebixStateRouter(webix);
  var stateRouter = abstractStateRouter(webixStateRenderer, document.body);

  var menuTpl = [
    {
      view: "button", label: "Page 1", width: 100, click: function () {
      stateRouter.go('app.page1')
    }
    },
    {
      view: "button", label: "Page 1 sub", width: 100, click: function () {
      stateRouter.go('app.page1')
    }
    },
    {
      view: "button", label: "Page 2", width: 100, click: function () {
      stateRouter.go('app.page2')
    }
    },
    {
      view: "button", label: "Page 3", width: 100, click: function () {
      stateRouter.go('app.page3')
    }
    },
    {
      view: "button", label: "Admin", width: 100, click: function () {
      stateRouter.go('admin')
    }
    }
  ];

  stateRouter.addState({
    name: 'app',
    template: {
      name: 'app',
      rows: [
        {
          type: "header", template: "My App!"
        },
        {
          height: '100%',
          cols: [
            {
              type: 'toolbar', css: 'menu_button',
              rows: menuTpl
            },
            {$subview: true}
          ]
        }
      ]
    },
    route: '/app'
  });

  stateRouter.addState({
    name: 'admin',
    template: {
      name: 'admin',
      rows: [
        {
          type: "header", template: "My Admin!"
        },
        {
          height: '100%',
          cols: [
            {
              type: 'toolbar', css: 'menu_button',
              rows: menuTpl
            },
            {$subview: true}
          ]
        }
      ]
    },
    route: '/admin'
  });

  stateRouter.addState({
    name: 'app.page1',
    template: {template: 'Page1', name: 'page1'},
    resolve: function (data, params, cb) {
      console.log('resolve1');
      cb(null, {});
    },
    activate: function () {
      console.log('activate1')
    },
    route: '/page1'
  });

  stateRouter.addState({
    name: 'app.page2',
    template: {template: 'Page2', name: 'page2'},
    resolve: function (data, params, cb) {
      console.log('resolve2');
      cb(null, {});
    },
    activate: function () {
      console.log('activate2')
    },
    route: '/page2'
  });

  //var app = webixJet.create({
  //  id: "admin-demo",
  //  name: "Webix Admin",
  //  version: "0.1",
  //  debug: true,
  //  start: "app.page1",
  //  stateRouter: stateRouter
  //});

  stateRouter.evaluateCurrentRoute('app');

});
