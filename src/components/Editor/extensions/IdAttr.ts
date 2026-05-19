import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";

const TARGET_TYPES = new Set(["taskItem", "heading"]);

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

export const IdAttr = Extension.create({
  name: "idAttr",

  addGlobalAttributes() {
    return [
      {
        types: Array.from(TARGET_TYPES),
        attributes: {
          "data-id": {
            default: null,
            parseHTML: (el: HTMLElement) => el.getAttribute("data-id"),
            renderHTML: (attrs: Record<string, unknown>) => {
              const v = attrs["data-id"];
              return v ? { "data-id": String(v) } : {};
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("idAttrAssign"),
        appendTransaction: (_transactions, _oldState, newState) => {
          const tr = newState.tr;
          const seen = new Set<string>();
          let changed = false;
          newState.doc.descendants((node, pos) => {
            if (!TARGET_TYPES.has(node.type.name)) return;
            const current = node.attrs["data-id"] as string | null;
            if (!current || seen.has(current)) {
              const id = newId();
              seen.add(id);
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, "data-id": id });
              changed = true;
            } else {
              seen.add(current);
            }
          });
          return changed ? tr : null;
        },
      }),
    ];
  },
});
