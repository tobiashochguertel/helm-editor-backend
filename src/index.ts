import express, { Express } from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { glob } from 'glob'
import fs from 'fs';
import path from 'path';
import util from 'util';

dotenv.config();

const app: Express = express()
app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

type Content = {
  filename: string
  content?: string
  type: string
}

app.get('/api/list', async (req, res) => {
  // glob('/public/**/*', { ignore: 'node_modules/**' });
  const helmChartFiles = await glob('**/*', {
    ignore: 'node_modules/**',
    absolute: false,
    cwd: 'public',
    dot: true,
  })
  res.json(helmChartFiles);
});

app.get('/api/chart', async (req, res) => {
  const helmChartFiles = await glob('**/*', {
    ignore: 'node_modules/**',
    absolute: false,
    cwd: 'public',
    dot: true,
  })

  const chartContent: Map<string, Content> = new Map<string, Content>();

  helmChartFiles.forEach((file) => {
    const fileCnt: Content = {
      filename: file,
      type: "directory"
    } as Content;
    const absolutePath = __dirname + '/../' + 'public/' + file;
    if (!fs.lstatSync(absolutePath).isDirectory()) {
      fileCnt.content = fs.readFileSync(absolutePath, 'utf8');
      fileCnt.type = 'file';
    }
    chartContent.set(file, fileCnt);
  });

  res.json(Object.fromEntries(chartContent));
});

app.get('/api/file/:path', async (req, res) => {
  // res.sendFile('public/' + req.params.path, { root: __dirname + '/../' });
  const absolutePath = __dirname + '/../' + 'public/' + req.params.path;
  if (!fs.lstatSync(absolutePath).isDirectory()) {
    res.json({
      fielname: req.params.path,
      content: fs.readFileSync(absolutePath, 'utf8')
    });
  } else {
    res.json({
      fielname: req.params.path,
      content: ""
    });
  }
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
app.get('/api/tree', async (req, res) => {
  function dirTree(filename: string): DirTree {
    const stats = fs.lstatSync(filename),
      info: DirTree = {
        // path: filename,
        name: path.basename(filename),
        type: ''
      };

    if (stats.isDirectory()) {
      info.type = "directory";
      info.files = fs.readdirSync(filename).map(function (child) {
        return dirTree(filename + '/' + child);
      });
    } else {
      // Assuming it's a file. In real life it could be a symlink or
      // something else!
      info.type = "file";
    }

    return info;
  }

  const absolutePath = __dirname + '/../' + 'public';
  const result = dirTree(absolutePath);
  util.inspect(result, false, null)
  if (result.hasOwnProperty('files')) {
    res.json(result.files);
  } else {
    res.json(result);
  }
});

app.put('/api/file/:path', async (req, res) => {
  let data = req.body;
  // console.log(data)

  if (data instanceof Object) {
    data = ""
  }

  const absolutePath = __dirname + '/../' + 'public/' + req.params.path;
  // console.log("absolutePath", absolutePath)

  try {
    fs.writeFileSync(absolutePath, data);
    // file written successfully
    res.send('Data Received and file updated: ' + JSON.stringify(data));
  } catch (err) {
    console.error(err);
    res.send('Write to file was not successful: ' + JSON.stringify(err));
  }
});

const port = process.env.PORT || 5342;
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});