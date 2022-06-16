define("ace/ext/themelist",["require","exports","module"], function(require, exports, module) {
  "use strict";

  var themeData = [
      ["Spring Client","spring-client", "dark"],
  ];

  exports.themesByName = {};
  exports.themes = themeData.map(function(data) {
    var name = data[1] || data[0].replace(/ /g, "_").toLowerCase();
    var theme = {
        caption: data[0],
        theme: "ace/theme/" + name,
        isDark: data[2] == "dark",
        name: name
    };
    exports.themesByName[name] = theme;
    return theme;
  });
});

(function() {
  window.require(["ace/ext/themelist"], function(m) {
    if (typeof module == "object" && typeof exports == "object" && module) {
      module.exports = m;
    }
  });
})();
