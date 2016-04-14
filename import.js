var fs              = require('fs')
// var elasticsearch   = require('elasticsearch')
var op              = require('object-path')

// var dom             = require('xmldom').DOMParser
var util            = require('util')
var XmlStream       = require('xml-stream')

// var client = new elasticsearch.Client({
//   host: 'localhost:9200'
// })

var head = {
    index: "concepts",
    type: "concept"
}



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
                var newIndex = op.get(targetNode, mapping.targetPath, []).length
                if (mapping.mappings && mapping.mappings.length > 0) {
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

var mapRecCounter = 0

function mapRec(mapped, selector, source, db) {
    mapRecCounter ++
    console.log('\nmapRec:', mapRecCounter, Object.keys(mapped), selector, Object.keys(source))

    selector.mappings.forEach(function(mapping) {
        console.log('Mapping:', JSON.stringify(mapping, null, 4))
        var key = undefined
        var value = undefined
        var mapAsArray = false
        if (mapping.key) {
            if (typeof(mapping.key) === 'string') {
                mapAsArray = true
                key = mapping.key
            }
            else {
                key = op.get(source, mapping.key)
            }
        }
        if (mapping.value) {
            if (typeof(mapping.value) === 'string') {
                value = mapping.value
            }
            else {
                value = op.get(source, mapping.value)
            }
        }
        else if (mapping.mappings) {
            value = {}
            console.log('Mappings for ' + key + ':', mapping.mappings)
            mapRec(value, mapping, source, db)
        }

        console.log('Set:', mapRecCounter, {key, value})
        if (key && value) {
            if (mapAsArray) {
                op.push(mapped, key, value)
            }
            else {
                op.set(mapped, key, value)
            }
        }
        else if (!value) {
            console.log('Can\'t set value.')
        }
    })
    console.log('==== '+JSON.stringify(source), Object.keys(source), Object.keys(db.collect))
    Object.keys(source).forEach(function(sourceKey) {
        if (Object.keys(db.collect).indexOf(sourceKey) > -1) {
            console.log('Matched:', sourceKey)
            source[sourceKey].forEach(function(a) {
                console.log('\nTo mapRec:', Object.keys(mapped), sourceKey, Object.keys(a))
                mapRec(mapped, db.collect[sourceKey], a, db)
            })
        }
    })
}

function index_db(db, callback) {

    console.log('Start import: ' + db.name)

    var sourceStream = fs.createReadStream(db.file)
    var xml = new XmlStream(sourceStream, db.encoding)

    ;(function(db, xml) {
        var elementCount = 0

        Object.keys(db.collect).forEach(function(a) { xml.collect(a) })

        xml.on('endElement: ' + db.elementSelector, function(source) {
            elementCount ++
            if (op.get(source, db.idSelector, false) === false) {
                return callback({
                    err: 'Element lacks ID',
                    database: db.name,
                    elementCounter: elementCount
                }, { element: source, db: db })
            }
            // console.log(db.name, JSON.stringify(Object.keys(source), null, 4))

            var mapped = {}
            var selector = op.get(db, ['collect', db.elementSelector])
            mapRec(mapped, selector, source, db)
            var create = {
                index: head.index,
                type: head.type,
                id: db.name + '_' + op.get(source, db.idSelector, '#' + elementCount),
                body: mapped
            }
            console.log('--> Create:', JSON.stringify(create, null, 4))
            // client.create(create, function(error, response) {
            //     if (error) { return console.log(error) }
            //     console.log('created', create, response)
            // })
            process.exit(0)
        })

        xml.on('end', function() {
            return { msg: 'Finished ' + db.name }
        })
    })(db, xml)
}

var databases = require('./databases.json')

databases.forEach( function(db) {
    index_db(db, function(err, result) {
        if (err) { console.log('ERROR', err) }
        console.log(result)
    })
})
