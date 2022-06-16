define("ace/theme/spring_client",
  ["require","exports","module","ace/lib/dom"],
  function(require, exports, module) {

    exports.isDark = true;
    exports.cssClass = "ace-spring-client";
    exports.cssText = "";

    /*
    var dom = require("../lib/dom");
    dom.importCssString(exports.cssText, exports.cssClass, false);
    */
  });

(function() {
  window.require(["ace/theme/spring_client"], function(m) {
    if (typeof module == "object" && typeof exports == "object" && module) {
        module.exports = m;
    }
  });
})();