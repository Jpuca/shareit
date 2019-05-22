'use strict'

var mongoose = require('mongoose');
var app = require('./app');
var port = 3800;

//Conexión BD
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/shareit', { useNewUrlParser: true })
    .then(() => {
        console.log("Conexión a BBDD Shareit es correcta");

        //Crear Servidor
        app.listen(port, () => {
            console.log("Servidor conectado al puerto " + port)
        })

    })
    .catch(err => console.log(err));