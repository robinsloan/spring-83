var Client = {};

// TODO maybe use https://github.com/wilsonpage/fastdom
// wrap all DOM mutations in that; idk, truly

// Rather than create them every time I need them:
Client.encoder = new TextEncoder();
Client.parser = new DOMParser();

Client.boardSources = {};
Client.feedSources = {};

Client.boardTimestamps = {};
Client.hypocorisms = {};

Client.DEV_ACCELERATOR = 1.0; // 1.0
Client.BASE_TIMEOUT_SECONDS = 60*5*Client.DEV_ACCELERATOR;
Client.MAX_TIMEOUT_SECONDS = 60*60*24*Client.DEV_ACCELERATOR;

Client.KEY_REGEX = /^\/([0-9a-f]{64})\/?$/;

Client.FEED_PROXY = "https://us-west1-spring-83.cloudfunctions.net/feed-proxy";

Client.HTTP_VER = "http"

Client.setupEditor = async function() {
  Client.editor = ace.edit("editor");
  Client.editor.setTheme("ace/theme/spring_client");
  Client.editor.session.setMode("ace/mode/html");

  // All options are listed here:
  // https://github.com/ajaxorg/ace/wiki/Configuring-Ace
  Client.editor.setOptions({
    fontFamily: "JetBrains Mono",
    fontSize: "1.25rem",
    behavioursEnabled: false,
    enableBasicAutocompletion: false,
    enableLiveAutocompletion: false,
    enableAutoIndent: true,
    showLineNumbers: false,
    showPrintMargin: false,
    showFoldWidgets: false,
    showGutter: false,
    indentedSoftWrap: false,
    useWorker: false,
    wrap: true,
    tabSize: 2,
  });

  Client.editor.session.on("change", async function(delta) {
    Client.handleEditorChange();
  });

  // Set up Markdown parser
  marked.setOptions({
    headerIds: false,
    smartypants: true,
    mangle: false
  });

  Client.loadEditorHTML();
}

Client.setup = function() {
  Client.setupEditor();

  // https://stackoverflow.com/questions/12235585/is-there-a-way-to-open-all-a-href-links-on-a-page-in-new-windows
  document.body.addEventListener("click", (e) => {
    // composedPath, weeeird
    // https://pm.dartus.fr/blog/a-complete-guide-on-shadow-dom-and-event-propagation/
    const clickedElement = e.composedPath()[0];
    if (clickedElement.nodeName.toUpperCase() === "A") {
      clickedElement.target = "_blank";
    }
  }, true);

  // -- Element references --

  Client.publicKeyDisplay = document.querySelector("editor-zone input#public-key");

  Client.byteCounter = document.querySelector("editor-zone byte-counter");
  Client.publishButton = document.querySelector("editor-zone publish-button");

  Client.springfileModal = document.querySelector("springfile-modal");
  Client.springfileEditor = Client.springfileModal.querySelector("textarea");

  Client.dropZone = document.querySelector("drop-zone");
  Client.fileUpload = Client.dropZone.querySelector("input#keypair-upload");

  Client.showingSpringFileEditor = false;
  Client.okayToPublish = true;

  // -- Drop zone --

  Client.dropZone.addEventListener("drop", (e) => {
    e.preventDefault(); // don't open the file!
    e.stopPropagation();

    let file = e.dataTransfer.files[0];
    let reader = new FileReader();
    reader.addEventListener("load", (f) => {
      const fileString = f.target.result;
      Client.loadKeypairFromString(fileString);
    });

    reader.readAsText(file);
  });

  Client.dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault(); // don't open the file!
    e.stopPropagation();
    Client.dropZone.classList.add("drop-glow");
  });

  Client.dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault(); // don't open the file!
    e.stopPropagation();
    Client.dropZone.classList.remove("drop-glow");
  });

  Client.dropZone.addEventListener("dragover", (e) => {
    e.preventDefault(); // don't open the file!
    e.stopPropagation();
  });

  // -- File upload, alternative to drop --

  Client.fileUpload.addEventListener("change", (e) => {
    let file = e.target.files[0];
    if (file) {
      let reader = new FileReader();
      reader.addEventListener("load", (f) => {
        const fileString = f.target.result;
        Client.loadKeypairFromString(fileString);
      });

      reader.readAsText(file);
    }
  });

  // -- Publish button --

 Client.publishButton.addEventListener("click", (e) => {
    if (Client.okayToPublish) {
      Client.publishButton.innerHTML = "Publishing&hellip;";
      Client.publishBoard();
    }
  });

  // -- Springfile editor --

  let springfileContent = localStorage.getItem("springfile");
  if (springfileContent) {
    Client.springfileEditor.value = springfileContent;
  } else {
    Client.springfileEditor.value = STARTER_SPRINGFILE;
  }

  // When you're viewing the Springfile modal and you click outside the textarea, it closes
  Client.springfileModal.addEventListener("mousedown", (e) => {
    if (e.target.tagName.toLowerCase() == "springfile-modal") {
      Client.hideSpringfileEditor();
    }
  });

  // just copying and pasting for now! Sorryyyy
  Client.springfileModal.addEventListener("touchstart", (e) => {
    if (e.target.tagName.toLowerCase() == "springfile-modal") {
      Client.hideSpringfileEditor();
    }
  });

  // Escape key shortcut to show/hide Springfile editor
  document.addEventListener("keydown", (e) => {
    if (e.code == "Escape") {
      Client.toggleSpringfileEditor();
      e.preventDefault();
    }
  });

  // -- Keypair --

  let secret = Client.getSecretKey();
  let public = Client.getPublicKey();
  if (secret && public) {
    Client.hideDropZone();
    Client.publicKeyDisplay.value = `${Client.homeServer()}${public}`;
  }

  // -- Public key display field --

  Client.publicKeyDisplay.addEventListener("click", (e) => {
    e.target.setSelectionRange(0, e.target.value.length);
  });

  // -- Action buttons --

  document.querySelectorAll(".action").forEach((element) => {
    element.addEventListener("click", (e) => {
      if (element.classList.contains("dangerous")) {
        if (e.shiftKey && e.metaKey) {
          // you may pass
        } else {
          alert("That's a dangerous action. If you're 100% sure, hold the command and shift keys while clicking the button again.");
          e.preventDefault();
          return;
        }
      }

      if (element.classList.contains("edit-springfile")) {
        Client.showSpringfileEditor();
      }

      if (element.classList.contains("save-keypair")) {
        Client.saveKeypairFile();
      }

      if (element.classList.contains("forget-keypair")) {
        Client.forgetKeypair();
      }

      if (element.classList.contains("force-refresh")) {
        Client.checkSources(true);
      }

      if (element.classList.contains("factory-reset")) {
        Client.factoryReset();
      }
    });
  });

  // -- Boot it up --

  Client.parseSpringfile();
  Client.reloadItemGrid(true) // force;
  // No need to do this, becuase it happens automatically wiith reloadItemGrid:
  // Client.checkSources(true); // force;
  setInterval(Client.checkSources, 1000*60);
}

document.addEventListener("DOMContentLoaded", () => {
  Client.setup();
});

// -- Utility --

Client.factoryReset = async function() {
  Client.forgetKeypair();
  localStorage.clear();
  location.reload();
}

Client.lastModifiedInHTML = async function(html) {
  let boardElement = await Client.parser.parseFromString(html, "text/html");
  let timeElement = boardElement.querySelector("time");
  let timestamp = timeElement.getAttribute("datetime");
  if (timeElement && timestamp) {
    // TODO: validate this actually an ISO 8601 timestamp! duh!
    return new Date(timestamp);
  } else {
    return null;
  }
}

// -- Keypair stuff --

Client.showDropZone = async function() {
  Client.dropZone.style.display = "flex";
}

Client.hideDropZone = async function() {
  Client.dropZone.style.display = "none";
}

Client.loadKeypairFromString = async function(fileString) {
  const secret = fileString.slice(0, 64).trim();
  const public = fileString.slice(64, 128).trim();

  try {
    // let's make sure it's a real Ed25519 keypair
    const testMessage = "hello, world";
    const testMessageBytes = Client.encoder.encode(testMessage);
    const signatureBytes = await nobleEd25519.sign(testMessageBytes, secret);
    const signature = nobleEd25519.utils.bytesToHex(signatureBytes);
    const verified = await nobleEd25519.verify(signature, testMessageBytes, public);

    if (!verified) {
      alert("That's not a valid Ed25519 keypair.");
      return;
    }
  } catch (e) {
    console.log(e);
    alert("That's not a valid Ed25519 keypair.");
    return;
  }

  console.log("That's a good keypair");

  sessionStorage.setItem("secretKey", secret);
  sessionStorage.setItem("publicKey", public);

  Client.publicKeyDisplay.value = `${Client.homeServer()}${public}`;
  Client.hideDropZone();

  // Doing this here to get the new public key included in parseSpringfile()
  Client.parseSpringfile();
  Client.reloadItemGrid();
}

Client.forgetKeypair = async function() {
  sessionStorage.clear();
  Client.showDropZone();
}

Client.getSecretKey = function() {
  let secret = sessionStorage.getItem("secretKey");
  if (secret) {
    return secret;
  } else {
    console.log("Tried to get secret key but I don't have one stored.");
    return null;
  }
}

Client.getPublicKey = function() {
  let public = sessionStorage.getItem("publicKey");
  if (public) {
    return public;
  } else {
    console.log("Tried to get public key but I don't have one stored.");
    return null;
  }
}

Client.saveKeypairFile = function() {
  const secret = Client.getSecretKey();
  const public = Client.getPublicKey();
  if (secret == null || public == null) {
    console.log("Tried to save keypair without keypair in storage")
    return;
  }
  const keyString = `${secret}${public}`;
  const memo = public.slice(0, 12);
  // Just the 20XX-XX-XX part of the Date:
  const timestamp = (new Date()).toISOString().slice(0, 10);
  const downloader = document.createElement("a");
  const file = new Blob([keyString], { type: "text/plain;charset=utf-8" });
  downloader.href = URL.createObjectURL(file);
  downloader.download = `spring-83-keypair-${timestamp}-${memo}.txt`;
  downloader.click();
}

// -- Springfile editor behavior --

Client.showSpringfileEditor = function() {
  // note .parentElement, for springfile-modal
  Client.springfileEditor.parentElement.style.display = "block";
  Client.showingSpringFileEditor = true;
  Client.springfileEditor.focus();
  Client.springfileEditor.scrollTop = 0;
}

Client.hideSpringfileEditor = function() {
  // note .parentElement, for springfile-modal
  Client.springfileEditor.parentElement.style.display = "none";
  Client.showingSpringFileEditor = false;
  Client.springfileEditor.blur();

  // TODO make these work across multiple "accounts"
  localStorage.setItem("springfile", Client.springfileEditor.value);

  // KER-THUNK
  Client.parseSpringfile();
  Client.reloadItemGrid(false); // Don't force checks
}

Client.toggleSpringfileEditor = function() {
  if (Client.showingSpringFileEditor) {
    Client.hideSpringfileEditor();
  } else {
    Client.showSpringfileEditor();
  }
}

// It's a bit muddled the way the user's public key stuff is included at the top here -- maybe think about breaking it out

Client.parseSpringfile = async function() {
  let newBoardSources = {};
  let newFeedSources = {};
  let index = 0;

  let previousLine = null;

  // reset pet names
  Client.hypocorisms = {};

  // First, does the user have a board?

  let publicKey = Client.getPublicKey();
  if (publicKey) {
    Client.hypocorisms[publicKey] = "Your board";
    newBoardSources[publicKey] = {
      index: -1, // always first
      lastChecked: -1,
      lastHeardFrom: -1,
      timeout: 0
    };
  }

  let springfile = Client.springfileEditor.value;

  springfile.split("\n").forEach((line) => {
    let trimmed = line.trim();

    if (trimmed[0] == "#") {
      // It's a comment, ignore it
      previousLine = null;
      return;
    }

    if (trimmed.length == 0) {
      previousLine = null;
      return;
    }

    try {
      let url = new URL(trimmed);
      if (url) {
        const keyMatch = url.pathname.match(Client.KEY_REGEX);
        if (keyMatch) {
          // It is a Spring '83 URL
          // TODO: this is a stupid way of validating this, obviously

          // normalize
          let key = keyMatch[1].replace(/\//g, "").toLowerCase().trim();

          // TODO validate key

          if (previousLine) {
            Client.hypocorisms[key] = previousLine;
          } else {
            // Just a little peek of the key
            Client.hypocorisms[key] = key.slice(0, 12) + "&hellip;"
          }
          if (Client.boardSources[key]) {
            // We want to retain previous info about server availability
            // but we do have to remap the index
            newBoardSources[key] = Client.boardSources[key];
            newBoardSources[key].index = index++;
          } else {
            // It's a key we haven't seen, so we'll initialize it
            newBoardSources[key] = {
              index: index++, // is this too cryptic/tricky? I like it
              lastChecked: -1,
              lastHeardFrom: -1,
              timeout: Math.round(Client.BASE_TIMEOUT_SECONDS * Math.random())
            };
          }
        } else {
          // It's not a Spring '83 URL, so let's try RSS

          let feedKey = trimmed.replace(/\W/g, "_");
          if (previousLine) {
            Client.hypocorisms[feedKey] = previousLine;
          }
          if (Client.feedSources[feedKey]) {
            // Keep the data, but remap the index
            newFeedSources[feedKey] = Client.feedSources[feedKey];
            newFeedSources[feedKey].index = index++;
          } else {
            newFeedSources[feedKey] = {
              index: index++, // is this too cryptic/tricky? I like it
              url: url.toString(),
              feedUrl: null,
              lastChecked: -1,
              lastHeardFrom: -1,
              timeout: Math.round(Client.BASE_TIMEOUT_SECONDS * Math.random())
            }
          }
        } // end else

        // We just processed a URL of some kind, so:
        previousLine = null;
      }
    } catch (e) {
      // Lines not parsable as URLs drop us down here:
      if (trimmed.length > 1) {
        // This is potentially the memo for the NEXT line
        previousLine = trimmed;
      } else {
        previousLine = null;
      }
    }
  });

  Client.boardSources = newBoardSources;
  Client.feedSources = newFeedSources;
}

// -- Board editing --

Client.clearDraftHTML = function() {
  let public = Client.getPublicKey();
  if (public) {
    localStorage.removeItem(`draft-${public}`);
    return true;
  }

  return false;
}

Client.setDraftHTML = function(draftHTML) {
  let public = Client.getPublicKey();
  if (public) {
    localStorage.setItem(`draft-${public}`, draftHTML);
    return true;
  }

  return false;
}

Client.getDraftHTML = function() {
  let public = Client.getPublicKey();
  if (public) {
    let draftHTML = localStorage.getItem(`draft-${public}`);
    if (draftHTML) {
      return draftHTML;
    } else {
      return null;
    }
  }

  return null;
}

Client.loadEditorHTML = function() {
  const public = Client.getPublicKey();

  if (public) {
    const draftHTML = Client.getDraftHTML();
    if (draftHTML) {
      Client.editor.session.setValue(draftHTML);
      return;
    } else {
      // This shouldn't happen too often
      const boardHTML = Client.getBoardHTML(public);
      if (boardHTML) {
        Client.editor.session.setValue(boardHTML);
        return;
      }
    }
  }

  // Oh well!
  Client.editor.session.setValue(`Hello, world!`);
}

Client.handleEditorChange = async function() {
  const contents = Client.editor.getValue();
  if (contents.length == 0) {
    Client.clearDraftHTML();
   } else {
    Client.setDraftHTML(contents);
  }

  Client.updateByteCounter();
}

Client.updateByteCounter = async function() {
  const bytes = Client.encoder.encode(await Client.renderFullBoardHTML()).length;

  let message = `with the timestamp added, that's ${bytes} bytes`;

  if (bytes > 2217) {
    message = `${bytes} bytes! too many bytes!`;
    Client.publishButton.classList.add("byte-overflow");
    Client.byteCounter.classList.add("byte-overflow");
    Client.okayToPublish = false;
  } else {
    Client.publishButton.classList.remove("byte-overflow");
    Client.byteCounter.classList.remove("byte-overflow");
    Client.okayToPublish = true;
  }

  document.querySelector("byte-counter").innerHTML = message;
}

// -- Board publishing --

Client.homeServer = function() {
  // note, we expect a trailing slash
  //return "http://localhost:8787/";
  return "https://bogbody.biz/"
}

Client.displayPublishError = async function(message) {
  Client.byteCounter.innerHTML = `error: ${message}`;
}

Client.resetPublishError = async function() {
  Client.updateByteCounter();
}

Client.publishBoard = async function() {
  // TODO must validate length of HTML fragment

  const secret = Client.getSecretKey();
  const public = Client.getPublicKey();

  if (secret == null) {
    Client.displayPublishError("no keypair in storage");
    return;
  }

  const fullBoard = await Client.renderFullBoardHTML();

  const fullBoardForSigning = Client.encoder.encode(fullBoard);
  const signatureBytes = await nobleEd25519.sign(fullBoardForSigning, secret);
  const signature = nobleEd25519.utils.bytesToHex(signatureBytes);

  const verified = await nobleEd25519.verify(signature, fullBoardForSigning, public);

  if (verified) {
    console.log("Verified my own signature, nice");
  } else {
    console.log("Hmm I screwed up my own signature");
  }

  // TODO: some retry logic...

  let response;
  const server = Client.homeServer();
  const path = `${server}${public}`;

  try {
    response = await fetch(path, {
      method: "PUT",
      mode: "cors",
      headers: {
        "Content-Type": "text/html;charset=utf-8",
        "Spring-Signature": signature
      },
      body: Client.encoder.encode(fullBoard) // MARK -- MAYBE
    });

    if (response.ok) {
      Client.publishButton.innerHTML = "Published!";
      Client.resetPublishError();
      Client.checkBoardSource(public, true);
      return;
    }

    if (response.status == 304) {
      Client.publishButton.innerHTML = "(already published)";
      return;
    }

    if (response.status >= 400) {
      console.log("some kind of errorrrrr");
      // TODO better response code handling...
    }

  } catch (e) {
    console.log(e);
    console.log("Error with fetch; server not found? TODO, document.");
  }

  // If we fell through to this, we failed
  Client.publishButton.innerHTML = "Publish";
  Client.displayPublishError("couldn't contact your home server");
}

// -- Board handling stuff --

Client.renderFullBoardHTML = async function() {
  let t = performance.now();
  const timestamp = new Date().toISOString().slice(0, 19) + "Z";
  const boardMarkdown = Client.editor.getValue();
  const boardHTML = marked.parse(boardMarkdown);
  const timeElement = `\n<time datetime="${timestamp}"></time>`;
  console.log(`rendered full board HTML in ${(performance.now() - t).toPrecision(2)} seconds`);
  return boardHTML + timeElement;
}

Client.setBoardHTML = function(key, board) {
  localStorage.setItem(key, board);
}

Client.getBoardHTML = function(key) {
  return localStorage.getItem(key);
}

// -- View source --

Client.showViewSource = function(key) {
  const id = `board-${key}`;
  let viewSource = document.querySelector(`#${id} view-source`);
  viewSource.style.display = "block";
}

Client.hideViewSource = function(key) {
  const id = `board-${key}`;
  let viewSource = document.querySelector(`#${id} view-source`);
  viewSource.style.display = "none";
}

// -- Item retrieval and display --

Client.setFeedHTML = function(url, content) {
  localStorage.setItem(`feed-${url}`, content);
}

Client.getFeedHTML = function(url) {
  return localStorage.getItem(`feed-${url}`);
}

Client.reloadItemGrid = async function(forceCheck = false) {
  let itemGrid = document.querySelector("item-grid");
  if (itemGrid) {
    itemGrid.innerHTML = "";
  }

  Object.keys(Client.boardSources).forEach(async (key) => {
    Client.createBoardItem(key, forceCheck);
  });

  Object.keys(Client.feedSources).forEach(async (feedKey) => {
    Client.createFeedItem(feedKey, forceCheck);
  });
}

Client.checkSources = async function(forceCheck = false) {
  // The idea is that we run the check functions relatively often,
  // but they often return quickly, saying "nah, not yet"

  Object.keys(Client.boardSources).forEach(async (key) => {
    // key, force
    await Client.checkBoardSource(key, forceCheck);
  });

  Object.keys(Client.feedSources).forEach(async (feedKey) => {
    // key, force
    await Client.checkFeedSource(feedKey, forceCheck);
  });
}

Client.checkBoardSource = async function(key, forceCheck = false) {
  const url = Client.homeServer() + key;
  let source = Client.boardSources[key];

  if (!forceCheck && ((source.lastChecked + source.timeout) <= Date.now())) {
    console.log(`Not ready to check ${key} yet.`);
    return false;
  }

  console.log(`Checking board at URL: ${url}`);

  // TODO might be able to just check existing board HTML,
  // rather than maintain this other data structure. Fine for now though
  let ifModifiedSince = Client.boardTimestamps[key] ? Client.boardTimestamps[key] : new Date(0);

  source.lastChecked = Date.now();

  let response;
  try {
    response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        "If-Modified-Since": new Date(ifModifiedSince).toUTCString()
      }
    });
  } catch (e) {
    console.log("Error with fetch; server not found? TODO: document.");
    console.log("Extending timeout with jittered exponential backoff.");
    source.timeout = source.timeout + Math.round(source.timeout * Math.random());
    source.timeout = Math.min(source.timeout, Client.MAX_TIMEOUT_SECONDS);
    return;
  }

  source.lastHeardFrom = Date.now();

  // jitter the timeout
  source.timeout = Client.BASE_TIMEOUT_SECONDS +
                   Math.round(Client.BASE_TIMEOUT_SECONDS * Math.random());

  if (!response) {
    console.log("Null response fell through in checkBoardSource... this shouldn't happen");
    return;
  }

  if (response.status == 304) {
    console.log("No new board available for this key.");
    return false;
  }

  if (response.status == 404) {
    console.log("No board found for this key.");
    return false;
  }

  const signature = response.headers.get("Spring-Signature");
  if (!signature) {
    console.log("No signature header?!");
    return false;
  }

  const board = await response.text();

  // https://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers

  const boardForVerification = Client.encoder.encode(board);

  // TODO validate signature format?
  const verified = await nobleEd25519.verify(signature, boardForVerification, key);

  if (verified) {
    console.log("Signature verified, how nice.");
  } else {
    console.log("Signature is not correct; dropping");
    return false;
    // TODO mark server as untrustworthy
  }

  const existingBoard = Client.getBoardHTML(key);
  if (existingBoard) {
    const existingTimestamp = await Client.lastModifiedInHTML(existingBoard);
    const incomingTimestamp = await Client.lastModifiedInHTML(board);

    if (existingTimestamp >= incomingTimestamp) {
      console.log("New board is older or equivalent to the one I have. Ignoring.");
      return false;
    } else {
      Client.boardTimestamps[key] = incomingTimestamp;
    }
  }

  Client.setBoardHTML(key, board);
  Client.refreshBoardItem(key);

  return true;
}

Client.createBoardItem = function(key) {
  const id = `board-${key}`;
  const index = Client.boardSources[key].index;

  let template = document.querySelector("template#board-template");
  let boardDisplay = template.content.cloneNode(true);
  // I find it confusing that I still have to query into the board-item here:
  let boardItem = boardDisplay.querySelector("board-item");

  boardItem.id = id;
  boardItem.style.order = `${index}`;
  boardItem.dataset.index = index;

  // var(--board-jitter) is 2rem
  let boardArea = boardItem.querySelector("board-area");
  let predictable = new alea(key); // this produces a function!
  boardArea.style.top = `${(predictable() * 2.0).toPrecision(2)}rem`;
  boardArea.style.left = `${(predictable() * 2.0).toPrecision(2)}rem`;

  let viewSource = boardArea.querySelector("view-source");
  let viewSourceTextArea = viewSource.querySelector("textarea");

  // CONJURE THE SHADOW DOM, RAHHH
  let boardContent = boardItem.querySelector("board-content");
  boardContent.attachShadow({mode: "open"});

  const boardHTML = Client.getBoardHTML(key);
  if (boardHTML) {
    // MARK -- I am adding this little scrap of CSS here
    boardContent.shadowRoot.innerHTML = DEFAULT_BOARD_CSS + boardHTML;
    // TODO: what I'd really like to do is strip out the <time> tag here...
    viewSourceTextArea.innerHTML = boardHTML;
  }

  // In the functions below, I never actually expect the locally-bound variables like `viewSource` and `boardContent` to work inside these callbacks... but they do... and it's weird

  // Click handler to SHOW View Source
  viewSource.addEventListener("click", (e) => {
    // it's brittle!
    viewSource.style.zIndex = "1000";
    viewSourceTextArea.style.cursor = "text";
    viewSourceTextArea.style.backgroundColor = "var(--c-midnight)";
    boardContent.style.cursor = "pointer";
  });

  // Click handler to HIDE View Source
  boardContent.addEventListener("click", (e) => {
    // yep, pretty brittle!
    if (viewSource.style.zIndex == "1000") {
      viewSource.style.zIndex = "10";
      viewSourceTextArea.style.cursor = "pointer";
      viewSourceTextArea.style.backgroundColor = "var(--c-light-gray)";
      boardContent.style.cursor = "default";
    }
  });

  if (Client.hypocorisms[key]) {
    boardItem.querySelector("board-label").innerHTML = Client.hypocorisms[key];
  }

  let itemGrid = document.querySelector("item-grid");
  itemGrid.append(boardItem);

  Client.checkBoardSource(key, true); // force
  return boardItem;
}

Client.refreshBoardItem = function(key) {
  let boardHTML = Client.getBoardHTML(key);

  if (!boardHTML) {
    boardHTML = `
    <style>
      div {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
      }

      p {
        text-align: center;
        width: 50%;
      }
    </style>
    <div><p>No board found for key ${key.slice(0, 12)}&hellip;</p></div>`.trim();
  }

  let boardItem = document.querySelector(`#board-${key}`);

  if (boardItem == null) {
    boardItem = Client.createBoardItem(key);
  }

  if (Client.hypocorisms[key]) {
    boardItem.querySelector("board-label").innerHTML = Client.hypocorisms[key];
  }

  let boardContent = boardItem.querySelector("board-content");
  let viewSourceContent = boardItem.querySelector("view-source textarea");

  // MARK -- I am adding the extra CSS here
  boardContent.shadowRoot.innerHTML = DEFAULT_BOARD_CSS + boardHTML;
  viewSourceContent.innerHTML = boardHTML;
}

Client.checkFeedSource = async function(feedKey, forceCheck = false) {
  let feedSource = Client.feedSources[feedKey];

  if (!forceCheck &&
     ((feedSource.lastChecked + feedSource.timeout) <= Date.now())) {
    console.log(`Not ready to check ${feedKey} yet.`);
    return false;
  }

  console.log(`Checking feed source ${feedKey}`);

  feedSource.lastChecked = Date.now();
  let fetchUrl = feedSource.url;

  // Have we found and memo-ized the correct feed URL?
  if (feedSource.feedUrl) {
    fetchUrl = feedSource.feedUrl;
  }

  try {
    // Send this through a proxy, because CORS
    let response = await fetch(Client.FEED_PROXY, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain" },
      body: fetchUrl
    });

    feedSource.lastHeardFrom = Date.now();
      // jitter the timeout
    const bodyText = await response.text();
    const contentType = response.headers.get("content-type");
    let parsed = Client.parseFeedSourceResponse(feedKey, fetchUrl, contentType, bodyText);
    if (parsed) {
      feedSource.timeout = Client.BASE_TIMEOUT_SECONDS +
                     Math.round(
                      Client.BASE_TIMEOUT_SECONDS * Math.random()
                     );
    } else {
      // exponential backoff for stuff that just doesn't work at all
      feedSource.timeout = feedSource.timeout +
                           Math.round(
                             feedSource.timeout * Math.random()
                           );
      feedSource.timeout = Math.min(
                            feedSource.timeout,
                            Client.MAX_TIMEOUT_SECONDS
                          );
    }
  } catch (e) {
    console.log(`error in checkFeedSource: ${e}`);
  }
}

// returns false if it doesn't see a path forward at all
Client.parseFeedSourceResponse = async function(feedKey, fetchedUrl,
                                                contentType, bodyText) {
  // We will try to be improvisational rather than brittle here.

  let feedSource = Client.feedSources[feedKey];

  // First, if it's an actual RSS feed:
  const isRSSFeed = contentType.includes("rss") ||
                    contentType.includes("xml");

  if (isRSSFeed) {
    // Yes! Memo-ize this as the official feed URL!
    // So we don't have to go searching in the HTML (below) more than once
    feedSource.feedUrl = fetchedUrl;

    let xmlDOM = await Client.parser.parseFromString(bodyText, "text/xml");
    if (xmlDOM) {
      let item = xmlDOM.querySelector(`item`) || xmlDOM.querySelector(`entry`);
      if (item) {
        let link = item.querySelector(`link[type="text/html"]`) || item.querySelector("link");
        let feedTitleElement = xmlDOM.querySelector("channel title") || xmlDOM.querySelector("feed title");
        let itemTitleElement = item.querySelector("title");

        let href = link?.getAttribute("href") || link?.innerHTML || "#";
        let feedTitleText = feedTitleElement?.text || feedTitleElement?.childNodes[0]?.nodeValue || "unknown title";
        let itemTitleText = itemTitleElement?.text || itemTitleElement?.childNodes[0]?.nodeValue || href;

        let displayedTitle = Client.hypocorisms[feedKey] ? Client.hypocorisms[feedKey] : feedTitleText;
        const content = `<h2><a href="${href}" target="_new">${itemTitleText}</a></h2><h1>${displayedTitle}</h1>`;

        Client.setFeedHTML(feedKey, content);
        Client.refreshFeedItem(feedKey);
        return true;
      }
    }
  }

  // Not an RSS feed, huh...
  // Well, maybe it's an HTML page. We can work with that:
  let htmlDOM = await Client.parser.parseFromString(bodyText, "text/html");
  if (htmlDOM) {
    let link = htmlDOM.querySelector(`head link[rel="alternate"]`);
    if (link) {
      let url = link.getAttribute("href")
      try {
        let trial = new URL(url);
        if (trial) {
          // We "annotate" the feedSource object with this new information
          feedSource["feedUrl"] = trial.href;
          Client.checkFeedSource(feedKey, true); // force
          return true;
        }
      } catch (e) {
        // This catches when the creation of the URL fails
        // so we try another strategy
        try {
          let basename = new URL(fetchedUrl).href + "/";
          if (new URL(basename + url)) {
            feedSource["feedUrl"] = basename + url;
            Client.checkFeedSource(feedKey, true); // force
            return true;
          }
        } catch (e) {
          // This catches when the other strategy didn't work either!!
          console.log("Can't seem to get anything out of this URL:");
          console.log(url);
          return false;
        }
      }
    }
  }

  // shouldn't get down here!
  return false;
}

Client.createFeedItem = function(feedKey) {
  const id = `feed-${feedKey}`;
  const feedSource = Client.feedSources[feedKey];

  let template = document.querySelector("template#feed-template");
  let feedDisplay = template.content.cloneNode(true);
  // I find it confusing that I still have to query into the feed-item here:
  let feedItem = feedDisplay.querySelector("feed-item");

  feedItem.id = id;
  feedItem.dataset.index = feedSource.index;
  feedItem.style.order = `${feedSource.index}`;

  let feedArea = feedItem.querySelector("feed-area");
  // Only jitter feed items side to side
  // var(--feed-jitter) is 2rem
  let predictable = new alea(feedKey);
  feedArea.style.left = `${(predictable() * 2.0).toPrecision(2)}rem`;

  const feedContent = Client.getFeedHTML(feedKey);
  if (feedContent) {
    feedArea.innerHTML = feedContent;
  } else {
    feedArea.innerHTML = `<p>Nothing yet for ${feedSource.url}</p>`;
  }

  let itemGrid = document.querySelector("item-grid");
  itemGrid.append(feedItem);

  Client.checkFeedSource(feedKey, true); // force
  return feedItem;
}

Client.refreshFeedItem = function(feedKey) {
  let feedHTML = Client.getFeedHTML(feedKey);
  // TODO I think this never executes, which is OK:
  if (!feedHTML) {
    feedHTML = `<p>Couldn't find anything stored at ${Client.feedSources[feedKey].url} 😔</p>`;
  }
  const id = `feed-${feedKey}`;
  let feedItem = document.querySelector(`#${id}`);

  if (feedItem == null) {
    feedItem = Client.createFeedItem(feedKey);
  }

  let feedArea = feedItem.querySelector("feed-area");
  feedArea.innerHTML = feedHTML;
}

DEFAULT_BOARD_CSS = `
<style>
  :host {
    background-color: var(--c-paper-bright);
    box-sizing: border-box;
    padding: 2rem;
  }
  time { display: none; }
  p, h1, h2, h3, h4, h5 { margin: 0 0 2rem 0; }
</style>
`.trim();

STARTER_SPRINGFILE = `
This is your Springfile. You can enter Spring '83 keys, one on each line. This demo client will try its best to retrieve feeds, too, so feel free to drop in RSS and website URLs.

Anything that's not a Spring '83 key or a URL will be ignored, so you can jot notes here, as well -- just like this. Here's a trick: the line preceding a key or URL will be used as its label, so consider typing an annotation that's meaningful to you.

Boards and feed items will be displayed in roughly the order you list them here.

Robin's board
https://bogbody.biz/1e4bed50500036e8e2baef40cb14019c2d49da6dfee37ff146e45e5c783e0123

Test board
https://bogbody.biz/ab589f4dde9fce4180fcf42c7b05185b0a02a5d682e353fa39177995083e0583

Hiroko's blog
http://rhiroko.blog.fc2.com/

Matt Webb, the superbrain
https://interconnected.org/home/feed

A Robin
https://www.robinsloan.com/feed.xml

Another Robin
https://www.robinrendle.com/

TOOZE!
https://adamtooze.substack.com/

Maya the great
https://maya.land/feed.xml

Frances Coppola (macro, etc.)
https://www.coppolacomment.com/

Spring '83 dev board
https://bogbody.biz/ca93846ae61903a862d44727c16fed4b80c0522cab5e5b8b54763068b83e0623

Pulp Covers
https://pulpcovers.com/feed/

Mandy Brown (mostly books)
https://aworkinglibrary.com/feed/index.xml

Alan Jacobs
https://blog.ayjay.org/feed/

Chase, designer
https://chasem.co/feed.xml

https://vgdensetsu.tumblr.com/rss

Timothy Morton
https://ecologywithoutnature.blogspot.com/feeds/posts/default

https://eukaryotewritesblog.com/feed/

Journal of the History of Ideas
https://jhiblog.org/feed/

Phenomenal World newsletter
https://us16.campaign-archive.com/feed?u=30638b4a1754ffe5cdc9f22c1&id=31efc3f9d3

https://www.ruby-lang.org/en/feeds/news.rss

https://dancohen.org/feed/

Included to verify that broken feeds are handled appropriately:
https://feeds.transistor.fm/cassettes-with-william-july
`.trim();