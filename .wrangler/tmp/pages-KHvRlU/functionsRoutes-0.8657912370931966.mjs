import { onRequestGet as __api_embed__id__js_onRequestGet } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/api/embed/[id].js"
import { onRequestGet as __api_loadProject_js_onRequestGet } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/api/loadProject.js"
import { onRequestPost as __api_login_js_onRequestPost } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/api/login.js"
import { onRequestPost as __api_logout_js_onRequestPost } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/api/logout.js"
import { onRequestPost as __api_saveProject_js_onRequestPost } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/api/saveProject.js"
import { onRequest as __player___path___js_onRequest } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/player/[[path]].js"
import { onRequest as ___middleware_js_onRequest } from "/Users/matthewgawronski/Documents/Interactive Video Editor/functions/_middleware.js"

export const routes = [
    {
      routePath: "/api/embed/:id",
      mountPath: "/api/embed",
      method: "GET",
      middlewares: [],
      modules: [__api_embed__id__js_onRequestGet],
    },
  {
      routePath: "/api/loadProject",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_loadProject_js_onRequestGet],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_login_js_onRequestPost],
    },
  {
      routePath: "/api/logout",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_logout_js_onRequestPost],
    },
  {
      routePath: "/api/saveProject",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_saveProject_js_onRequestPost],
    },
  {
      routePath: "/player/:path*",
      mountPath: "/player",
      method: "",
      middlewares: [],
      modules: [__player___path___js_onRequest],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]