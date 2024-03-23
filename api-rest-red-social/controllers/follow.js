const Follow = require("../models/follow");
const User = require("../models/user");
const followService = require("../services/followService");
const mongoosePaginate = require("mongoose-pagination");

const pruebaFollow = async (req, res) => {
  try {
    // Ejemplo de acción de prueba
    return res.status(200).json({
      message: "Mensaje enviado desde: controllers/follow.js",
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en pruebaFollow:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const save = async (req, res) => {
  try {
    const { followed } = req.body;
    const { id: userId } = req.user;

    // Crear un nuevo objeto de Follow
    const userToFollow = new Follow({
      user: userId,
      followed,
    });

    // Guardar el objeto Follow en la base de datos
    const followSaved = await userToFollow.save();

    return res.status(200).json({
      status: "success",
      identity: req.user,
      follow: followSaved,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error al guardar follow:", error);
    return res.status(500).json({
      status: "error",
      message: "No se ha podido seguir al usuario",
    });
  }
};

const unfollow = async (req, res) => {
  try {
    // Recoger usuario dentificado
    const userId = req.user.id;
    // Recoger el ide del usuario que quiero dejar de seguir
    const followedId = req.params.id;

    // Buscar y eliminar el follow correspondiente
    const followDeleted = await Follow.findOneAndDelete({
      user: userId,
      followed: followedId,
    });

    if (!followDeleted) {
      return res.status(500).json({
        status: "error",
        message: "No has dejado de seguir a nadie",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Follow eliminado correctamente",
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error al dejar de seguir:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

// Acción listado de usuarios que cualquier usuario está siguiendo (siguiendo)
const following = async (req, res) => {
  try {
    // Sacar el id del usuario identificado
    let userId = req.user.id;

    // Comprobar si me llega el id por parámetro en la URL
    if (req.params.id) userId = req.params.id;

    // Comprobar si me llega la página, si no la página 1
    let page = 1;
    if (req.params.page) page = req.params.page;

    // Usuarios por página quiero mostrar
    const itemsPerPage = 5;

    // Buscar los follows del usuario con el id especificado
    const follows = await Follow.find({ user: userId })
      .populate("user followed", "-password -role -__v -email")
      .skip((page - 1) * itemsPerPage) // Saltar documentos según la página actual
      .limit(itemsPerPage); // Limitar el número de documentos por página

    // Contar el total de follows del usuario con el id especificado
    const totalFollows = await Follow.countDocuments({ user: userId });

    // Listado de usuarios que sigue el usuario identificado
    let followUserIds = await followService.followUserIds(req.user.id);

    return res.status(200).send({
      status: "success",
      message: "Listado de usuarios que estoy siguiendo",
      follows,
      total: totalFollows,
      pages: Math.ceil(totalFollows / itemsPerPage),
      user_following: followUserIds.following,
      user_follow_me: followUserIds.followers,
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "Error al obtener el listado de usuarios que estás siguiendo",
      error: error.message, // Devolver el mensaje de error para fines de depuración
    });
  }
};

const followers = async (req, res) => {
  try {
    // Sacar el id del usuario identificado
    let userId = req.user.id;

    // Comprobar si me llega el id por parámetro en la URL
    if (req.params.id) userId = req.params.id;

    // Comprobar si me llega la página, si no, la página es 1
    let page = 1;
    if (req.params.page) page = req.params.page;

    // Usuarios por página que quiero mostrar
    const itemsPerPage = 5;

    // Utilizar async/await para realizar la consulta a la base de datos
    const follows = await Follow.find({ followed: userId })
      .populate("user", "-password -role -__v -email")
      .paginate(page, itemsPerPage)
      .exec();

    // Obtener los IDs de los usuarios que sigue y los que lo siguen
    const followUserIds = await followService.followUserIds(req.user.id);

    // Enviar la respuesta con los datos obtenidos
    return res.status(200).send({
      status: "success",
      message: "Listado de usuarios que me siguen",
      follows,
      total: follows.totalDocs,
      pages: Math.ceil(follows.totalDocs / itemsPerPage),
      user_following: followUserIds.following,
      user_follow_me: followUserIds.followers,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error al obtener seguidores:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

module.exports = {
  pruebaFollow,
  save,
  unfollow,
  following,
  followers,
};
