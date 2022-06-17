# Spring '83

Welcome! This is a draft protocol that I believe might open up some interesting new possibilities on the internet. If you are just discovering it, I recommend reading [this narrative description](https://www.robinsloan.com/lab/specifying-spring-83/). Don't miss the growing [discussion](https://www.robinsloan.com/lab/specifying-spring-83/#discussion), either.

This is speculative software intended to invite consideration and imagination; it doesn't have any "users" yet, only co-investigators. That's you!

Here is [the current draft specification](draft-20220616.md). You can also read [the previous draft](draf-20220609.md).

A demo server is operating at `https://bogbody.biz`, if you'd like to read the spec and attempt to interact with it. This server might drop offline at any time, and any data you transmit to it might be lost. It is running in a cloud environment in which data can take about a minute to propagate around the world -- a perfect match for the pace of this protocol!

If it seems like the server isn't working as expected: it probably isn't! Feel free to open an issue, or send me a note at `robin@robinsloan.com`.

Implementations:

* [royragsdale/s83](https://github.com/royragsdale/s83), in Go
* [michael-lazar/lets-dance](https://github.com/michael-lazar/lets-dance), in Python (with some great [notes](https://github.com/michael-lazar/lets-dance/blob/main/Notes.md))

If you've implemented a client or server, at any level of completeness, and you would like me to list it here, let me know.

A demo client is included in this repository. See the [demo-client/](demo-client/) folder for more info.

This work is offered under an MIT License. If there's some other license that is better or more interesting for these purposes, let me know.