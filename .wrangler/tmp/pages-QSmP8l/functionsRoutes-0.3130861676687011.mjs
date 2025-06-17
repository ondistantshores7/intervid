import { onRequestGet as __api_loadProject_js_onRequestGet } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/api/loadProject.js"
import { onRequestPost as __api_saveProject_js_onRequestPost } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/api/saveProject.js"
import { onRequestGet as __login_js_onRequestGet } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/login.js"
import { onRequestPost as __login_js_onRequestPost } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/login.js"
import { onRequest as ___middleware_js_onRequest } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/_middleware.js"

export const routes = [
    {
      routePath: "/api/loadProject",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_loadProject_js_onRequestGet],
    },
  {
      routePath: "/api/saveProject",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_saveProject_js_onRequestPost],
    },
  {
      routePath: "/login",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__login_js_onRequestGet],
    },
  {
      routePath: "/login",
      mountPath: "/",
      method: "POST",
      middlewares: [],
      modules: [__login_js_onRequestPost],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]