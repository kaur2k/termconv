var fs              = require('fs')
var op              = require('object-path')
var XmlStream       = require('xml-stream')
var elasticsearch   = require('elasticsearch')
// var expat = require('node-expat')

var client = new elasticsearch.Client({
  host: 'localhost:9200'
})

var head = {
    index: "concepts",
    type: "concept"
}

function index_db(db, callback) {

    function exists(object, path) {
        // console.log('path:', path, 'in', Object.keys(object))
        return op.get(object, path, false) !== false
    }

    function mapTransac(transacIn) {
        if (exists(transacIn, ['transac','$','type']) && exists(transacIn, ['transac','$text']) && exists(transacIn, ['date'])) {
            var transacOut = [
                {
                    key: op.get(transacIn, ['transac','$','type']) + 'By',
                    value: op.get(transacIn, ['transac','$text'])
                },
                {
                    key: op.get(transacIn, ['transac','$','type']) + 'At',
                    value: op.get(transacIn, ['date'])
                }
            ]
        }
        return transacOut
    }

    function mapXref(xrefIn) {
        return xrefIn.map(function(a) {
            return {
                xrefText: op.get(a, ['$text']),
                xrefLink: op.get(a, ['$','Tlink'])
            }
        })
    }

    function mapDescrip(descripIn) {
        var descripOut = {}
        if (!exists(descripIn, ['descrip','$','type'])) {
            console.log('Description without type', JSON.stringify(descripIn, null, 4))
            return
        }
        descripOut.key = op.get(descripIn, ['descrip','$','type'])
        if (exists(descripIn, ['descrip','xref'])) {
            op.set(descripOut, ['value', 'descripLink'], mapXref(op.get(descripIn, ['descrip','xref'])))
        }
        if (exists(descripIn, ['descrip','$text'])) {
            op.set(descripOut, ['value', 'descripText'], op.get(descripIn, ['descrip','$text']))
        }

        return descripOut
    }

    function mapTerm(termIn) {
        // console.log('====', JSON.stringify(termIn, null, 4))
        var termOut = {}
        if (exists(termIn, ['term'])) {
            op.set(termOut, ['term'], op.get(termIn, ['term']))
        }
        op.get(termIn, ['transacGrp'], []).forEach(function(transac) {
            mapTransac(transac).forEach(function(transac) {
                op.set(termOut, transac.key, transac.value)
            })
        })
        op.get(termIn, ['descripGrp'], []).forEach(function(descrip) {
            // console.log("====1", JSON.stringify(descrip, null, 4))
            var mappedDescrip = mapDescrip(descrip)
            op.set(termOut, mappedDescrip.key, mappedDescrip.value)
            // console.log('====3', JSON.stringify(termOut, null, 4))
        })

        return termOut
    }

    function mapLanguage(languageIn) {
        var languageOut = {}
        if (exists(languageIn, ['language','$','type'])) {
            op.set(languageOut, ['languageType'], op.get(languageIn, ['language','$','type']))
        }
        if (exists(languageIn, ['language','$','lang'])) {
            op.set(languageOut, ['languageCode'], op.get(languageIn, ['language','$','lang']))
        }
        op.get(languageIn, ['termGrp'], []).forEach(function(term) {
            var mappedTerm = mapTerm(term)
            op.push(languageOut, ['terms'], mappedTerm)
        })
        return languageOut
    }

    var sourceStream = fs.createReadStream(db.file)
    // var p = expat.createParser()
    // sourceStream.pipe(p)
    var xml = new XmlStream(sourceStream, db.encoding)
    db.collect.forEach(function(a) { xml.collect(a) })

    console.log('Start import: ' + db.name)

    var elementCount = 0
    xml.on('endElement: ' + db.elementSelector, function(source) {
        elementCount ++
        if (elementCount%100 === 0) {
            console.log(new Date(), db.name, elementCount/100%10)
        }
        if (elementCount%1000 === 0) {
            console.log(new Date(), db.name, elementCount, Math.round(process.memoryUsage().heapUsed/1024/1024, 2) + 'MB')
            // xml.pause()
            // setTimeout(function () { xml.resume() }, 100)
        }
        var create = {
            index: head.index,
            type: head.type,
            body: {}
        }
        op.set(create, ['body','database'], db.name)
        if (exists(source, [db.idSelector])) {
            op.set(create, ['id'], db.name + '_' + op.get(source, [db.idSelector]))
            op.set(create, ['body','id'], op.get(source, [db.idSelector]))
        }
        else { return callback('Missing ID', source) }
        if (exists(source, ['system','$','type']) && exists(source, ['system','$text'])) {
            op.set(create.body, op.get(source, ['system','$','type']), op.get(source, ['system','$text']))
        }
        op.get(source, ['transacGrp'], []).forEach(function(transac) {
            mapTransac(transac).forEach(function(transac) {
                op.set(create.body, transac.key, transac.value)
            })
        })
        op.get(source, ['languageGrp'], []).forEach(function(language) {
            var mappedLanguage = mapLanguage(language)
            op.push(create.body, 'language', mappedLanguage)
        })

        // console.log('--> Create:', JSON.stringify(create, null, 4))
        xml.pause()
        client.create(create, function(error, response) {
            xml.resume()
            if (error) {
                if (error.status === 409) {
                    return callback('Warning: Skipping duplicate ID in ' + db.name, JSON.parse(error.body).id)
                }
                return callback(error)
            }
        })
    })

    xml.on('end', function() {
        return { msg: 'Finished ' + db.name }
    })
}

var databases = require('./databases.json')

databases.forEach( function(db) {
    index_db(db, function(err, result) {
        if (err) { return console.log(err, result) }
        console.log(result)
    })
})
