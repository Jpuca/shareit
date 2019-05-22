'use strict'

var jwt = require ('jwt-simple');
var moment = require ('moment');
var secret = 'password_unico';

exports.ensureAuth = function(req, res, next){
    if(!req.headers.authorization){
        return res.status(403).send({message: 'Petición no tiene la cabecera de autentificación'});
    }

    var token = req.headers.authorization.replace(/['"]+/g,'');


    try{
        var payload = jwt.decode(token, secret);

        if(payload.exp <= moment.unix()){
            return res.status(401).send({
                message: 'Token Expirado'
            })
        }
        
    }catch(ex){
        return res.status(404).send({
            message: 'Token no válido'
        })

    }

    req.user = payload;

    next();
}