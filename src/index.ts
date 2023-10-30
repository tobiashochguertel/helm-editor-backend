import express, { Express } from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { glob } from 'glob'
import fs from 'fs';
import path from 'path';
import util from 'util';

dotenv.config();
const port = process.env.PORT || 5342;
const hostname = process.env.HOSTNAME || "localhost";

const ignore_files = ['node_modules/**', '.git/**', '.trunk/**', '.vscode/**', '.idea/**']

const app: Express = express()
app.use(bodyParser.text({ limit: '200mb' }));
app.use(bodyParser.json({ limit: '200mb' }));
app.use(bodyParser.urlencoded({ extended: false, limit: '200mb' }));
app.use('/api/charts', express.static('public/charts'))

type Content = {
  filename: string
  content?: string
  type: string
}

async function readHelmChartFiles() {
  const helmChartFiles = await glob('**/*', {
    ignore: ignore_files,
    absolute: false,
    cwd: 'public',
    dot: true,
  });
  return helmChartFiles;
}

/* app.get('/api/list', async (req, res) => {
  res.json(readHelmChartFiles());
}); */

// Exchange the content of the template files
app.get('/api/chart', async (req, res) => {
  const chartContent: Map<string, Content> = new Map<string, Content>();

  (await readHelmChartFiles()).forEach(async (file) => {
    const fileCnt: Content = {
      filename: file,
      type: "directory"
    } as Content;
    const absolutePath = __dirname + '/../' + 'public/' + file;
    if (!fs.lstatSync(absolutePath).isDirectory()) {
      if (file.startsWith("charts/")) {
        fileCnt.content = `http://${hostname}:${port}/api/${file}`
        fileCnt.type = 'charts';
      }
      if (!file.startsWith("charts/")) {
        fileCnt.content = fs.readFileSync(absolutePath, 'utf8');
        fileCnt.type = 'file';
      }
      /*       fileCnt.content = fs.readFileSync(absolutePath, 'utf8');
            fileCnt.type = 'file'; */
    }
    chartContent.set(file, fileCnt);
  });

  res.json(Object.fromEntries(chartContent));
});

type DirTree = {
  path?: string,
  name: string,
  type: string,
  files?: DirTree[]
}

/**
const filesTree = [
  {
  type: 'directory',
  name: 'bin',
  files: [{
    type: 'file',
    name: 'cs.js',
  }],
}, {
  type: 'directory',
  name: 'docs',
  files: [{
    type: 'file',
    name: 'controllers.md',
  }, {
    type: 'file',
    name: 'es6.md',
  }, {
    type: 'file',
    name: 'production.md',
  }, {
    type: 'file',
    name: 'views.md',
  }],
}]
*/
function dirTree(filename: string): DirTree {
  const stats = fs.lstatSync(filename),
    info: DirTree = {
      // path: filename,
      name: path.basename(filename),
      type: ''
    };
  const lastElementOfFilename = filename.substring(filename.lastIndexOf('/') + 1)
  if (stats.isDirectory()) {
    info.type = "directory";
    if (lastElementOfFilename !== '.git' && lastElementOfFilename !== ".trunk") {
      info.files = fs.readdirSync(filename).map(function (child) {
        return dirTree(filename + '/' + child);
      });
    }
  }
  if (stats.isFile()) {
    // Assuming it's a file. In real life it could be a symlink or
    // something else!
    info.type = "file";
  }

  return info;
}

// Exchange the Directory and File Structure (Explorer on the left side)
app.get('/api/tree', async (req, res) => {
  const absolutePath = __dirname + '/../' + 'public';
  const result = dirTree(absolutePath);

  if (result.files != undefined)
    result.files = result.files.filter((file) => file.name !== '.git' && file.name !== '.trunk');

  util.inspect(result, false, null)
  if (result.hasOwnProperty('files')) {
    res.json(result.files);
  } else {
    res.json(result);
  }
});

// Get a single file with content
app.get('/api/file/:path', async (req, res) => {
  const absolutePath = __dirname + '/../' + 'public/' + req.params.path;
  if (!fs.lstatSync(absolutePath).isDirectory()) {
    res.json({
      filename: req.params.path,
      content: fs.readFileSync(absolutePath, 'utf8')
    });
  } else {
    res.json({
      filename: req.params.path,
      content: ""
    });
  }
});

// Write a single file with content
app.put('/api/file/:path', async (req, res) => {
  let data = req.body;

  if (data instanceof Object) {
    data = ""
  }

  const absolutePath = __dirname + '/../' + 'public/' + req.params.path;

  try {
    fs.writeFileSync(absolutePath, data);
    // file written successfully
    res.send('Data Received and file updated: ' + JSON.stringify(data));
  } catch (err) {
    console.error(err);
    res.send('Write to file was not successful: ' + JSON.stringify(err));
  }
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});