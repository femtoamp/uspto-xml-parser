/*
 * Datasets: https://developer.uspto.gov/product/patent-grant-full-text-dataxml
 */

const fs = require('fs');
const xml2js = require('xml2js');
const stream = require('stream');

const FILE = 'ipg221025.xml';

class XMLSplitParser extends stream.Transform {
  constructor(options) {
    super(options);
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    let i;
    while ((i = this.buffer.indexOf('\n<?xml')) >= 0) {
      this.push(this.buffer.substring(0, i));
      this.buffer = this.buffer.substring(i + 1);
    }
    callback();
  }

  _flush(callback) {
    if (this.buffer) {
      this.push(this.buffer);
      this.buffer = '';
    }
    callback();
  }
}

(async () => {
  const xmlSplitParser = new XMLSplitParser();
  const xml2jsParser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: true,
    normalize: true,
    tagNameProcessors: [
      (name) => name.replace(/-(\w)/g, (_, c) => c.toUpperCase()),
    ],
  });

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(FILE)
        .pipe(xmlSplitParser)
        .on('data', (doc) => {
          xml2jsParser.parseString(doc, (err, patent) => {
            if (err) {
              reject(err);
              return;
            }
            if (patent.usPatentGrant) {
              // Patent grant document
              const { usBibliographicDataGrant: { inventionTitle: { _: title } } } = patent.usPatentGrant;
              console.log(title);
            } else if (patent.sequenceCwu) {
              // DNA sequence document
              // console.log(JSON.stringify(patent, null, 2));
            } else {
              // Unknown document
              // console.log(JSON.stringify(patent, null, 2));
            }
          });
        })
        .on('end', () => {
          resolve();
        });
    });
  } catch (err) {
    console.log('Parsing failed with error:', err);
  }
})();
