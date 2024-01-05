import { toNode } from "../utils/common";

/**
 * @file Adds [justify] to bbcode
 * @example [justify]content[/justify]
 */
export const justify = (node) => {
  return toNode("div", { class: "bbcode-justify" }, node.content);
};
