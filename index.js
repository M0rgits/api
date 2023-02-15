const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const formidable = require('formidable');
const path = require('path');
const seven = require('node-7z');
const { spawn } = require('child_process');
const string = require('string-sanitizer');

const app = express();
const router = express.Router();
var urlencodedparser = bodyParser.urlencoded({extended: false})


const h5g = require('./json/h5g.json');
const emu = require('./json/emu.json'); 
const sites = require('./json/sites.json'); 

app.use(router);
app.use(express.static(path.normalize(__dirname + '/html/')));

router.get('/', function(req, res){
  res.send('why are you here?')
  res.end();
})

for(let item of h5g){
  if(item.hasOwnProperty('path')){
    router.get(`/${item.path}`, function(req, res){
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "X-Requested-With");
      res.download(`${item.path.slice(0, -1)}.zip`, {root:'./h5g/'})
    })
  }
  router.get(`/img/h5g/${item.img.slice(0, -4)}`, function(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.download(`${item.img}`, {root: './img/h5g'});
  })
};

for(let item of emu){
  if(item.hasOwnProperty('rom')){
    router.get(`/${item.rom}`, function(req, res){
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "X-Requested-With");
      res.sendFile(item.rom, {root:'./emu/'});
    })
  }
  router.get(`/img/emu/${item.img.slice(0, -4)}`, function(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.download(`${item.img}`, {root: './img/emu/'});
  })
}

for(let item of sites){
  router.get('/img/sites/' + item.img.slice(0, -4), function(req, res){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.download(item.img, {root:'./img/sites/'});
  })
}

router.post('/h5gjson', function(req, res){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.send(h5g);
})

router.post('/emujson', function(req, res){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.send(emu);
})

router.post('/sitesjson', function(req, res){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.send(sites);
})

router.post('/gmesel', urlencodedparser, async function(req, res){
  let JSONlist = await fs.readFileSync(`./json/${req.body.type}.json`, 'utf-8');
  let list = JSON.parse(JSONlist);
  let index = list.findIndex(e => e.name === req.body.name)
  if(list[index].hasOwnProperty('pop')){
    list[index].pop = (list[index].pop + 1)
  }
  else{
    list[index].pop = 1
  }
  let data = JSON.stringify(list);
  fs.writeFileSync(`./json/${req.body.type}.json`, data)
  console.log('Updated pop')
});

router.post('/gmerequest', urlencodedparser, function(req, res){
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  var type = req.body.type;
  var name = req.body.name;
  console.log('requested ' + type + ' game [' + name + ']')
  if (name === ""){
    console.log('err: empty name');
    return;
  }
  else{
  fs.appendFileSync(`./forms/${type}.txt`, `${name}\n`)
  }
});

router.post('/upload', urlencodedparser, function(req, res){
  req.setTimeout(9999999999);
  var form = new formidable.IncomingForm({uploadDir: './tmp/', maxFileSize: 2048 * 1024 * 1024});
  form.parse(req, function (err, fields, files) {
    if(err) throw err;
    if(files.romupload){
      const basename = string.sanitize(JSON.stringify(files.romupload.originalFilename).slice(0, -3));
      var dirtybasename = JSON.stringify(files.romupload.originalFilename).slice(1, -4);
      var oldzippath = files.romupload.filepath;
      var newzippath = './tmp/' + basename + '.7z';
      var basepath = newzippath.slice(0, -3);
      
      fs.rename(oldzippath, newzippath, function(errro){
        if(errro) throw errro;
        unzip(dirtybasename, newzippath);
      })
    }
    var oldpath = files.upload.filepath;
    var newpath = `./img/${fields.type}/` + files.upload.originalFilename;
    var imgname = files.upload.originalFilename;
    fs.rename(oldpath, newpath, function (err) {
      if (err) throw err;
    });
    if(fields.type === 'h5g'){
      let jsonpath = './json/h5g.json';
      let json = JSON.parse(fs.readFileSync(jsonpath));
      let name = fields.name
      if(fields.path != ''){
        let path = fields.path
        json.push({name: name, path: path, img: imgname, pop:0});
        let data = JSON.stringify(json);
        fs.writeFileSync(jsonpath, data);
        res.send(name + " added to h5g.json")
        res.end()
      }
      if(fields.iframe != ''){
        let iframe = fields.iframe
        json.push({name: name, iframe: iframe, img: imgname, pop:0});
        let data = JSON.stringify(json);
        fs.writeFileSync(jsonpath, data);
        res.send(name + " added to h5g.json")
      }
      if(fields.custom != ''){
        if(fields.prox != ''){
          let custom = fields.custom;
          let prox = fields.prox;
          json.push({name: name, custom: custom, prox: prox ,img: imgname, pop:0});
          let data = JSON.stringify(json);
          fs.writeFileSync(jsonpath, data);
          res.send(name + " added to h5g.json")
          res.end()
        }
        else{
          let custom = fields.path
          json.push({name: name, custom: custom, img: imgname, pop:0});
          let data = JSON.stringify(json);
          fs.writeFileSync(jsonpath, data);
          console.log(name + " added to h5g.json")
          res.end()
        }
      }
    }
    if(fields.type === 'emu'){
      let jsonpath = './json/emu.json';
      let json = JSON.parse(fs.readFileSync(jsonpath));
      let name = fields.name;
      let core = fields.core;
      let rom = files.romupload.originalFilename;
      json.push({name: name, core: core, rom: rom, img: imgname, pop:0});
      let data = JSON.stringify(json);
      fs.writeFileSync(jsonpath, data);
      res.send(name + " added to emu.json")
      res.end();
      }
    })
  });

router.get('/dev', function(req, res){
  res.sendFile('dev.html', {root: './html/'});
})
router.get('/h5greq', function(req, res){
  res.sendFile('h5g.txt', {root:'./forms/'})
})
router.get('/emureq', function(req, res){
  res.sendFile('emu.txt', {root:'./forms/'})
})
router.get('/otherreq', function(req, res){
  res.sendFile('other.txt', {root:'./forms/'})
})

async function unzip(dirtybasename, zippath){
  const cleanbasename = string.sanitize(dirtybasename);
  const unzip = seven.extractFull(zippath, './tmp/', {$progress: true});
  var cue;
  unzip.on('progress', (progress) => {
    console.log(progress.percent);
  })
  unzip.on(`data`, (data) => {
    if(JSON.stringify(data.file).includes('.cue')){
      let oldpath = './tmp/' + dirtybasename + '/' + dirtybasename + '.cue'
      let cue = './tmp/' + dirtybasename + '/' + cleanbasename + '.cue'
      fs.rename(oldpath, cue, function(err){
        if(err) throw err;
      })
      return;
    }
  })
  unzip.on('end', function () {
    console.log('unzipped file');
    let rmzip = spawn('rm', [zippath])
    rmzip.stdout.on('data', (data) => {
      console.log(data);
    })
    rmzip.on('end', function (){
      let output = './emu/' + cleanbasename + '.chd'
      chdman(cue, output, dirtybasename);
    })
  })
  unzip.on('error', (err) => {
    let rmzip = spawn('rm', [zippath])
    rmzip.stdout.on('data', (data) => {
      console.log(data);
    })
    throw err;
  })
}

async function chdman(cue, output, basename){
  console.log('test')
  let chdman = spawn('chdman', ['createcd', '-i ', cue, ' -o ', output]);
  chdman.stdout.on('data', (data) => {
    console.log(data);
  })
  chdman.on('error', (err) => {
    console.warn(err);
  })
  chdman.on('end', function(){
    console.log('Made CHD');
  })
}


app.listen(8080);