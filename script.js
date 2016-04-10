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
        if (mapping.targetValue) {
            op.set(targetNode, mapping.targetPath.slice(0,-1).concat(mapping.targetValue.key), mapping.targetValue.value)
        }
        if (mapping.single === true) {
            op.set(targetNode, mapping.targetPath, selected[0].childNodes.item(0).nodeValue)
        }
        else {
            for (var j=0; j<selected.length; j++) {
                if (mapping.mappings && mapping.mappings.length > 0) {
                    var newIndex = op.get(targetNode, mapping.targetPath, []).length
                    op.set(targetNode, mapping.targetPath.concat(newIndex), {})
                    recurseMappings(mapping.mappings, selected[j], op.get(targetNode, mapping.targetPath.concat(newIndex)))
                }
                else {
                    op.set(targetNode, mapping.targetPath.concat(newIndex), selected[j].childNodes.item(0).nodeValue)
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
        var sourceNodes = doc.getElementsByTagName(db.elementSelector)
        var targetNodes = []

        for (var i=0; i<sourceNodes.length; i++) {
            var sourceNode = sourceNodes.item(i)
            var targetNode = {}
            targetNodes.push(targetNode)
            recurseMappings(db.mappings, sourceNode, targetNode)
        }
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
    index_db(db)
})
