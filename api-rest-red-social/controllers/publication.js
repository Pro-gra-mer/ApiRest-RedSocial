// Importar modulos
const fs = require("fs");
const path = require("path");

// Importar modelos
const Publication = require("../models/publication");

// Importar servicios
const followService = require("../services/followService");

// Acciones de prueba
const pruebaPublication = (req, res) => {
  return res.status(200).send({
    message: "Mensaje enviado desde: controllers/publication.js",
  });
};

const save = async (req, res) => {
  try {
    // Obtener los datos del cuerpo de la solicitud
    const params = req.body;

    // Verificar si se proporcionaron los datos necesarios
    if (!params.text) {
      return res.status(400).send({
        status: "error",
        message: "Debes enviar el texto de la publicación.",
      });
    }

    // Crear y llenar el objeto del modelo Publication
    let newPublication = new Publication(params);
    newPublication.user = req.user.id;

    // Guardar el objeto en la base de datos
    const publicationStored = await newPublication.save();

    // Devolver la respuesta
    return res.status(200).send({
      status: "success",
      message: "Publicación guardada",
      publicationStored,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error al guardar la publicación:", error);
    return res.status(500).send({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const detail = async (req, res) => {
  try {
    // Sacar id de publicacion de la url
    const publicationId = req.params.id;

    // Buscar la publicacion por su id
    const publicationStored = await Publication.findById(publicationId);

    // Verificar si la publicacion existe
    if (!publicationStored) {
      return res.status(404).send({
        status: "error",
        message: "No existe la publicacion",
      });
    }

    // Devolver respuesta con la publicacion encontrada
    return res.status(200).send({
      status: "success",
      message: "Mostrar publicacion",
      publication: publicationStored,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en detail:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const remove = async (req, res) => {
  try {
    // Sacar el id del publicacion a eliminar
    const publicationId = req.params.id;

    // Buscar y eliminar la publicacion
    const deletedPublication = await Publication.findOneAndDelete({
      user: req.user.id,
      _id: publicationId,
    });

    // Verificar si la publicacion fue eliminada correctamente
    if (!deletedPublication) {
      return res.status(500).send({
        status: "error",
        message: "No se ha eliminado la publicacion",
      });
    }

    // Devolver respuesta con el id de la publicacion eliminada
    return res.status(200).send({
      status: "success",
      message: "Publicacion eliminada",
      publication: publicationId,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en remove:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const user = async (req, res) => {
  try {
    // Sacar el id de usuario
    const userId = req.params.id;

    // Controlar la pagina
    let page = 1;

    if (req.params.page) page = parseInt(req.params.page);

    const itemsPerPage = 5;

    // Buscar publicaciones del usuario
    const publications = await Publication.find({ user: userId })
      .sort("-created_at")
      .populate("user", "-password -__v -role -email")
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);

    // Contar total de publicaciones del usuario
    const totalPublications = await Publication.countDocuments({
      user: userId,
    });

    // Verificar si hay publicaciones
    if (!publications || publications.length <= 0) {
      return res.status(404).send({
        status: "error",
        message: "No hay publicaciones para mostrar",
      });
    }

    // Devolver respuesta con las publicaciones del usuario
    return res.status(200).send({
      status: "success",
      message: "Publicaciones del perfil de un usuario",
      page,
      total: totalPublications,
      pages: Math.ceil(totalPublications / itemsPerPage),
      publications,
    });
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en user:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const upload = async (req, res) => {
  try {
    // Sacar publication id
    const publicationId = req.params.id;

    // Recoger el fichero de imagen y comprobar que existe
    if (!req.file) {
      return res.status(404).send({
        status: "error",
        message: "Petición no incluye la imagen",
      });
    }

    // Conseguir el nombre del archivo
    let image = req.file.originalname;

    // Sacar la extension del archivo
    const imageSplit = image.split(".");
    const extension = imageSplit[1];

    // Comprobar extension
    if (
      extension != "png" &&
      extension != "jpg" &&
      extension != "jpeg" &&
      extension != "gif"
    ) {
      // Borrar archivo subido
      const filePath = req.file.path;
      const fileDeleted = fs.unlinkSync(filePath);

      // Devolver respuesta negativa
      return res.status(400).send({
        status: "error",
        message: "Extensión del fichero invalida",
      });
    }

    // Si es correcta, guardar imagen en bbdd
    const publicationUpdated = await Publication.findOneAndUpdate(
      { user: req.user.id, _id: publicationId },
      { file: req.file.filename },
      { new: true }
    );

    if (!publicationUpdated) {
      return res.status(500).send({
        status: "error",
        message: "Error en la subida del avatar",
      });
    }

    // Devolver respuesta
    return res.status(200).send({
      status: "success",
      publication: publicationUpdated,
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

const media = async (req, res) => {
  try {
    // Sacar el parametro de la url
    const file = req.params.file;

    // Montar el path real de la imagen
    const filePath = "./uploads/publications/" + file;

    // Comprobar que existe
    const exists = await fs.promises.stat(filePath);

    if (!exists) {
      return res.status(404).send({
        status: "error",
        message: "No existe la imagen",
      });
    }

    // Devolver un file
    return res.sendFile(path.resolve(filePath));
  } catch (error) {
    // Manejar errores internos del servidor
    console.error("Error en media:", error);
    return res.status(500).send({
      status: "error",
      message: "Error interno del servidor",
    });
  }
};

const feed = async (req, res) => {
  // Sacar la pagina actual
  let page = 1;

  if (req.params.page) {
    page = req.params.page;
  }

  // Establecer numero de elementos por pagina
  let itemsPerPage = 5;

  // Sacar un array de identificadores de usuarios que yo sigo como usuario logueado
  try {
    const myFollows = await followService.followUserIds(req.user.id);

    // Find a publicaciones in, ordenar, popular, paginar
    const publications = await Publication.find({
      user: { $in: myFollows.following },
    })
      .populate("user", "-password -role -__v -email")
      .sort("-created_at")
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage);
      /* Para calcular qué documentos debemos omitir al realizar la paginación, necesitamos ajustar 
        el número de página (que comienza desde 1) para que coincida con los índices de un array 
        (que comienzan desde 0). Aquí es donde entra en juego la resta de 1. Una vez que hemos ajustado 
        el número de página para que coincida con los índices del array, simplemente multiplicamos este
        número ajustado por el número de elementos por página. Esto nos da el número total de documentos
        que deben ser omitidos antes de comenzar a mostrar los documentos de la página actual. */



    // Establecemos el criterio de búsqueda: queremos contar los documentos 
    // donde el campo "user" coincida con uno de los valores en el array "myFollows.following".
    const total = await Publication.countDocuments({
      user: { $in: myFollows.following },
    });

    if (!publications || publications.length === 0) {
      return res.status(500).send({
        status: "error",
        message: "No hay publicaciones para mostrar",
      });
    }

    return res.status(200).send({
      status: "success",
      message: "Feed de publicaciones",
      following: myFollows.following,
      total,
      page,
      pages: Math.ceil(total / itemsPerPage),
      publications,
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "Error al obtener usuarios que sigues",
    });
  }
};

// Exportar acciones
module.exports = {
  pruebaPublication,
  save,
  detail,
  remove,
  user,
  upload,
  media,
  feed,
};
