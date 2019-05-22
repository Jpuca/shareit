'use strict'
var bcrypt = require('bcrypt-nodejs');
var User = require('../models/user');
var Follow = require('../models/follow');
var jwt = require('../services/jwt');
var mongoosePaginate = require('mongoose-pagination');
var fs = require('fs');
var path = require('path');

function home(req, res) {
    res.status(200).send({
        message: "Página Inicial"
    });
}

function pruebas(req, res) {
    // console.log(req.body);
    res.status(200).send({
        message: "Acción prueba en el server"
    });
}
//REGISTRO USUARIO
function saveUser(req, res) {
    var params = req.body;
    var user = new User();

    if (params.name && params.surname && params.nick && params.email && params.password) {

        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.password = params.password;
        user.role = 'ROLE_USER';
        user.image = null;


        //Check Usuarios Duplicados
        User.find({
            $or: [
                { email: user.email.toLowerCase() },
                { nick: user.nick.toLowerCase() }
            ]
        }).exec((err, users) => {
            if (err) return res.status(500).send({ message: 'Error al guardar el usuario' })

            if (users && users.length >= 1) {
                return res.status(200).send({ message: 'Usuario en uso' })
            } else {

                bcrypt.hash(params.password, null, null, (err, hash) => {
                    user.password = hash;

                    user.save((err, userStored) => {
                        if (err) return res.status(500).send({ message: 'Error al guardar el usuario' })

                        if (userStored) {
                            res.status(200).send({ user: userStored });
                        } else {
                            res.status(404).send({ message: 'No se ha registrado el usuario' });
                        }
                    });
                });
            }
        });


    } else {
        res.status(200).send({
            message: 'Rellena todos los campos necesarios'
        });
    }
}
//LOGIN USUARIO
function loginUser(req, res) {
    var params = req.body;
    var email = params.email;
    var password = params.password;
    // console.log (password)

    User.findOne({ email: email }, (err, user) => {

        // console.log(user);
        if (err) return res.status(500).send({ message: 'Error en la petición' });
        if (user) {
            bcrypt.compare(password, user.password, (err, check) => {
                if (check) {
                    // console.log(params.gettoken)
                    if (params.gettoken) {
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        })
                    } else {
                        //Datos usuario sin encriptar
                        user.password = undefined;
                        return res.status(200).send({ user })
                    }
                } else {
                    return res.status(404).send({ message: 'El usuario no se ha podido identificar' })
                }
            });
        } else {
            return res.status(404).send({ message: 'El usuario no se ha podido identificar!!' })
        }
    });
}

//EXTRAER DATOS USUARIO por ID
function getUser(req, res) {
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
        if (err) return res.status(500).send({ message: 'Error en la petición' });
        if (!user) return res.status(404).send({ message: 'Usuario no existe' });
        //Comprobamos que nos sigue el usuario que nosotros seguimos

        followThisUser(req.user.sub, userId).then((value) => {

            user.password = undefined;
            return res.status(200).send({
                user,
                following: value.following,
                followed: value.followed
            });
        });




    });
}

async function followThisUser(identity_user_id, user_id) {
    var following = await Follow.findOne({ "user": identity_user_id, "followed": user_id }).exec().then((follow) => {
        return follow;
    }).catch((err) => {
        return handleError(err);
    });

    var followed = await Follow.findOne({ "user": user_id, "followed": identity_user_id }).exec().then((follow) => {
        console.log(follow);
        return follow;
    }).catch((err) => {
        return handleError(err);
    });


    return {
        following: following,
        followed: followed
    }
}

//LISTADO USUARIOS COMPLETO

function getUsers(req, res) {
    var identity_user_id = req.user.sub;

    var page = 1;
    if (req.params.page) {
        page = req.params.page
    }
    var itemsPerPage = 5;

    User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {

        if (err) return res.status(500).send({ message: 'Error en la petición' });

        if (!users) return res.status(404).send({ message: 'Usuarios no disponibles' });

        followUserIds(identity_user_id).then((value) => {

            return res.status(200).send({
                users,
                users_following: value.following,
                users_follow_me: value.followed,
                total,
                pages: Math.ceil(total / itemsPerPage)
            });
        });

    });
}

async function followUserIds(user_id) {

    var following = await Follow.find({ "user": user_id }).select({ '_id': 0, '__uv': 0, 'user': 0 }).exec().then((follows) => {

        var follows_clean = [];

        follows.forEach((follow) => {

            follows_clean.push(follow.followed);

        });

        console.log(follows_clean);

        return follows_clean;

    }).catch((err) => {

        return handleError(err);

    });


    var followed = await Follow.find({ "followed": user_id }).select({ '_id': 0, '__uv': 0, 'followed': 0 }).exec().then((follows) => {

        var follows_clean = [];

        follows.forEach((follow) => {

            follows_clean.push(follow.user);

        });

        return follows_clean;

    }).catch((err) => {

        return handleError(err);

    });


    console.log(following);

    return {

        following: following,

        followed: followed

    }

}

//Contador seguidores y seguidos

const getCounters = (req, res) => {
    let userId = req.user.sub;
    if(req.params.id){
        userId = req.params.id;      
    }
    getCountFollow(userId).then((value) => {
        return res.status(200).send(value);
    })
}
 
const getCountFollow = async (user_id) => {
    try{
        // Lo hice de dos formas. "following" con callback de countDocuments y "followed" con una promesa
        let following = await Follow.countDocuments({"user": user_id},(err, result) => { return result });
        let followed = await Follow.countDocuments({"followed": user_id}).then(count => count);
 
        return { following, followed }
        
    } catch(e){
        console.log(e);
    }
}

// async function getCountFollow(user_id){
//     var following = await Follow.count({"user":user_id}).exec((err, count) => {
//         if(err) return handleError(err);
//         return count;
//     })
//     var followed = await Follow.count({"followed":user_id}).exec((err, count) => {
//         if(err) return handleError(err);
//         return count;
//     })

//     return {
//         following: following,
//         followed: folllowed
//     }
// }

//ACTUALIZAR DATOS USUARIO

function updateUser(req, res) {
    var userId = req.params.id;
    var update = req.body;

    //quitamos la propiedad user ya que la comprobaremos aparte
    delete update.password;

    if (userId != req.user.sub) {
        return res.status(500).send({ message: 'No tienes permiso de actualización' });
    }
    //Con new:true devuelve el obejto actuzaliado si no devuelve el objeto original
    User.findByIdAndUpdate(userId, update, { new: true }, (err, userUpdated) => {
        if (err) return res.status(500).send({ message: 'Error en la petición' });

        if (!userUpdated) {
            if (!users) return res.status(404).send({ message: 'Error en la actualización de usuario' });
        }
        return res.status(200).send({ user: userUpdated });
    })
}

//Subir archivos de usuario 

function uploadImage(req, res) {
    var userId = req.params.id;
    // console.log(req)



    if (req.files) {
        var file_path = req.files.image.path;
        var file_split = file_path.split('\\');
        console.log(file_split);

        var file_name = file_split[2];
        console.log(file_name);

        var ext_split = file_name.split('\.');
        console.log(ext_split);
        var file_ext = ext_split[1];

        if (userId != req.user.sub) {
            fs.unlink(res, file_path, (err) => {
                if (err) return res.status(200).send({
                    message: 'Extensión no válida'
                })
            })
            return res.status(500).send({ message: 'No tienes permiso de actualización' });
        }

        if (file_ext == 'png' || file_ext == 'jpeg' || file_ext == 'jpg' || file_ext == 'gif') {

            User.findByIdAndUpdate(userId, { image: file_name }, { new: true }, (err, userUpdated) => {
                if (err) return res.status(500).send({ message: 'Error en la petición' });

                if (!userUpdated) {
                    if (!users) return res.status(404).send({ message: 'Error en la actualización de usuario' });
                }
                return res.status(200).send({ user: userUpdated });
            })

        } else {
            fs.unlink(res, file_path, (err) => {
                if (err) return res.status(200).send({
                    message: 'Extensión no válida'
                })
            })
        }

    } else {
        return res.status(200).send({ mesage: 'No se ha subido la imagen' });
    }
}
//Recoger la imagen del usuario
function getImageFile(req, res) {
    var image_file = req.params.imageFile;
    var path_file = './uploads/users/' + image_file;

    fs.exists(path_file, (exists) => {
        if (exists) {
            res.sendFile(path.resolve(path_file));
        } else {
            res.status(200).send({ message: 'No existe la imagen' });
        }
    })
}


module.exports = {
    home,
    pruebas,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    getCounters,
    updateUser,
    uploadImage,
    getImageFile
}
//