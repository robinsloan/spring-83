# Spring '83

Welcome! This is a draft protocol that I believe might open up some interesting new possibilities on the internet. If you are just discovering it, I recommend reading [this narrative description](https://www.robinsloan.com/lab/specifying-spring-83/). Don't miss the growing [discussion](https://www.robinsloan.com/lab/specifying-spring-83/#discussion), either.

This is speculative software intended to invite consideration and imagination; it doesn't have any "users" yet, only co-investigators. That's you!

Current draft:

* [Protocol specification](draft-20220629.md)
* [Realms Memo](memo-realms.md)

Previous drafts:

* [20220619](draft-20220616.md)
* [20220609](draf-20220609.md).

A demo server is operating at `https://bogbody.biz`, if you'd like to read the spec and attempt to interact with it. This server might drop offline at any time, and any data you transmit to it might be lost. It is running in a cloud environment in which data can take about a minute to propagate around the world -- a perfect match for the pace of this protocol!

If it seems like the server isn't working as expected: it probably isn't! Feel free to open an issue, or send me a note at `robin@robinsloan.com`.

A demo client, [The Oakland Follower-Sentinel](https://github.com/robinsloan/the-oakland-follower-sentinel), is also available for inspection.

Here are the implementations I know about currently:

* [royragsdale/s83](https://github.com/royragsdale/s83), in Go
* [michael-lazar/lets-dance](https://github.com/michael-lazar/lets-dance), in Python (with some great [notes](https://github.com/michael-lazar/lets-dance/blob/main/Notes.md))
* [pteichman/ahoy](https://github.com/pteichman/ahoy), in Go
* [rpj/spring83](https://github.com/rpj/spring83), in JavaScript
* [cellu_cc/so83-gpu](https://gitlab.com/cellu_cc/so83-gpu), on GitLab, in OpenCL 🤯
* [motevets/springboard](https://github.com/motevets/springboard), in Go (running [here](https://spring83.kindrobot.ca))

If you've implemented a client, server, or utility, at any level of completeness, and you would like me to list it here, let me know.

This work is offered under a Creative Commons Attribution-ShareAlike license.