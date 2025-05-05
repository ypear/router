# <img src="https://github.com/benzmuircroft/temp/blob/main/Yjs.png" height="32" style="vertical-align:40px;"/>🍐@ypear/router 🌐


### 💾 Installation
```bash
npm install @ypear/router
```

### 👀 Description
A router runs a single Hyperswarm. It routes topics. It is modular and can support a single @ypear/userbase, multiple @ypear/database's and multiple @ypear/crdt's. This is faster and leaner than creating a new Hyperswarm in each module! Altimatly, it leads to a better user experence!

### 🤯 Gotchas

- The `router` must have `options.networkName` which must be a long unique string, so as to not clash with other networks

- Never show your network name

- Topics run on top of network

- The `userbase` takes a `router` that has not been `started`

- If the `router` has a `userbase`; the `router` will replicate the `userbase`'s `corestore`

- A `propagate` will send to each of your max 64 `peers`, which makes them `propagate` to their 64 and so-on and so-on, but, each peer that receives it is tagged in the message and will not respond a second time by a hit from another peer. Each will wait until their entire `tag` has responded/dropped-out/timesout and this will cascade back to you - like a sonar, mapping a room

- Doing a `broadcast` is like doing a `propagate` as a bachground process and continuing

- Each `database` or `crdt` must be on it's own unique `topic`. You can use it without `userbase`, but, you will need to `start` it with `seed` and `username` on your own (think of this as 'unprovable-mode')

- Each `crdt`/`database` added to the `router`, alter the `router`s `opions.cache`, therefore adding themselves to the `router` as `topic`s

- A `database` automatically runs a `crdt` side-by-side under the hood; so each `database` will alter the `router`s `options.cache` twice ('databaseTopic' = `database` and 'databaseTopic-db' = `crdt`)

- Using `alow` achually lets you alow sub-topics (so you can use it for many unique things) and can be used along side `deny`. In-other-words; you arn't forced to alow the `topic` that you `started` the `router` with


### ✅ Usage
See usage with @ypear/userbase instead.
```javascript
(async () => {

  const topic = 'test123';
  // Initialize without userbase
  const router = await require('@ypear/router')({}, {
    networkName: 'very-unique-4898n0aev7e7egigtr',
    seed: 'a788bbf9fe2a420ad2703cabc9efc9e1', // hex 32. unpacks to a determinilistic keyPair (you can get this after userbase.login)
    username: 'bob' // make up a name or got on userbase.login
  });
  
  await router.start(); // join options.networkName
  
  const [
    propagate, // wait till everyone propagates to everyone and replys done 
    broadcast, // same as propagate but no waiting for replys (noone replys)
    toPeers, // max 56 peers (noone replys)
    toPeer // to one peer (does not reply)
  ] = await router.alow(topic, async function handler(d) {
    // messages from other peers on this topic come through here
  });

// Send data
const dataObject = { message: 'hello' };

await propagate(dataObject);

await broadcast(dataObject);

await toPeers(dataObject);

await toPeer(router.publicKey, dataObject); // publicKey is from your seed
})();
```

### 🧰 Methods
```javascript
swarm,
start,
get, // singular for the router
alow, // enable multi event path
deny, // dissable ^^^
isYpearRouter,
publicKey,
destroy, // kill underlying streams
get, // Expose options for other modules to access
updateOptions, // used by userbase
updateOptionsCache, // used by databse and crdt
peers,
tag,
knockout
```

### 📜 Licence
MIT
