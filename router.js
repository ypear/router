const ypearRouter = async (peers, options) => {
  /**
   * default options:
   * 
   * seed
   * 
   * (if no seed then you need to let userbase handle it and just leave options {} empty)
   * 
   * 
   * userbase options:
   * 
   * made by userbase automaticaly
   * 
   * 
   * options.cache:
   * 
   * made by ypearDatabase automatically
   * 
   */
  if (!options.networkName || typeof options.networkName !== 'string') {
    throw new Error('options.networkName should be a string');
  }
  const Hyperswarm = require('hyperswarm');
  const ProtomuxRPC = require('protomux-rpc');
  const b4a = require('b4a');
  const cbor = require('cbor');
  const goodbye = (await import('graceful-goodbye')).default;
  const crypto = require('hypercore-crypto');
  const timing = require('@ypear/timing');
  let started = false;
  if (options.seed && !options.publicKey) {
    const keyPair = crypto.keyPair(b4a.from(options.seed));
    options.publicKey = keyPair.publicKey.toString('hex');
  }
  let swarm;
  const handlers = {};


  const tag = {
    cy: [
      ['a', 'c', '1', 'l', 'D', 'M', 'X', '(', ';', '€', '•', '¤', '¯', '»', 'Å', 'Ï', 'Ú', 'å', 'ï', 'ù', 'ζ', 'η', 'θ', 'κ', 'λ'],  // 0
      ['d', 'f', '3', 'C', '♀', 'L', 'Ō', 'N', '!', ')', ':', 'ƒ', '—', '¥', '°', '¼', 'Æ', 'Ð', 'Û', 'æ', 'ð', 'ú', 'ξ', 'π', 'φ'],  // 1
      ['g', 'h', 'i', '7', 'V', 'H', '@', '-', ',', '„', '™', '¦', '±', '½', 'Ç', 'Ñ', 'Ü', 'ç', 'ñ', 'û', '♠', '♣', '♫', '☼', '♂'],  // 2
      ['Ý', 'è', 'ò', 'j', 't', 'b', 'z', 'R', 'O', '#', '_', '<', '…', 'š', '§', '²', '¾', 'È', 'Ò', 'ü', '♩', '✓', '✗', '☢', '☣'],  // 3
      ['m', '⌂', 'ÿ', 'n', 'o', 'ē', 'ē', 'E', 'I', 'P', 'ß', '=', '>', '†', 'œ', '¨', '³', '¿', 'É', 'Ó', 'Þ', 'é', 'ó', 'ý', '₿'],  // 4
      ['p', 'q', 'r', '4', 'G', 'K', 'à', 'ê', 'ô', 'þ', 'ā', '%', '+', '.', '‡', 'ž', '©', 'µ', 'À', '♥', 'Ê', 'Ô', 'Ē', 'Ī', 'ī'],  // 5
      ['s', 'u', 'Õ', 'á', 'ë', 'õ', 'Ā', 'k', '9', 'F', 'Z', 'J', '[', '?', 'Š', 'Ÿ', 'ª', '¶', 'Á', 'Ë', '♦', 'Ū', 'ū', 'ǖ', 'Ǘ'],  // 6
      ['v', 'w', 'x', '6', 'T', 'W', '^', ']', '/', '‰', '¡', '«', '·', 'Â', 'Ì', 'Ö', 'â', 'ì', 'ö', 'β', 'ǘ', 'Ǚ', 'ǚ', 'Ǜ', 'Ǟ'],  // 7
      ['⌘', 'Í', 'Ø', 'ã', 'y', '2', '8', 'B', 'Y', 'μ', 'Q', 'ō', '&', '{', 'ǜ', '|', 'Œ', '¢', '¬', '¹', 'Ã', '☯', 'í', '÷', 'δ'],  // 8
      ['0', '♪', 'Ǖ', '5', 'e', 'A', 'ǝ', 'U', 'S', '*', '}', 'τ', '~', 'Ž', '£', '®', 'º', 'Ä', 'Î', 'Ù', 'ä', 'î', 'ø', 'ε', '◊']   // 9
    ],
    en: function() {
      let e = '';
      const t = (+new Date()) + '';
      for (const element of t) {
        e += this.cy[Number(element)][Math.floor(Math.random() * this.cy[Number(element)].length)];
      }
      return [e, t];
    },
    de: function(ev) {
      let d = '';
      ev = '' + ev;
      for (const element of ev) {
        for (let x = 0; x < this.cy.length; x += 1) {
          if (this.cy[x].indexOf(element) > -1) { d += x; break; }
        }
      }
      return Number(d);
    },
    /**
     * this is for propagations but not broadcasts and it does not need to be torn-down !!
     * it is to un-see (stop paying attention to) a propagation tag after a time
     * eg: tag.track(evTag, true); // '5dy84£g', true
     * broadcasts also get a tag and are marked as seen by the tracker !
     */
    EXPIRES_IN: 5 * 60 * 1000, // 5 minutes
    has: {}, // propagations and broadcasts are watched in the same thing
    cg: null, // { [ tag: ts ], ... }                                         <----------(not initially setup)
    track: function(ev) { // track if you have seen a proagation before ...               |
      let t; //                                                                           |
      if (!ev) [ev, t] = this.en(); // create tracking tag with it's ts                   |
      else t = this.de(ev);         // just get it's ts                                   |
      this.has[ev] = t;            // set the tag as time                                 |
      if (!this.gc) {              //                                                     setup:
        this.gc = setInterval((tags) => { // delete anything older than 5 minutes
          timing.every('nextMinute', () => { // syncronizer
            for (const [$tag, timestamp] of Object.entries(tags)) {
              if (Date.now() - timestamp > this.EXPIRES_IN - 10000) delete tags[$tag]; // within blounds
            }
          });
        }, this.EXPIRES_IN, this.has);
      }
      return ev;
    },
  };
  

  
  



  const initSwarm = async (options) => {
    swarm = new Hyperswarm({ seed: options.seed ? b4a.from(options.seed) : undefined }); // will be undefined until ub has seed
    swarm.on('connection', function(peer, peerInfo) {
      const rpc = new ProtomuxRPC(peer);
      rpc.remotePublicKey = peer.remotePublicKey.toString('hex');
      rpc.route = `${rpc.remotePublicKey} > ${options.publicKey}`; // will be undefined until ub has seed
      peers[rpc.remotePublicKey] = rpc;
      rpc.on('close', async function() {
        if (options.cache) { // @new
          for await (const cache of Object.values(options.cache)) await cache.peerClose(options.publicKey);
        }
        delete peers[rpc.remotePublicKey];
      });
      rpc.on('error', async function(e) {
        console.log(e);
      });
      rpc.respond(`${rpc.remotePublicKey} > ${options.publicKey}`, async function(d) {
        const decoded = cbor.decode(b4a.from(d));
        if (handlers[decoded.topic]) await handlers[decoded.topic](decoded.data);
        if (decoded.broadcasting) {
          await broadcasted(decoded.topic, decoded.data, decoded.broadcasting, rpc.remotePublicKey);

        }
        else if (decoded.propagating) {
          return b4a.from(cbor.encode(
            await propagation(decoded.topic, decoded.data, decoded.propagating, rpc.remotePublicKey)
          ));
        }
      });
      //
      //
      if (options.userbase) {
        const stream = options.userbase.store.replicate(peer);
        stream.on('error', (err) => console.log('ypearRouter userbase replication error:', err));
        options.userbase.manager.attachStream(stream);
      }
    });
  };

  const knockout = async function(koKeyPair) {
    return new Promise(async (done) => {
      const ko = crypto.sign(b4a.from('ko'), koKeyPair.secretKey);//.toString('hex');
      await new Promise(async (resolve) => {
        const self = swarm.dht.connect(koKeyPair.publicKey/*b4a.from(options.publicKey, 'hex')*/);
        self.on('open', async function () {
          console.log('Client connected!');
          self.write(b4a.from(ko)); // knock them out!
          self.end();
          resolve(true);
        });
        self.on('error', async function (error) {
          console.log('Client errored:', error);
          resolve(false);
        });
      });
      const self = swarm.dht.createServer();
      self.on('connection', function(soc) {
        console.log('called by:', soc.remotePublicKey.toString('hex'));
        soc.on('data', async function(d) {
          if (d.toString('hex') == ko.toString('hex')) options.quit();
        });
        soc.on('error', function(e) {
          if (e.message == 'connection reset by peer') options.quit();
          else console.trace(e);
        });
      });
      await self.listen(koKeyPair);
      done();
    });
  }

  const start = async () => {
    await swarm.join(b4a.alloc(32).fill(options.networkName), { server: true, client: true });
    await swarm.flush();
    console.log(!Object.keys(peers).length, 'is synced at start?');
    if (options.cache?.[options.networkName]?.synced === false && !Object.keys(peers).length) options.cache[options.networkName].synced = true; // @new // todo: needed?
    goodbye(async () => {
      if (options.cache) { // @new
        for await (const cache of Object.values(options.cache)) await cache.selfClose(options.publicKey); // ##selfClose
      }
      swarm.destroy();
    });
    started = true;
  };

  


  // Initialize swarm on creation
  await initSwarm(options);

  
  // senderPublicKey IS baked-in alow like topic !
  async function propagate(topic, data, propagating, senderPublicKey) {
    return new Promise(async (resolve) => {
      if (Object.keys(peers).length === 0) { // If no peers, resolve immediately
        resolve(true);
      }
      else {
        propagating = tag.track(propagating);
        const ev = Object.fromEntries(Object.keys(peers).map(key => [key, false])); // Create tracking object for peer responses
        const handler = { // Create a proxy to monitor when all peers have responded
          set(obj, prop, value) {
            obj[prop] = value;
            let allResponded = true; // Check if all peers have responded
            for (const key in obj) {
              if (!obj[key]) {
                allResponded = false;
                break;
              }
            }
            if (allResponded) { // If all peers have responded, resolve the promise
              delete tag.has[propagating];
              resolve(true); // destroys reference to the proxy
            }
            return true;
          }
        };
        const observer = new Proxy(ev, handler);
        const seen = Object.keys(peers);
        for (const remotePublicKey in peers) { // Send propagation request to all peers
          if (remotePublicKey == senderPublicKey || data.already?.[remotePublicKey]) {
            observer[remotePublicKey] = true;
            continue;
          }
          const peer = peers[remotePublicKey];
          let payload = { ...data };
          if (data.update && options.cache?.[topic].updateStateVector && options.cache[topic].peerStateVectors?.[remotePublicKey]) {
            payload = { ...data, update: options.cache[topic].updateStateVector(remotePublicKey, topic) };
          }
          observer[remotePublicKey] = await peer.request(
            `${options.publicKey} > ${remotePublicKey}`, 
            b4a.from(cbor.encode({ topic, data: payload, propagating, already: seen })), 
            { timeout: 10000 })
          .catch(() => true); // On error or timeout, mark as responded
        }
      }
    });
  }

  async function propagation(topic, data, propagating, senderPublicKey) {
    if (!tag.has[propagating]) {
      return await propagate(topic, data, propagating, senderPublicKey);
    }
    else return true;
  }


  
  // senderPublicKey IS baked-in alow like topic !
  async function broadcast(topic, data, broadcasting, senderPublicKey) {
    return new Promise(async (resolve) => {
      if (Object.keys(peers).length === 0) { // If no peers, resolve immediately
        resolve();
      }
      else {
        broadcasting = tag.track(broadcasting); // deleted when tags.EXPIRES_IN
        const seen = Object.keys(peers);
        for (const remotePublicKey in peers) { // Send propagation request to all peers
          if (remotePublicKey == senderPublicKey || data.already?.[remotePublicKey]) continue;
          const peer = peers[remotePublicKey];
          let payload = { ...data };
          if (data.update && options.cache?.[topic].updateStateVector && options.cache[topic].peerStateVectors?.[remotePublicKey]) {
            payload = { ...data, update: options.cache[topic].updateStateVector(remotePublicKey, topic) };
          }
          peer.event(
            `${options.publicKey} > ${remotePublicKey}`, 
            b4a.from(cbor.encode({ topic, data: payload, broadcasting, already: seen })));
        }
        resolve();
      }
    });
  }

  async function broadcasted(topic, data, broadcasting, senderPublicKey) {
    if (!tag.has[broadcasting]) {
      return await broadcast(topic, data, broadcasting, senderPublicKey);
    }
  }

  


  

  
  
  async function sendPeers(topic, data) {
    return new Promise(async (resolve) => {
      if (Object.keys(peers).length === 0) { // If no peers, resolve immediately
        resolve();
      }
      else {
        if (data.message) console.log('router broadcasting:', data, 'to:', topic);
        if (Object.keys(peers).length) {
          for (const [remotePublicKey, peer] of Object.entries(peers)) {
            let payload = { ...data };
            if (data.update && options.cache?.[topic].updateStateVector && options.cache[topic].peerStateVectors?.[remotePublicKey]) {
              payload = { ...data, update: options.cache[topic].updateStateVector(remotePublicKey, topic) };
            }
            peer.event(`${options.publicKey} > ${remotePublicKey}`, b4a.from(cbor.encode({ topic, data: payload })));
          }
        }
        resolve();
      }
    });
  };
  

  async function sendPeer(publicKey, topic, data) {
    return new Promise(async (done) => {
      const peer = peers[publicKey];
      const route = `${options.publicKey} > ${publicKey}`;
      const encoded = b4a.from(cbor.encode({ topic, data }));
      peer.event(route, encoded);
      done();
    });
  }


  /**
   * Join a topic and register a handler for incoming messages on that topic.
   * 
   * @param {string} topic - The topic to join.
   * @param {Function} handler - The handler function to process incoming messages on the topic.
   * @returns {Function} - A function to broadcast messages to the topic.
   */
  async function alow(topic, handler) {
    handlers[topic] = handler; // Register the handler for the topic
    // Return a broadcaster function for the topic
    const propagator = async (data) => {
      await propagate(topic, data);
    };
    const broadcaster = async (data) => {
      await broadcast(topic, data);
    };
    const forPeers = async (data) => {
      await sendPeers(topic, data);
    };
    const toPeer = async (publicKey, data) => {
      await sendPeer(publicKey, topic, data);
    }
    if (options.cache?.[topic]) await options.cache[topic].sync(forPeers, topic);
    return [propagator, broadcaster, forPeers, toPeer];
  }

  /**
   * Leave a topic and remove its handler.
   * 
   * @param {string} topic - The topic to leave.
   * @returns {Function} - A dummy function that warns if attempting to broadcast to the deleted topic.
   */
  function deny(topic) {
    if (!handlers[topic]) throw new Error(`trying to leave a topic:'${topic}' that does not exist would cause weird results.`);
    /**  unhandshake is any protocol message to initially send that tells peers what to do
    * ie:
    * - cache: delete peer from ''local'' state vectors
    * */
    delete handlers[topic]; // Remove the topic handler
    if (options.cache?.[topic]) delete options.cache[topic];
    // Return a dummy function to warn about broadcasting to a deleted topic
    return () => {
      console.warn(`Attempting to broadcast to a topic:'${topic}' that has been deleted`);
      return null;
    };
  }

  

  


  
  return {
    swarm,
    start,
    get started() { return started; }, // singular for the router
    alow,                              // enable multi event path
    deny,                              // dissable ^^^
    isYpearRouter: true,
    publicKey: options.publicKey,
    destroy: () => {                   // kill underlying streams
      swarm.destroy();
      peers = {};
    },
    get options() { return options; }, // Expose options for other modules to access
    updateOptions: (obj) => {          // used by userbase
      options = { ...obj, ...options }
    },
    updateOptionsCache: (obj) => {     // used by databse and crdt
      if (!options.cache) options.cache = {};
      options.cache = { ...obj, ...options.cache }
    },
    peers,
    tag,
    knockout                           // make sure there is only one of each peer
  };
};

module.exports = ypearRouter;
