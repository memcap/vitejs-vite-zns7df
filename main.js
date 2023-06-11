import './style.css';
import 'xterm/css/xterm.css';
import { FitAddon } from 'xterm-addon-fit';
import { WebContainer } from '@webcontainer/api';
import { Terminal } from 'xterm';
import { files } from './files';

/** @type {import('@webcontainer/api').WebContainer}  */
let webcontainerInstance;

window.addEventListener('load', async () => {
  textareaEl.value = files['index.js'].file.contents;

  textareaEl.addEventListener('input', (e) => {
    writeIndexJS(e.currentTarget.value);
  });

  const fitAddon = new FitAddon();

  const terminal = new Terminal({
    convertEol: true,
  });
  terminal.loadAddon(fitAddon);
  terminal.open(terminalEl);
  fitAddon.fit();

  // Call only once
  webcontainerInstance = await WebContainer.boot();
  await webcontainerInstance.mount(files);

  // Wait for `server-ready` event
  webcontainerInstance.on('server-ready', (port, url) => {
    iframeEl.src = url;
  });

  const shellProcess = startShell(terminal);
  window.addEventListener('resize', () => {
    fitAddon.fit();
    shellProcess.resize({
      cols: terminal.cols,
      rows: terminal.rows,
    });
  });

  /*
  const exitCode = await installDependencies(terminal);
  if (exitCode !== 0) {
    throw new Error('Installation failed');
  }

  startDevServer(terminal);
  */
});

document.querySelector('#app').innerHTML = `
  <div class="container">
    <div class="editor">
      <textarea>I am a textarea</textarea>
    </div>
    <div class="preview">
      <iframe src="loading.html"></iframe>
    </div>
  </div>
  <div class="terminal"></div>
`;

/** @type {HTMLIFrameElement | null} */
const iframeEl = document.querySelector('iframe');

/** @type {HTMLTextAreaElement | null} */
const textareaEl = document.querySelector('textarea');

/** @type {HTMLTextAreaElement | null} */
const terminalEl = document.querySelector('.terminal');

/*
async function installDependencies(terminal) {
  // Install dependencies
  const installProcess = await webcontainerInstance.spawn('npm', ['install']);
  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );
  // Wait for install command to exit
  return installProcess.exit;
}

async function startDevServer(terminal) {
  // Run `npm run start` to start the Express app
  const serverProcess = await webcontainerInstance.spawn('npm', ['run', 'start']);
  serverProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  // Wait for `server-ready` event
  webcontainerInstance.on('server-ready', (port, url) => {
    iframeEl.src = url;
  });
}
*/ 

/** @param {string} content*/
async function writeIndexJS(content) {
  await webcontainerInstance.fs.writeFile('/index.js', content);
}

/**
 * @param {Terminal} terminal
 */
 async function startShell(terminal) {
  const shellProcess = await webcontainerInstance.spawn('jsh', {
    terminal: {
      cols: terminal.cols,
      rows: terminal.rows,
    },
  });
  shellProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  const input = shellProcess.input.getWriter();
  terminal.onData((data) => {
    input.write(data);
  });

  return shellProcess;
};

