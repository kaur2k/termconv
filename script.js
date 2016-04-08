var fs     = require('fs')
var xml2js = require('xml2js')

var elasticsearch = require('elasticsearch')
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
})


var parser = new xml2js.Parser()

fs.readFile('mili_mt.xml', 'utf16le', function(err, data) {
    if (err) {
        return console.log(err)
    }
    // console.log(data)
    parser.parseString(data, function (err, result) {
        if (err) {
            return console.log(err)
        }
        var conceptGroupA = result.mtf.conceptGrp

        conceptGroupA = conceptGroupA.map(function(c) {
            return {
                index: {_index: 'concept', _type: 'concept', _id: c.concept[0] },
                conceptGroup: c
            }
        })

        client.bulk({ body: conceptGroupA })

        console.log('Done')
    })
})
