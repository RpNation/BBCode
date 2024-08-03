/**
 * Generate the node object.
 *
 * Contains additional logic to help break any unintended side effects of the top down parsing of bbob.
 * @param {string} tag name of the tag
 * @param {Object<string, boolean|string|string[]>} attrs attributes of the tag
 * @param {any} content contents of the tag. `[]` will create an empty tag. `null` will create a self closing tag
 *
 * @example
 * ```
 * toNode("div", { class: "class" }, "content")
 * ```
 * becomes
 * ```
 * {
 *  tag: "div",
 *  attrs: { class: "class" },
 *  content: "content",
 *  gen: true,
 * }
 */
const toNode = (tag, attrs, content = []) => ({
  tag,
  attrs,
  content,
  gen: true,
});

/**
 * Preprocess attributes of a node to either return the default single attribute
 * or return a keyed attribute list
 * @param {import('@bbob/types').TagNode} node bbcode node to process
 * @param {string} [raw] raw string. Only include if the single attribute is allowed to have spaces
 * @returns processed attributes
 */
const preprocessAttr = (node, raw) => {
  const keys = Object.keys(node.attrs).join(" ");
  const vals = Object.values(node.attrs).join(" ");
  if (keys !== vals) {
    return node.attrs;
  }
  if (!raw || !node.start) {
    return {
      _default: vals,
    };
  }
  // [tag=attr]
  // node.start.from = 0
  // node.start.to = 10
  const openTagParts = raw.substring(node.start.from, node.start.to).split("=");
  if (openTagParts.length !== 2) {
    return node.attrs;
  }
  let val = openTagParts[1].slice(0, -1).trim(); // `attr` or `"attr"`
  if (val.startsWith('"') && val.endsWith('"')) {
    val = val.slice(1, -1);
  }
  return {
    _default: val,
  };
};

/**
 * Attempts to return tag into its original form with proper attributes
 * @returns string of tag start
 */
const toOriginalStartTag = (node) => {
  if (!node.attrs) {
    return `[${node.tag}]`;
  }
  const attrs = preprocessAttr(node.attrs);
  if (attrs._default) {
    return `[${node.tag}=${attrs._default}]`;
  } else {
    return node.toTagStart();
  }
};

/**
 * Given a string, find the first position of a regex match
 * @param {string} string to test against
 * @param {RegExp} regex to test with
 * @param {number} startpos starting position. Defaults to 0
 * @returns index of the first match of the regex in the string
 */
const regexIndexOf = (string, regex, startpos) => {
  const indexOf = string.substring(startpos || 0).search(regex);
  return indexOf >= 0 ? indexOf + (startpos || 0) : indexOf;
};

const MD_NEWLINE_INJECT = "<!-- bbcode injected newlines -->\n\n";
const MD_NEWLINE_PRE_INJECT = "\n\n<!-- bbcode pre injected newlines -->";
const MD_NEWLINE_INJECT_COMMENT = "<!-- bbcode injected newlines -->";

const URL_REGEX =
  /(http|ftp|https|upload):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/;
const MD_URL_REGEX =
  /\!?\[.*\]\((http|ftp|https|upload):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])\)/;
const URL_REGEX_SINGLE_LINE = new RegExp(`^${URL_REGEX.source}|${MD_URL_REGEX.source}$`);
const ESCAPABLES_REGEX =
  /((\n|^)(?<fence>```+|~~~+)(?<fenceInfo>.*\n))|(?<bbcode>\[(?<bbcodeTag>i?code|plain)(=.*)?\])|(?<backtick>(?<tickStart>`{1,2})(.*)(?<tickEnd>\k<tickStart>))/im;
const MD_TABLE_REGEX = /^(\|[^\n]+\|\r?\n)((?:\| ?:?[-]+:? ?)+\|)(\n(?:\|[^\n]+\|\r?\n?)*)?$/m;

/**
 * Generates a random GUID.
 *
 * Mini Racer doesn't have the crypto module, so we can't use the built-in `crypto.randomUUID` function.
 * @returns {string} a GUID
 */
function generateGUID() {
  let d = new Date().getTime();
  if (window.performance && typeof window.performance.now === "function") {
    d += performance.now(); //use high-precision timer if available
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    // eslint-disable-next-line no-bitwise
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    // eslint-disable-next-line no-bitwise
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export {
  toNode,
  toOriginalStartTag,
  generateGUID,
  preprocessAttr,
  regexIndexOf,
  MD_NEWLINE_INJECT,
  MD_NEWLINE_INJECT_COMMENT,
  MD_NEWLINE_PRE_INJECT,
  URL_REGEX,
  MD_URL_REGEX,
  MD_TABLE_REGEX,
  URL_REGEX_SINGLE_LINE,
  ESCAPABLES_REGEX,
};
