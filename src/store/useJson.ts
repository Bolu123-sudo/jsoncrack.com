import { create } from "zustand";
import useGraph from "../features/editor/views/GraphView/stores/useGraph";
import useFile from "./useFile";

function parsePath(p: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  const re = /\["([^"]+)"\]|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(p))) {
    if (m[1] !== undefined) tokens.push(m[1]);
    else tokens.push(Number(m[2]));
  }
  return tokens;
}

function setAtPath(root: any, path: string, newVal: unknown) {
  const keys = parsePath(path);
  if (keys.length === 0) return newVal;
  const clone = structuredClone(root);
  let cur: any = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = cur[k] ?? (typeof keys[i + 1] === "number" ? [] : {});
    cur[k] = Array.isArray(next) ? [...next] : { ...next };
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = newVal;
  return clone;
}

function safeParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

interface JsonActions {
  setJson: (json: string) => void;
  getJson: () => string;
  clear: () => void;
  updateAtPath: (jsonPath: string, value: unknown) => void;
  stringify: () => void;
}

const initialStates = {
  json: "{}",
  loading: true,
};

export type JsonStates = typeof initialStates;

const useJson = create<JsonStates & JsonActions>()((set, get) => ({
  ...initialStates,

  getJson: () => get().json,

  setJson: (json) => {
  set({ json, loading: false });
  useGraph.getState().setGraph(json);

  const f: any = useFile.getState();
  if (typeof f?.setContents === "function") {
    f.setContents({ contents: json, skipUpdate: true });
  } else {
    useFile.setState({ contents: json });
  }
},

clear: () => {
  set({ json: "", loading: false });
  useGraph.getState().clearGraph();

  const f: any = useFile.getState();
  if (typeof f?.setContents === "function") {
    f.setContents({ contents: "", skipUpdate: true });
  } else {
    useFile.setState({ contents: "" });
  }
},

  updateAtPath: (jsonPath, value) => {
    const currentText = get().json;
    let currentObj: any;
    try { currentObj = JSON.parse(currentText); } catch { currentObj = {}; }
    const nextObj = setAtPath(currentObj, jsonPath, value);
    const nextText = JSON.stringify(nextObj, null, 2);
    get().setJson(nextText);
  },

  stringify: () => {
    const currentObj = safeParse(get().json);
    const nextText = JSON.stringify(currentObj, null, 2);
    get().setJson(nextText);
  },
}));

export default useJson;
