const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const User = require("../models/user");
const Follow = require("../models/follow");
const Publication = require("../models/publication");

const jwt = require("../services/jwt");
const followService = require("../services/followService");
const validate = require("../helpers/validate");


const pruebaUser = async (req, res) => {
  try {
    return res.status(200).json({
      message: "Mensaje enviado desde: controllers/user.js",
      usuario: req.user,
    });
  } catch (error) {
    console.error("Error en pruebaUser:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const register = async (req, res) => {
  try {
    // Recoger los parámetros del cuerpo de la petición
    let params = req.body;

    // Comprobar si faltan datos por enviar
    if (!params.name || !params.email || !params.password || !params.nick) {
      return res.status(400).json({
        status: "error",
        message: "Faltan datos por enviar",
      });
    }

    // Validación avanzada
    validate(params);

    // Comprobar si ya existe un usuario con el mismo email o nick
    const users = await User.find({
      $or: [
        { email: params.email.toLowerCase() },
        { nick: params.nick.toLowerCase() },
      ],
    });

    // Si ya existe un usuario con ese email o nick, devolver un mensaje de éxito
    if (users && users.length >= 1) {
      return res.status(200).send({
        status: "success",
        message: "El usuario ya existe",
      });
    }

    // Cifrar la contraseña antes de guardarla en la base de datos
    let pwd = await bcrypt.hash(params.password, 10);
    params.password = pwd;

    // Crear un nuevo objeto de usuario con los parámetros recibidos
    let user_to_save = new User(params);

    // Guardar el nuevo usuario en la base de datos
    const userStored = await user_to_save.save();

    // Eliminar campos sensibles antes de devolver la respuesta
    userStored.toObject();
    delete userStored.password;
    delete userStored.role;

    // Devolver una respuesta de éxito con el usuario registrado
    return res.status(200).json({
      status: "success",
      message: "Usuario registrado correctamente",
      user: userStored,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en register:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const login = async (req, res) => {
  try {
    // Recoger los parámetros del cuerpo de la petición
    let params = req.body;

    // Comprobar si faltan datos por enviar
    if (!params.email || !params.password) {
      return res.status(400).send({
        status: "error",
        message: "Faltan datos por enviar",
      });
    }

    // Buscar en la base de datos si existe un usuario con el email proporcionado
    const user = await User.findOne({ email: params.email });

    // Si no se encuentra ningún usuario con ese email, devolver un mensaje de error
    if (!user) {
      return res
        .status(404)
        .send({ status: "error", message: "No existe el usuario" });
    }

    // Comprobar si la contraseña proporcionada coincide con la almacenada en la base de datos
    const pwd = bcrypt.compareSync(params.password, user.password);

    // Si la contraseña no coincide, devolver un mensaje de error
    if (!pwd) {
      return res.status(400).send({
        status: "error",
        message: "No te has identificado correctamente",
      });
    }

    // Generar un token de autenticación para el usuario
    const token = jwt.createToken(user);

    // Devolver una respuesta de éxito con el usuario autenticado y el token
    return res.status(200).send({
      status: "success",
      message: "Te has identificado correctamente",
      user: {
        id: user._id,
        name: user.name,
        nick: user.nick,
      },
      token,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en login:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const profile = async (req, res) => {
  try {
    // Obtener el ID del usuario desde los parámetros de la URL
    const id = req.params.id;

    // Buscar el perfil del usuario en la base de datos y excluir la contraseña y el rol
    const userProfile = await User.findById(id).select({
      password: 0,
      role: 0,
    });

    // Si no se encuentra el perfil del usuario, devolver un mensaje de error
    if (!userProfile) {
      return res.status(404).send({
        status: "error",
        message: "El usuario no existe o hay un error",
      });
    }

    // Obtener información sobre si el usuario está siguiendo al usuario del perfil y viceversa
    const followInfo = await followService.followThisUser(req.user.id, id);

    // Devolver el perfil del usuario y la información sobre el seguimiento en una respuesta de éxito
    return res.status(200).send({
      status: "success",
      user: userProfile,
      following: followInfo.following,
      follower: followInfo.follower,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en profile:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const list = async (req, res) => {
  try {
    // Obtener el número de página de los parámetros de la URL o establecerlo en 1 por defecto
    let page = req.params.page || 1;
    page = parseInt(page);

    // Establecer la cantidad de elementos por página
    let itemsPerPage = 5;

    // Buscar usuarios en la base de datos, excluyendo la contraseña, el correo electrónico, el rol y los metadatos internos, y paginar los resultados
    const users = await User.find()
      .select("-password -email -role -__v")
      .sort("_id")
      .paginate(page, itemsPerPage);

    // Si no se encuentran usuarios, devolver un mensaje de error
    if (!users) {
      return res.status(404).send({
        status: "error",
        message: "No hay usuarios disponibles",
      });
    }

    // Obtener los IDs de los usuarios que sigue el usuario actual y los que lo siguen
    let followUserIds = await followService.followUserIds(req.user.id);

    // Devolver la lista de usuarios junto con detalles de paginación y seguimiento en una respuesta de éxito
    return res.status(200).send({
      status: "success",
      users,
      page,
      itemsPerPage,
      total: users.totalDocs,
      pages: Math.ceil(users.totalDocs / itemsPerPage),
      user_following: followUserIds.following,
      user_follow_me: followUserIds.followers,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en list:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const update = async (req, res) => {
  try {
    // Obtener la identidad del usuario y los datos actualizados del cuerpo de la solicitud
    let userIdentity = req.user;
    let userToUpdate = req.body;

    // Eliminar campos innecesarios del objeto de actualización
    delete userToUpdate.iat;
    delete userToUpdate.exp;
    delete userToUpdate.role;
    delete userToUpdate.image;

    // Verificar si ya existe un usuario con el mismo correo electrónico o apodo
    const users = await User.find({
      $or: [
        { email: userToUpdate.email.toLowerCase() },
        { nick: userToUpdate.nick.toLowerCase() },
      ],
    });

    let userIsset = false;
    users.forEach((user) => {
      if (user && user._id != userIdentity.id) userIsset = true;
    });

    // Si ya existe un usuario con esos datos, devolver un mensaje de éxito
    if (userIsset) {
      return res.status(200).send({
        status: "success",
        message: "El usuario ya existe",
      });
    }

    // Si se proporcionó una nueva contraseña, cifrarla antes de actualizarla
    if (userToUpdate.password) {
      let pwd = await bcrypt.hash(userToUpdate.password, 10);
      userToUpdate.password = pwd;
    } else {
      delete userToUpdate.password;
    }

    // Actualizar el usuario en la base de datos y obtener el usuario actualizado
    let userUpdated = await User.findByIdAndUpdate(
      { _id: userIdentity.id },
      userToUpdate,
      { new: true }
    );

    // Si no se pudo actualizar el usuario, devolver un mensaje de error
    if (!userUpdated) {
      return res
        .status(400)
        .json({ status: "error", message: "Error al actualizar" });
    }

    // Devolver un mensaje de éxito junto con el usuario actualizado
    return res.status(200).send({
      status: "success",
      message: "Metodo de actualizar usuario",
      user: userUpdated,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en update:", error);
    return res.status(500).send({
      status: "error",
      message: "Error al actualizar",
    });
  }
};

const upload = async (req, res) => {
  try {
    // Verificar si se incluyó un archivo en la solicitud
    if (!req.file) {
      return res.status(404).send({
        status: "error",
        message: "Petición no incluye la imagen",
      });
    }

    // Obtener el nombre y la extensión del archivo
    let image = req.file.originalname;
    const extension = image.split(".")[1];

    // Verificar si la extensión del archivo es válida
    if (
      extension != "png" &&
      extension != "jpg" &&
      extension != "jpeg" &&
      extension != "gif"
    ) {
      // Eliminar el archivo subido si la extensión no es válida
      const filePath = req.file.path;
      fs.unlinkSync(filePath);

      // Devolver un mensaje de error si la extensión del archivo no es válida
      return res.status(400).send({
        status: "error",
        message: "Extensión del fichero invalida",
      });
    }

    // Actualizar el usuario con la nueva imagen
    const userUpdated = await User.findOneAndUpdate(
      { _id: req.user.id },
      { image: req.file.filename },
      { new: true }
    );

    // Si no se pudo actualizar el usuario, devolver un mensaje de error
    if (!userUpdated) {
      return res.status(500).send({
        status: "error",
        message: "Error en la subida del avatar",
      });
    }

    // Devolver un mensaje de éxito junto con el usuario actualizado y la información del archivo
    return res.status(200).send({
      status: "success",
      user: userUpdated,
      file: req.file,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en upload:", error);
    return res.status(500).send({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const avatar = async (req, res) => {
  try {
    // Obtener el nombre del archivo de la URL
    const file = req.params.file;
    // Construir la ruta del archivo de imagen
    const filePath = "./uploads/avatars/" + file;

    // Verificar si el archivo existe
    fs.stat(filePath, (error, exists) => {
      if (!exists) {
        // Devolver un mensaje de error si el archivo no existe
        return res.status(404).send({
          status: "error",
          message: "No existe la imagen",
        });
      }

      // Si el archivo existe, enviar el archivo como respuesta
      return res.sendFile(path.resolve(filePath));
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en avatar:", error);
    return res.status(500).send({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const counters = async (req, res) => {
  try {
    let userId = req.user.id;

    if (req.params.id) {
      userId = req.params.id;
    }

    // Contar el número de usuarios seguidos por el usuario actual
    const following = await Follow.countDocuments({ user: userId });

    // Contar el número de usuarios que siguen al usuario actual
    const followed = await Follow.countDocuments({ followed: userId });

    // Contar el número de publicaciones realizadas por el usuario actual
    const publications = await Publication.countDocuments({ user: userId });

    // Devolver los contadores
    return res.status(200).send({
      userId,
      following: following,
      followed: followed,
      publications: publications,
    });
  } catch (error) {
    console.error("Error en counters:", error);
    return res.status(500).send({
      status: "error",
      message: "Error en los contadores",
      error,
    });
  }
};

module.exports = {
  pruebaUser,
  register,
  login,
  profile,
  list,
  update,
  upload,
  avatar,
  counters,
};
