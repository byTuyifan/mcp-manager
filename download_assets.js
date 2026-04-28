const https = require('https');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);

const fontsDir = path.join(publicDir, 'fonts');
if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir);

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' 
      } 
    }, (res) => {
      // handle redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        let loc = res.headers.location;
        if (loc.startsWith('/')) {
           const parsedUrl = new URL(url);
           loc = parsedUrl.origin + loc;
        }
        return download(loc, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
         reject(new Error(`Status: ${res.statusCode} for ${url}`));
         return;
      }
      
      const isText = dest.endsWith('.js') || dest.endsWith('.css');
      if (isText) {
        let content = '';
        res.on('data', d => content += d.toString());
        res.on('end', () => {
          fs.writeFileSync(dest, content);
          resolve(content);
        });
      } else {
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', reject);
  });
}

async function main() {
  console.log('Downloading Vue ESM Browser...');
  await download('https://unpkg.com/vue@3/dist/vue.esm-browser.js', path.join(publicDir, 'vue.esm-browser.js'));
  
  console.log('Downloading Fonts CSS...');
  const fontsUrl = 'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Sora:wght@300;400;600&family=Fira+Code:wght@400;500&display=swap';
  let css = await download(fontsUrl, path.join(publicDir, 'fonts.css'));
  
  const woffRegex = /url\((https:\/\/[^)]+)\)/g;
  let match;
  let counter = 0;
  
  // Need to process sequentially to not mess up replacement loops or concurrent file errors possibly if lazy.
  // Actually, string.replace won't mutate `match.index`, so let's collect all URLs first.
  const urls = [];
  while ((match = woffRegex.exec(css)) !== null) {
    if (!urls.includes(match[1])) {
      urls.push(match[1]);
    }
  }
  
  for (const fontUrl of urls) {
    const filename = `font-${counter++}.woff2`;
    console.log(`Downloading font: ${fontUrl} -> ${filename}`);
    await download(fontUrl, path.join(fontsDir, filename));
    // Globally replace
    css = css.split(fontUrl).join(`./fonts/${filename}`);
  }
  
  fs.writeFileSync(path.join(publicDir, 'fonts.css'), css);
  
  console.log('All external assets downloaded successfully!');
}

main().catch(console.error);
