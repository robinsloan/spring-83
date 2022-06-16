define("ace/snippets/css",["require","exports","module"], function(require, exports, module) {
"use strict";

exports.snippetText = ""
exports.scope = "css";

});                (function() {
                    window.require(["ace/snippets/css"], function(m) {
                        if (typeof module == "object" && typeof exports == "object" && module) {
                            module.exports = m;
                        }
                    });
                })();