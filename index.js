const https = require('https');
const fs = require('fs');
const path = require('path');
const agent = new https.Agent({ keepAlive: true });
const requestOptions = { agent };

const parts = [
  {
    url:
      'https://archive.org/download/stackexchange/stackoverflow.com-PostHistory.7z',
    started: false,
    completed: false,
    progress: 0
  },
  {
    url:
      'https://archive.org/download/stackexchange/stackoverflow.com-Posts.7z',
    started: false,
    completed: false,
    progress: 0
  }
];

function getData(part, folder) {
  return new Promise((resolve, reject) => {
    if (part.started) {
      reject(`${part.url} already started, skipping...`);
    }
    part.started = true;
    const url = new URL(part.url);
    const file = url.pathname.substr(url.pathname.lastIndexOf('/'));
    const localPath = path.join(folder, file);
    if (fs.existsSync(localPath)) {
      console.log(`${file} already exists, skipping...`);
      part.progress = 100;
      part.started = true;
      part.completed = true;
      resolve(part);
    }
    console.log(`${file} starting...`);
    https.get(url, requestOptions, res => {
      if (res.statusCode === 200) {
        console.log(`${file} found, downloading...`);
        const possibleLength = +res.headers['content-length'];
        let completed = 0;
        let lastProgress = 0.0;
        const writeStream = fs.createWriteStream(localPath);
        res.on('data', chunk => {
          writeStream.write(chunk, error => reject(error));
          if (!isNaN(possibleLength) && possibleLength > 0 && chunk.length) {
            completed += chunk.length;
            part.progress = completed / possibleLength;
            if (part.progress > lastProgress) {
              setTimeout(
                () =>
                  console.log(
                    `${file} at ${part.progress.toFixed(2)}% complete`
                  ),
                0
              );
              lastProgress = part.progress + 0.1;
            }
          }
        });
        res.on('end', () => {
          part.completed = true;
          writeStream.end();
          console.log(`${file} complete`);
        });
      } else if (res.statusCode === 302) {
        part.url = res.headers.location;
        return getData(part, folder);
      } else {
        console.log(
          `${file} had error: ${res.statusCode} ${res.statusMessage}`
        );
        reject(res);
      }
    });
  });
}

async function getAllFiles(parts) {
  try {
    parts = await Promise.all(parts.map(p => getData(p, __dirname)));
    console.log(parts);
  } catch (e) {
    console.error('error during get of files', e);
  }
}

getAllFiles(parts);
