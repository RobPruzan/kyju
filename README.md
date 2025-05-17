<img src="https://github.com/user-attachments/assets/52ded435-e805-4e08-9a9b-69a3184fc8b5" alt="kyju logo" width="200" />

# Kyju

A JavaScript library for building performant and reliable devtools on the web


Early API examples in https://github.com/RobPruzan/kyju/tree/main/src/api

## Why
Building devtools on the web requires arcane browser knowledge. Existing tools are optimized for building web applications, which has little overlap with devtools. To name a few problems you will likely encounter when building a devtool:
- complex distributed system problems when interacting with local servers or cross origin iframes 
- abusing browser API's to get useful information for your devtool, some of which are platform dependent
- re-inventing flexible toolbars that don't get in the users way when developing
- determining how much overhead your devtool is adding to the application
- setting up modern tooling and fighting with bundling configurations
- state managment outside of the "main UI" lifetime
- making the data you collect in the devtool accessible to LLM's
- automatically hiding the devtool when the user builds for production, while optionally allowing the devtool to run in production

Conceptually, most devtools are not complicated, since they tend to follow the pattern of:
- collecting some data
- visualizing it

The goal with kjyu's api is to make developing devtools as easy as it sounds

## Features
- RPC's for server and iframe communication
  - w/ optional react query wrapper over the RPC's
- shared, syncronous, live synced state between server, iframe, and main website
- automatic MCP support
- improved API's for devtools hooking into complex browser API's
  - effecient layout queries  
  - interaction tracking
  - network tracking
  - storage API's
  - monkey patching API's
  - many more
- morphing, magnetic, and hideable toolbar
- non URL based router
- built in canvas utilities for devtools
- simple wrapper over [bippy](https://github.com/aidenybai/bippy) to hook into react internals
- react + tailwind npm publishable bundling configurations
- automatic state persistence w/ migration support
- different toolbars made with kyju can be combined automatically, to avoid multiple toolbars on page
- built in devtool overhead profiler/full stack devtools for debugging
- dependency injection when interacting with cross origin iframes, or servers
