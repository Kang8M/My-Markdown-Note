const restoreButton = document.getElementById('restore');
const openButton = document.getElementById('open');
const saveButton = document.getElementById('save');
const newButton = document.getElementById('new');
const markdownContent = document.getElementById('markdown-content');
const expandButton = document.getElementById('expand-mode');
const htmlPreview = document.getElementById('html-preview');
const editor = document.getElementById('editor');
let fileHandle;

function parseHtmlPreview(text) {
  const htmlContent = marked.parse(text);
  htmlPreview.innerHTML = DOMPurify.sanitize(htmlContent, {USE_PROFILES: {html: true}});
}

function expandFile() {
  editor.classList.toggle('distraction-free');
  if (expandButton.innerText === 'Full Mode') {
    expandButton.innerText = 'Minimize Mode';
  } else {
    expandButton.innerText = 'Full Mode';
  }
}

async function newFile() {
  markdownContent.value = '';
  htmlPreview.innerHTML = '';
  await removeFile();
}

async function openFile() {
  try {
    [fileHandle] = await window.showOpenFilePicker();
    await restoreFromFile(fileHandle);
  } catch (e) {
    // might be user canceled
  }
}

async function removeFile() {
  fileHandle = undefined;
  await idbKeyval.del('file');
}

async function restoreFromFile() {
  let file = await fileHandle.getFile();
  let text = await file.text();
  await idbKeyval.set('file', fileHandle);
  markdownContent.value = text;
  parseHtmlPreview(text);
  restoreButton.style.display = 'none';
}

async function saveFile() {
  var saveValue = markdownContent.value;
  if (!fileHandle) {
    try {
      fileHandle = await window.showSaveFilePicker();
      await idbKeyval.set('file', fileHandle);
    } catch (e) {
      console.log('Error:', e)
    }
  }
  if (!fileHandle || !await verifyPermissions(fileHandle)) {
    return;
  }
  let writableStream = await fileHandle.createWritable();
  await writableStream.write(saveValue);
  await writableStream.close();
  restoreButton.style.display = 'none';
  alert('Save successfully!')
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
  expandButton.addEventListener('click', expandFile);
  newButton.addEventListener('click', newFile);
}

markdownContent.addEventListener('input', function() {
  const htmlContent = marked.parse(markdownContent.value);
  htmlPreview.innerHTML = DOMPurify.sanitize(htmlContent, {USE_PROFILES: {html: true}});
});