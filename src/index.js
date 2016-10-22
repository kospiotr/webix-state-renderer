module.exports = function webixStateRenderer(webix, webixOptions, options) {

  function copy(obj, target, configVisitor) {
    if (obj.$oninit)
      configVisitor._init.push(obj.$oninit);
    if (obj.$ondestroy)
      configVisitor._destroy.push(obj.$ondestroy);
    if (obj.$subview) {
      if (typeof obj.$subview == "boolean") {
        obj = {id: configVisitor.subviewId};
        configVisitor.$layout = true;
      }
    }
    if (obj.$ui)
      return copy(obj.$ui, target, configVisitor);
    if (obj.$init) {
      return obj;
    }

    target = target || (webix.isArray(obj) ? [] : {});
    for (var method in obj) {
      if (obj[method] && typeof obj[method] == "object" && !webix.isDate(obj[method])) {
        target[method] = copy(obj[method], (webix.isArray(obj[method]) ? [] : {}), configVisitor);
      } else {
        target[method] = obj[method];
      }
    }

    return target;
  }


  return function makeRenderer(stateRouter) {


    stateRouter.on('afterCreateState', function (context) {
      var view = context.domApi;
      var methods = view.$lifecycle._init || [];
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        method(view, view.$scope, context);
      }
    });

    stateRouter.on('beforeDestroyState', function (context) {
      var view = context.domApi;
      var methods = view.$lifecycle._destroy || [];
      for (var i = methods.length - 1; i >= 0; i--) {
        var method = methods[i];
        method(view, view.$scope, context);
      }
    });

    function renderSubview(parentCmp, templateCopy, subviewId) {
      var parentCmpSubview = parentCmp._subview || parentCmp;
      var currentCmp = webix.ui(templateCopy, parentCmpSubview);

      parentCmp._subview = currentCmp;

      var subviewCmp = currentCmp.$$ ? currentCmp.$$(subviewId) : webix.$$(subviewId);
      currentCmp._subview = subviewCmp;
      currentCmp._parent = parentCmp;
      return currentCmp;
    }

    return {
      render: function render(context, cb) {

        var subviewId = webix.uid();
        var lifecycle = {_init: [], _destroy: [], subviewId: subviewId};
        var templateCopy = copy(context.template, null, lifecycle);
        var parentCmp = context.element;

        templateCopy.$scope = {};
        var subviewCmp = renderSubview(parentCmp, templateCopy, subviewId);

        subviewCmp.$lifecycle = lifecycle;
        cb(null, subviewCmp);
      },
      reset: function reset(cmp, cb) {
        //console.log('reset');
        cb(null, null);
      },
      destroy: function destroy(cmp, cb) {
        // no need, webix destroys replaced components automatically
        cb(null, null);
      },
      getChildElement: function getChildElement(cmp, cb) {
        var subview = cmp._subview;
        if (subview === undefined) {
          throw new Error('Can\'t find subview in the parent component');
        }
        cb(null, subview);
      }
    }
  }
};