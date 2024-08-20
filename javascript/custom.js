const restoreButton = document.getElementById('restore');
const openButton = document.getElementById('open');
const saveButton = document.getElementById('save');
const editor = document.getElementById('markdown-content');
const expand = document.getElementById('expand-mode');
let fileHandle;

async function openFile() {
  try {
    [fileHandle] = await window.showOpenFilePicker();
    await restoreFromFile(fileHandle);
  } catch (e) {
    // might be user canceled
  }
}

async function restoreFromFile() {
  let file = await fileHandle.getFile();
  let text = await file.text();
  await idbKeyval.set('file', fileHandle);
  editor.value = text;
  parseHtmlPreview(text);
  restoreButton.style.display = 'none';
}

async function saveFile() {
  var saveValue = editor.value;
  if (!fileHandle) {
    try {
      fileHandle = await window.showSaveFilePicker();
      await idbKeyval.set('file', fileHandle);
    } catch (e) {
      // might be user canceled
    }
  }
  if (!fileHandle || !await verifyPermissions(fileHandle)) {
    return;
  }
  let writableStream = await fileHandle.createWritable();
  await writableStream.write(saveValue);
  await writableStream.close();
  restoreButton.style.display = 'none';
}

async function verifyPermissions(handle) {
  if (await handle.queryPermission({ mode: 'readwrite' }) === 'granted') {
    return true;
  }
  if (await handle.requestPermission({ mode: 'readwrite' }) === 'granted') {
    return true;
  }
  return false;
}

async function init() {
  var previousFileHandle = await idbKeyval.get('file');
  if (previousFileHandle) {
    restoreButton.style.display = 'inline-block';
    restoreButton.addEventListener('click', async function (e) {
      if (await verifyPermissions(previousFileHandle)) {
        fileHandle = previousFileHandle;
        await restoreFromFile();
      }
    });
  }
  document.body.addEventListener('dragover', function (e) {
    e.preventDefault();
  });
  document.body.addEventListener('drop', async function (e) {
    e.preventDefault();
    for (const item of e.dataTransfer.items) {
      console.log(item);
      if (item.kind === 'file') {
        let entry = await item.getAsFileSystemHandle();
        if (entry.kind === 'file') {
          fileHandle = entry;
          restoreFromFile();
        } else if (entry.kind === 'directory') {
          // handle directory
        }
      }
    }
  });
  openButton.addEventListener('click', openFile);
  saveButton.addEventListener('click', saveFile);
}

function parseHtmlPreview(text) {
  const htmlPreview = document.getElementById('html-preview');
  const htmlContent = marked.parse(text);
  htmlPreview.innerHTML = DOMPurify.sanitize(htmlContent, {USE_PROFILES: {html: true}});
}

editor.addEventListener('input', function() {
  const markdownContent = document.getElementById('markdown-content');
  const htmlPreview = document.getElementById('html-preview');
  const htmlContent = marked.parse(markdownContent.value);
  htmlPreview.innerHTML = DOMPurify.sanitize(htmlContent, {USE_PROFILES: {html: true}});
});

expand.addEventListener('click', function () {
  document.getElementById('editor').classList.toggle('distraction-free');
  const expandMode = document.getElementById('expand-mode');
  if (expandMode.innerText === 'Full Mode') {
    expandMode.innerText = 'Minimize Mode';
  } else {
    expandMode.innerText = 'Full Mode';
  }
});