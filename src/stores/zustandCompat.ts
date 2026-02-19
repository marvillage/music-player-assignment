const zustand = require("zustand");
const middleware = require("zustand/middleware.js");

export const create = zustand.create as typeof import("zustand").create;
export const persist = middleware.persist as typeof import("zustand/middleware").persist;
export const createJSONStorage =
  middleware.createJSONStorage as typeof import("zustand/middleware").createJSONStorage;

