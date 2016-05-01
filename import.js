var fs              = require('fs')
var op              = require('object-path')
var elasticsearch   = require('elasticsearch')
var sax             = require('sax')

var client = new elasticsearch.Client({
    host: 'localhost:9200',
    // log: 'trace'
})

var head = {
    index: "test",
    type: "concept"
}

var terminateId = "militerm_6"
// var terminateId = false

function index_db(db, callback) {
    var elementCount = 0
    var createdCount = 0
    var sourceStreamPaused = false
    var elementStack = []
    var elementPath = ''
    var create = {}
    var keyForText = {}
    var tempNodes = {}


    var openParser = {}
    var attributeParser = {}
    var textParser = {}
    var closeParser = {}


    var parser = {}

    // descripGrp
    parser['descripGrp'] = {
        open: function(node) {},
        attribute: {
            delete: function(value) { callback(null, { warning:'Unmapped delete attribute:', elementStack:elementPath, create:create, value:value }) },
        },
        text: function(node) {},
        close: function(name) {
            var key = op.get(tempNodes, elementStack.concat('descripKey'))
            op.del(tempNodes, elementStack.concat('descripKey'))
            // if (terminateId && terminateId === op.get(create, ['id'])) {
            //     console.log({
            //         close:'descripGrp',
            //         key:key,
            //         path:elementStack.slice(0,-1).concat(key),
            //         value:op.get(tempNodes, elementStack)
            //     })
            // }
            op.set(tempNodes, elementStack.slice(0,-1).concat(key), op.get(tempNodes, elementStack))
        },
    }
    parser['descripGrp.descrip'] = {
        open: function(node) {},
        attribute: {
            type: function(value) {
                // if (terminateId && terminateId === op.get(create, ['id'])) {
                //     console.log({
                //         attr:'descrip.type',
                //         path:elementStack.slice(0,-1).concat('descripKey').join('.'),
                //         value:value
                //     })
                // }
                op.set(tempNodes, elementStack.slice(0,-1).concat('descripKey'), value)
            },
        },
        text: function(text) {
            // var key = op.get(tempNodes, elementStack.slice(0,-1).concat('descripKey'))
            // if (terminateId && terminateId === op.get(create, ['id'])) {
            //     console.log({
            //         text:'descrip',
            //         path:elementStack.slice(0,-1).concat('descripText').join('.'),
            //         value:text
            //     })
            // }
            op.push(tempNodes, elementStack.slice(0,-1).concat('descripText'), text)
        },
        close: function(name) {
            // if (terminateId && terminateId === op.get(create, ['id'])) {
            //     console.log({
            //         close:'descrip',
            //         value:name
            //     })
            // }
        },
    }
    parser['descripGrp.descrip.xref'] = {
        open: function(node) {},
        attribute: {
            Tlink: function(value) {
                // if (terminateId && terminateId === op.get(create, ['id'])) {
                //     console.log({
                //         attr:'xref.Tlink',
                //         path:elementStack.concat('xrefLink').join('.'),
                //         value:value
                //     })
                // }
                op.set(tempNodes, elementStack.concat('xrefLink'), value)
            },
        },
        text: function(text) {
            // if (terminateId && terminateId === op.get(create, ['id'])) {
            //     console.log({
            //         text:'xref',
            //         path:elementStack.concat('xrefText').join('.'),
            //         value:text
            //     })
            // }
            op.set(tempNodes, elementStack.concat('xrefText'), text)
        },
        close: function(name) {
            // if (terminateId && terminateId === op.get(create, ['id'])) {
            //     console.log({
            //         close:'xref',
            //         path:elementStack.slice(0,-2).concat('descripLink').join('.'),
            //         value:op.get(tempNodes, elementStack)
            //     })
            // }
            op.push(tempNodes, elementStack.slice(0,-2).concat('descripLink'), op.get(tempNodes, elementStack))
        },
    }

    parser['mtf.conceptGrp.descripGrp'] = parser['descripGrp']
    parser['mtf.conceptGrp.descripGrp.descrip'] = parser['descripGrp.descrip']
    parser['mtf.conceptGrp.descripGrp.descrip.xref'] = parser['descripGrp.descrip.xref']

    parser['mtf.conceptGrp.languageGrp.descripGrp'] = parser['descripGrp']
    parser['mtf.conceptGrp.languageGrp.descripGrp.descrip'] = parser['descripGrp.descrip']
    parser['mtf.conceptGrp.languageGrp.descripGrp.descrip.xref'] = parser['descripGrp.descrip.xref']

    parser['mtf.conceptGrp.languageGrp.termGrp.descripGrp'] = parser['descripGrp']
    parser['mtf.conceptGrp.languageGrp.termGrp.descripGrp.descrip'] = parser['descripGrp.descrip']
    parser['mtf.conceptGrp.languageGrp.termGrp.descripGrp.descrip.xref'] = parser['descripGrp.descrip.xref']

    // transacGrp
    parser['transacGrp'] = {
        open: function(node) {},
        close: function(name) {},
    }
    parser['transacGrp.date'] = {
        open: function(node) {},
        text: function(text) {
            var key = op.get(tempNodes, elementStack.slice(0,-2).concat('atKey'))
            op.set(tempNodes, elementStack.slice(0,-2).concat(key), text)
            op.del(tempNodes, elementStack.slice(0,-2).concat('atKey'))
        },
        close: function(name) {},
    }
    parser['transacGrp.transac'] = {
        open: function(node) {},
        attribute: {
            type: function(value) {
                op.set(tempNodes, elementStack.slice(0,-2).concat('atKey'), value + 'At')
                op.set(tempNodes, elementStack.slice(0,-2).concat('byKey'), value + 'By')
            },
        },
        text: function(text) {
            var key = op.get(tempNodes, elementStack.slice(0,-2).concat('byKey'))
            op.set(tempNodes, elementStack.slice(0,-2).concat(key), text)
            op.del(tempNodes, elementStack.slice(0,-2).concat('byKey'))
        },
        close: function(name) {},
    }

    parser['mtf.conceptGrp.languageGrp.termGrp.transacGrp'] = parser['transacGrp']
    parser['mtf.conceptGrp.languageGrp.termGrp.transacGrp.date'] = parser['transacGrp.date']
    parser['mtf.conceptGrp.languageGrp.termGrp.transacGrp.transac'] = parser['transacGrp.transac']

    parser['mtf.conceptGrp.transacGrp'] = parser['transacGrp']
    parser['mtf.conceptGrp.transacGrp.date'] = parser['transacGrp.date']
    parser['mtf.conceptGrp.transacGrp.transac'] = parser['transacGrp.transac']

    // mtf
    parser['mtf'] = {
        open: function(node) {},
        close: function(name) {},
    }
    // mtf.conceptGrp
    parser['mtf.conceptGrp'] = {
        open: function(node) {
            create.index = head.index
            create.type = head.type
            create.body = { database:db.name }
        },
        close: function(name) {
            if (terminateId && terminateId != create.id) { return }

            elementCount ++
            if (!sourceStreamPaused && elementCount > createdCount + 100) {
                console.log(new Date(), ' Pause loading from ' + db.name, elementCount, Math.round(process.memoryUsage().heapUsed/1024/1024, 2) + 'MB')
                sourceStreamPaused = true
                sourceStream.pause() // pause the stream, if enough nodes loaded
            }
            client.create(create, function(error, response) {
                if (error) {
                    if (error.status === 409) {
                        var create = {
                            index: head.index,
                            type: head.type,
                            body: JSON.parse(error.body)
                        }
                        // console.log(JSON.stringify(create, null, 4))
                        client.create(create, function(error, response) {
                            if (error) {return callback(error)}
                            console.log('watch, no id! #' + create.body.id, response)
                        })
                        // return callback(error, { warning:'Skipping duplicate ID#' + JSON.parse(error.body).id + ' in ' + db.name })
                    }
                    else {
                        return callback(error)
                    }
                }
                createdCount++
                if (sourceStreamPaused && elementCount < createdCount + 10) {
                    console.log(new Date(), 'Resume loading from ' + db.name, elementCount, Math.round(process.memoryUsage().heapUsed/1024/1024, 2) + 'MB')
                    sourceStreamPaused = false
                    sourceStream.resume() // resume, if queue close to empty
                }

                if (terminateId && terminateId === response._id) { process.exit(1) }
            })
            op.empty(create, ['body'])
        },
    }
    // mtf.conceptGrp.concept
    parser['mtf.conceptGrp.concept'] = {
        open: function(node) {},
        text: function(text) {
            op.set(create, ['id'], db.name + '_' + text)
            op.set(create.body, ['id'], text)
        },
        close: function(name) {},
    }
    // mtf.conceptGrp.languageGrp
    parser['mtf.conceptGrp.languageGrp'] = {
        open: function(node) {},
        close: function(name) {
            op.push(create.body, ['language'], op.get(tempNodes, elementStack))
        },
    }
    // mtf.conceptGrp.languageGrp.language
    parser['mtf.conceptGrp.languageGrp.language'] = {
        open: function(node) {},
        attribute: {
            type: function(value) {
                op.set(tempNodes, elementStack.slice(0,-1).concat('languageType'), value)
            },
            lang: function(value) {
                op.set(tempNodes, elementStack.slice(0,-1).concat('languageCode'), value)
            },
            update: function(value) { callback(null, { warning:'Unmapped update attribute:', elementStack:elementPath, create:create, value:value }) },
            delete: function(value) { callback(null, { warning:'Unmapped delete attribute:', elementStack:elementPath, create:create, value:value }) },
        },
        close: function(name) {},
    }
    // mtf.conceptGrp.languageGrp.termGrp
    parser['mtf.conceptGrp.languageGrp.termGrp'] = {
        open: function(node) {},
        attribute: {
            update: function(value) { callback(null, { warning:'Unmapped update attribute:', elementStack:elementPath, create:create, value:value }) },
            delete: function(value) { callback(null, { warning:'Unmapped delete attribute:', elementStack:elementPath, create:create, value:value }) },
        },
        close:function(name) {
            op.push(tempNodes, elementStack.slice(0,-1).concat('terms'), op.get(tempNodes, elementStack))
        },
    }
    // mtf.conceptGrp.languageGrp.termGrp.term
    parser['mtf.conceptGrp.languageGrp.termGrp.term'] = {
        open: function(node) {},
        text: function(text) {
            op.set(tempNodes, elementStack.slice(0,-1).concat('termName'), text)
        },
        close: function(name) {},
    }
    // mtf.conceptGrp.system
    parser['mtf.conceptGrp.system'] = {
        open: function(node) {},
        attribute: {
            type: function(value) {
                op.set(keyForText, ['system'], value)
            },
            delete: function(value) { callback(null, { warning:'Unmapped delete attribute:', elementStack:elementStack.join('.'), create:create, value:value }) },
        },
        text: function(text) {
            op.set(create.body, [keyForText['system']], text)
        },
        close: function(name) {},
    }


    console.log('Start import: ' + db.name)

    var sourceStream = fs.createReadStream(db.file, db.encoding)
    var saxStream = new sax.createStream(true, {trim:true, normalize:true})

    saxStream.on('opentag', function(node) {
        elementStack.push(node.name)
        elementPath = elementStack.join('.')
        try {
            parser[elementPath].open(node)
        } catch (e) {
            console.log(e)
            callback('Unmapped open:', { elementStack:elementPath, create:create, node:node })
        }
        if (terminateId && terminateId === op.get(create, ['id'])) {
            console.log('\n' + elementPath + ' open', { node:node })
        }

        var attributes = op.get(node, ['attributes'], {})
        Object.keys(attributes).forEach(function(key) {
            if (terminateId && terminateId === op.get(create, ['id'])) {
                console.log('\n' + elementPath + ' attributes', { attributes:attributes })
            }
            var value = op.get(db, ['translateKeys', attributes[key]], attributes[key])
            try {
                parser[elementPath].attribute[key](value)
            } catch (e) {
                console.log(e)
                callback('Unmapped attr:', { elementStack:elementPath, create:create, key:key })
            }
        })
    })
    saxStream.on('text', function(text) {
        if (terminateId && terminateId === op.get(create, ['id'])) {
            console.log('\n' + elementPath + ' text', { text:text })
        }
        try {
            parser[elementPath].text(text)
        } catch (e) {
            console.log(e)
            callback('Unmapped text:', { elementStack:elementPath, create:create, text:text })
        }
    })
    saxStream.on('closetag', function(name) {
        if (name !== elementStack.slice(-1)[0]) {
            return callback('ERROR: closing ' + name + ' conflicts with stack ', { elementStack: elementStack })
        }
        try {
            parser[elementPath].close(name)
        } catch (e) {
            console.log(e)
            callback('Unmapped close:', { elementStack:elementPath, create:create, name:name })
        }
        if (terminateId && terminateId === op.get(create, ['id'])) {
            console.log('\n' + elementPath + ' close', { closetag:name, node: op.get(tempNodes, elementStack) })
        }
        op.del(keyForText, [name])
        op.del(tempNodes, elementStack)
        elementStack.pop()
        elementPath = elementStack.join('.')
    })

    sourceStream.pipe(saxStream)
}

var databases = require('./databases.json')

client.indices.delete({
    index: head.index
}, function(err, response) {
    if (err) {
        console.log(head.index + ' not cleared', err, response)
    }
    console.log(head.index + ' cleared', response)
    databases.forEach( function(db) {
        index_db(db, function(err, result) {
            if (err) {
                console.log(JSON.stringify(err, null, 4), JSON.stringify(result, null, 4))
                process.exit(1)
            }
            // console.log(result)
        })
    })
})
