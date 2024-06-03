import { debounce } from "@ember/runloop";
import { withPluginApi } from "discourse/lib/plugin-api";
import loadscript from "discourse/lib/load-script";
/* global bbscriptParser */

/**
 * @type {Array<{callback: function, on: string}>}
 */
let attachedPreviewBBScripts = [];

const PARENT_WRAPPER_SELECTOR = "article .cooked";
const PARENT_PREVIEW_WRAPPER_CLASS = "d-editor-preview";

/**
 * Check if the post is a preview. If it is a preview, debounce the function
 * @param {HTMLElement} post
 */
function checkIsPreview(post) {
  let isPreview = post.classList.contains(PARENT_PREVIEW_WRAPPER_CLASS);
  if (isPreview) {
    // prevent multiple calls to addBBScriptLogic
    // preview mode is constantly updating based on user input
    debounce(this, addBBScriptLogic, post, true, 1000);
  } else {
    addBBScriptLogic(post, false);
  }
}

/**
 * Adds the bbscript functions to the post
 * @param {HTMLElement} post the post itself
 */
function addBBScriptLogic(post, isPreview = false) {
  let wrapperSelector = isPreview ? "." + PARENT_PREVIEW_WRAPPER_CLASS : PARENT_WRAPPER_SELECTOR;
  if (isPreview) {
    attachedPreviewBBScripts.forEach(({ callback, on }) => {
      post.removeEventListener(on, callback, true);
    });
    attachedPreviewBBScripts = [];
    delete bbscriptParser.bbscriptData.preview;
  }

  post.querySelectorAll("template[data-bbcode-plus='script']").forEach((el) => {
    const callerId = el.getAttribute("data-bbscript-id") || "";
    const callerClass = el.getAttribute("data-bbscript-class") || "";
    const content = el.content.textContent || "";
    const version = el.getAttribute("data-bbscript-ver") || "1";
    const on = el.getAttribute("data-bbscript-on") || "init"; // valid on events: init, click, mouseover, mouseout, etc.
    let astTree;
    if (version === "2") {
      const parsed = bbscriptParser.bbscript2Parser.parse(content);
      astTree = parsed.ast;
      if (parsed.formattedErrors.length) {
        // eslint-disable-next-line no-console
        console.warn(parsed.formattedErrors);
      }
    } else {
      astTree = bbscriptParser.bbscriptProcessorV1.parse(content);
    }
    if (on === "init") {
      let target;
      if (callerClass) {
        target = document.querySelectorAll("." + callerClass + "__" + callerId) || undefined;
      }
      triggerBBScript(callerId, callerClass, astTree, version, target);
    } else {
      const callback = (ev) => {
        const target = ev.target?.closest("." + callerClass + "__" + callerId);
        if (target) {
          triggerBBScript(callerId, callerClass, astTree, version, target);
        }
      };
      // event delegation
      el.closest(wrapperSelector)?.addEventListener(on, callback, true);
      if (isPreview) {
        attachedPreviewBBScripts.push({ callback, on });
      }
    }
  });
}

/**
 * @param {string} callerId
 * @param {string} callerClass
 * @param {ASTNode[] | astNode[]} astTree
 * @param {string} version
 * @param {Element | NodeListOf<Element>} [target]
 * @returns {void}
 */
const triggerBBScript = (callerId, callerClass, astTree, version, target) => {
  if (version === "1") {
    bbscriptParser.bbscriptProcessorV1.execAll(astTree, callerId, callerClass, { target });
  } else if (version === "2") {
    try {
      bbscriptParser.bbscriptProcessorV2.execAll(astTree, callerId, callerClass, { target });
    } catch (e) {
      if (e?.message !== "BBScript Stop Command") {
        // eslint-disable-next-line no-console
        console.warn(e);
      }
    }
  }
};

function initializeBBScript(api) {
  api.decorateCookedElement(checkIsPreview, { id: "add bbscript", afterAdopt: true });
}

export default {
  name: "bbscript",
  initialize(app) {
    if (app.owner.SiteSettings.enable_bbscript) {
      loadscript("/assets/bundled/bbcode-parser.min.js").then(() => {
        withPluginApi("0.11.1", initializeBBScript);
      });
    }
  },
};
