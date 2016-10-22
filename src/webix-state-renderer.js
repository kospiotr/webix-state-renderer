function WebixStateRouter(webix, webixOptions, options) {

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
      obj = obj.$ui;
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

    return {
      render: function render(context, cb) {
        console.log('render');
        var subviewId = webix.uid();
        var templateCopy = copy(context.template, null, {_init: [], _destroy: [], subviewId: subviewId});

        var parentCmp = context.element;

        var parentCmpSubview = parentCmp._subview || parentCmp;
        var currentCmp = webix.ui(templateCopy, parentCmpSubview);

        parentCmp._subview = currentCmp;

        var subviewCmp = currentCmp.$$ ? currentCmp.$$(subviewId) : webix.$$(subviewId);
        currentCmp._subview = subviewCmp;
        currentCmp._parent = parentCmp;

        cb(null, currentCmp);
      },
      reset: function reset(cmp, cb) {
        console.log('reset');
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
}