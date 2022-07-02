# Spring Memo: Realms

## Introduction

Here's a dream: to be able to summon a board not with a URL, but merely with a key, conjuring its bytes from -- where? From abstract boardspace!

This notion of "everything everywhere" was part of the original vision for Spring '83, but removed in the spirit of simplicity. It returns as the first Spring Memo, published concurrenctly with the protocol specification.

Spring '83 clients and servers are not required to implement this, or any other, Memo. The Memos should be considered a toolkit of ideas and extensions; many will be published and never implemented. When a Memo is implemented, the process will go like this:

```
Client user: Hi, developer! Would you consider implementing the Realms Memo?
Client developer: Let me check it out!
```

Memo authors may post their documents anywhere on the public internet; the documents should be linked and mirrored in [the main Spring '83 GitHub repository](https://github.com/robinsloan/spring-83).

This Memo defines the *realm*, a set of servers whose operators have agreed to (1) circulate new boards, and (2) honor a shared denylist.

Why form a realm?

* to share the burden of client requests
* to make the full "board flow" available for analysis
* for resilience: technical, political, emotional
* because it's fun!

## Implementation

The key words "must", "must not", "required", "shall", "shall not", "should", "should not", "recommended",  "may", and "optional" in this document are to be interpreted as described in RFC 2119.

https://www.ietf.org/rfc/rfc2119.txt

## Defining a realm

A realm must be described in a JSON document reachable on the public internet.

Here is a minimal `realm.json`:

```
{
  "name": "Earth-865",
  "peers": [
    "bogbody.biz",
    "0l0.lol",
    "spring83.kindrobot.ca"
  ],
  "denylist": "https://robinsloan.github.io/spring-83/earth-865/denylist.txt",
  "fanout": 2,
  "max_boards": 1000000
}
```

If `max_boards` is less than or equal to 0, there is no limit on the number of boards in the realm.

A server participating in a realm must retrieve the JSON document and cache it, updating it weekly.

> *Aside:* There is no automatic or "trustless" way to join a realm; as with BGP, the foundational routing protocol of the internet, you gotta talk to somebody! 

## Sharing boards: peer to peer PUT /`<key>`

Within a realm, servers share new boards using a gossip algorithm. After receiving and verifying a new board from a client or peer, the server must share it with `fanout` peers selected randomly from the realm.

> *Aside:* That's it! That's the gossip algorithm!

New boards should be transmitted to peers asynchronously. The server should wait one minute before sharing only the most recent version of the board. In this way, the server acts as a buffer, absorbing and "compacting" rapid PUTs.

To share a new board with a peer, the server must transmit a PUT request similar to the one described above. Note the addition of the `Prefer` and `Via` headers:

```
PUT /<key> HTTP/1.1
Content-Type: text/html;charset=utf-8
Spring-Version: 83
Prefer: respond-async
Via: Spring/83 <server hostname, as listed in realm JSON document>
Spring-Signature: <signature>

<board>
```

When the server receives a request with the `respond-async` preference, it should immediately return 202 Accepted and place the board into a queue for asynchronous validation. (If the server doesn't have a task queue, it may respond synchronously.)

When the server receives a request with the `Via` header, it should avoid gossiping the board back to the peers indicated.

If a peer is unreachable, or returns an error code, the server must wait for a minimum timeout of 5 minutes before attempting to contact that peer again. If the peer is still not reachable, the server must apply a jittered backoff strategy. The server should cap its timeout at some maximum; one hour is recommended.

## Requesting boards: random GET /`<key>`

When a board is published to a server participating in a realm, the board is circulated throughout the realm. Subsequently, the board can be requested from any server in the realm, and it can, *within the context of that realm*, be identified with a key alone.

The client must translate this "bare key" into an HTTP request to one or more servers.

Given a tiny realm with three participating servers -- `bogbody.biz`, `0l0.lol`, and `spring83.kindrobot.ca` -- the board identified by the key

```
ca93846ae61903a862d44727c16fed4b80c0522cab5e5b8b54763068b83e0623
```

could be requested first from one random server:

```
https://bogbody.biz/ca93846ae61903a862d44727c16fed4b80c0522cab5e5b8b54763068b83e0623
```

and later from a different random server:

```
https://spring83.kindrobot.ca/ca93846ae61903a862d44727c16fed4b80c0522cab5e5b8b54763068b83e0623
```

If the board had not been updated, the responses to both requests would be the same.

Once again, much of the burden of the protocol falls on the client: to understand which keys are associated with which realms, and to transmit requests to random servers in those realms.

> *Aside:* The simplest and clearest implementation of this will be a client associated with just one realm. While a multi-realm client is totally feasible technically, the UX feels a bit daunting.

When publishing a board, the server should likewise choose a random server. The client should append this "hint" to the board HTML:

```
<meta name="spring:realm" content="<URL of realm JSON document>">
```

A bare key doesn't make any sense outside of the context of a realm. If the publisher with the key listed above adds a `<link>` element to their home page to tell people about their board, they should use a full board URL, choosing a random server from the realm:

```
<link rel="alternate" type="text/board+html" href="https://bogbody.biz/ca93846ae61903a862d44727c16fed4b80c0522cab5e5b8b54763068b83e0623" />
``` 

## Denying keys together

The automatic circulation of boards puts significant extra pressure on moderation. Peers in a realm use a shared denylist. Different realms will use different processes to manage that denylist; consequently, that process is not included in this specification.

> *Aside:* The process probably ought to be a public and collaborative.

The realm denylist is a plain text file. Processing it, the server should ignore lines that are empty or begin with `#`, matching the remaining lines against the regex for conforming keys, extracting one key per line.

Here is an example denylist file:

```
# Test key, to ensure denylist is working
d17eef211f510479ee6696495a2589f7e9fb055c2576749747d93444883e0123

# Not a key, should be ignored
zombo.com

# Another test key
69143e1ffe490de23a1081575fd06048a2a1b5783eb44efa0c05185de83e0123
```

The server may also honor other denylists obtained from other sources. Outside the realm denylist, peers do not have to agree completely on which keys to deny; if a majority of servers in a realm deny a key, its boards will not propagate through the gossip algorithm.

The server should synchronize its denylist with the realm denylist at least once per day.