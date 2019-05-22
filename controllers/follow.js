'use strict'

// var path = require ('path');
// var fs = require('fs');
var mongoosePaginate = require('mongoose-pagination');

var User = require ('../models/user');
var Follow = require('../models/follow');

function prueba (req, res){
    res.status(200).send({
        message: 'Hola desde el controlador follow'
    }); 
}

function saveFollow(req, res){
    var params = req.body;
    var follow = new Follow();

    follow.user = req.user.sub;
    follow.followed = params.followed;

    follow.save((err, followStored) => {
        if (err) return res.status(500).send({message: 'Error al guardar el seguimiento'});
        if(!followStored) return res.status(404).send({message:'Error en el seguimiento'});

        return res.status(200).send({follow: followStored});
    });
}

function deleteFollow(req,res){
    var userId = req.user.sub; //sub es id
    var followId = req.params.id;

    Follow.find({'user':userId, 'followed': followId}).remove((err => {
        if (err) return res.status(500).send({message: 'Error al guardar el seguimiento'});
    }));

    return res.status(200).send({message:'Has dejado de seguir al usuario'});
}

function getFollowingUsers(req,res){
    var userId = req.user.sub;

    if(req.params.id && req.params.page){
        userId = req.params.id;
    }

    var page = 1;

    if(req.params.page){
        page = req.params.page;
    }else{
        page = req.params.id;
    }

    var itemsPerPage = 4; //4 usuarios por página

    Follow.find({user:userId}).populate({path: 'followed'}).paginate(page, itemsPerPage, (err, follows, total) => {

        if (err) return res.status(500).send({message: 'Error en el servidor'});

        if(!follows) return res.status(404).send({message: ' No sigues a ningun usuario'});

        return res.status(200).send({
            total: total,
            pages: Math.ceil(total/itemsPerPage),
            follows
        })

    });
    
}

function getFollowedUsers(req,res){
    var userId = req.user.sub //id usuario identificado

    if(req.params.id && req.params.page){
        userId = req.params.id;
    }

    var page = 1;

    if(req.params.page){
        page = req.params.page;
    }else{
        page = req.params.id;
    }

    var itemsPerPage = 4; //4 usuarios por página

    Follow.find({followed:userId}).populate({path: 'user followed'}).paginate(page, itemsPerPage, (err, follows, total) => {

        if (err) return res.status(500).send({message: 'Error en el servidor'});

        if(!follows) return res.status(404).send({message: ' No te sigue ningun usuario'});

        return res.status(200).send({
            total: total,
            pages: Math.ceil(total/itemsPerPage),
            follows
        })

    });
}
//Sin paginar
function getMyFollows(req,res){
    var userId = req.user.sub;

    var find = Follow.find({user: userId});

    if(req.params.followed){
        find = Follow.find({followed: userId});
    }

    find.populate('user followed').exec((err, follows) =>{
        if (err) return res.status(500).send({message: 'Error en el servidor'});

        if(!follows) return res.status(404).send({message: ' No sigues a ningun usuario'});

        return res.status(200).send({follows});
    })

}

module.exports = {

    prueba,
    saveFollow,
    deleteFollow,
    getFollowingUsers,
    getFollowedUsers,
    getMyFollows
}

