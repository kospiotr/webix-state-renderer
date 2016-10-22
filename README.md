# webix-state-renderer

## Usage

Basic example:

```js
webix.ready(function () {

    var stateRenderer = webixStateRenderer(webix);
    var stateRouter = abstractStateRouter(stateRenderer, document.body);

    stateRouter.addState({
        name: 'app',
        template: {
            rows: [
                {
                    type: "header", template: "My App!"
                },
                {
                    height: '100%',
                    cols: [
                        {
                            type: 'toolbar', css: 'menu_button',
                            rows: [
                                {
                                    view: "button", label: "Page 1", width: 100, click: function () {
                                    stateRouter.go('app.page1')
                                }
                                },
                                {
                                    view: "button", label: "Page 2", width: 100, click: function () {
                                    stateRouter.go('app.page2')
                                }
                                }
                            ]
                        },
                        {$subview: true}
                    ]
                }
            ]
        },
        route: '/app'
    });

    stateRouter.addState({
        name: 'app.page1',
        template: {
            template: 'Page1 content'
        },
        route: '/page1'
    })
    ;

    stateRouter.addState({
        name: 'app.page2',
        template: {
            template: 'Page2 content'
        },
        route: '/page2'
    });

    stateRouter.evaluateCurrentRoute('app.page1');
});
```

## Installation

npm + your favorite CommonJS bundler is easiest.

```
npm install webix-state-renderer
```

You can also download the [https://wzrd.in/standalone/webix-state-renderer@latest](stand-alone build from wzrd.in). If you include it in a ```<script>``` tag, a ```webixStateRouter``` function will be available on the global scope.

## Features

See full [https://github.com/TehShrike/abstract-state-router](https://github.com/TehShrike/abstract-state-router) list of router features.

### Component declaration

Component style:

```js
stateRouter.addState({
    name: 'app.page1',
    template: {
        $ui: {rows: [...]},
        $oninit: function (view, scope) {
            webix.message('initialized page1');
        },
        $ondestroy: function () {
            webix.message('destroying page1');
        }
    },
    route: '/page1'
});
```

Template first style:

```js
stateRouter.addState({
    name: 'app.page1',
    template: {
        rows: [...],
        $oninit: function (view, scope) {
            webix.message('initialized page1');
        },
        $ondestroy: function () {
            webix.message('destroying page1');
        }
    },
    route: '/page1'
});
```

### Lifecycle

There are two kinds of component lifecycle - routes and component.
For routes lifecycle find documentation here: [https://github.com/TehShrike/abstract-state-router#state-change-flow](https://github.com/TehShrike/abstract-state-router#state-change-flow)

Webix components have following lifecycle methods:
 
 - `$oninit` - called after view has been rendered into component
 - `$ondestroy` - called before view will be destroyed
 
## Comparison to webix-jet
 
Tandem [webix-state-router-renderer](https://github.com/kospiotr/webix-state-renderer) and [abstract-state-router](https://github.com/TehShrike/abstract-state-router) covers most of the cases introduced by the [webix-jet](https://github.com/webix-hub/jet-core) project.
In fact this project is highly inspired by the webix-jet. Why then another project?

webix-state-router-renderer is driven by the angular like router practices which I find one of the best for such cases. The thing I don't like very much about webix-jet is that it relies highly on AMD module system and the project file structure. Each partial routes are corresponding AMD resource which I find very dangerous n term of security and not extensible.

In the other hand webix-jet project is maintained by the webix team which make it very reliable, also it has very good documentation [https://webix.gitbooks.io/webix-jet](https://webix.gitbooks.io/webix-jet) and has few more features regarding scope which in the future might be covered by the webix-state-router-renderer as well. 