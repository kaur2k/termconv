var fs              = require('fs')
var xpath           = require('xpath')
var dom             = require('xmldom').DOMParser
var elasticsearch   = require('elasticsearch')
var op              = require('object-path')

var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
})


function recurseMappings(mappings, sourceNode, targetNode) {
    mappings.forEach(function(mapping) {
        var selected = xpath.select(mapping.sourceXpath, sourceNode)
        if (!selected[0]) {
            return
        }
        if (mapping.single === true) {
            op.set(targetNode, mapping.targetPath, selected[0].childNodes.item(0).nodeValue)
        }
        else {
            for (var j=0; j<selected.length; j++) {
                if (mapping.mappings && mapping.mappings.length > 0) {
                    op.set(targetNode, mapping.targetPath.concat(j), {})
                    recurseMappings(mapping.mappings, selected[j], op.get(targetNode, mapping.targetPath.concat(j)))
                }
                else {
                    op.set(targetNode, mapping.targetPath.concat(j), selected[j].childNodes.item(0).nodeValue)
                }
            }
        }
    })
}

function index_db(db) {
    fs.readFile(db.file, db.encoding, function(err, xml) {
        if (err) {
            return console.log(err)
        }

        var doc = new dom().parseFromString(xml, 'text/xml')
        // var nodes = xpath.select(db.elementSelector, doc)
        var sourceNodes = doc.getElementsByTagName(db.elementSelector)
        var targetNodes = []

        for (var i=0; i<sourceNodes.length; i++) {
            var sourceNode = sourceNodes.item(i)
            var targetNode = {}
            targetNodes.push(targetNode)
            recurseMappings(db.mappings, sourceNode, targetNode)
        }
        // console.log(JSON.stringify(targetNodes, null, 4))

        var bulk = []
        targetNodes.forEach(function(c) {
            bulk.push({ index: {
                _index: 'concepts',
                _type: 'concept',
                _id: db.name + '_' + c.id
            } })
            bulk.push(c)
        })

        client.bulk({ body: bulk })

        console.log('Done')
    })
}

var databases = require('./databases.json')

databases.forEach( function(db) {
    // console.log('indexing', db)
    index_db(db)
})
